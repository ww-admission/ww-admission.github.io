# Infra & sécurité — historique des changements et bonnes pratiques

Ce document résume tout ce qui a été mis en place sur la dockerisation, la sécurité et le
CI/CD du repo (frontend Astro + backend Laravel), avec le **pourquoi** de chaque décision.
Objectif : qu'un autre dev puisse reprendre ce travail sans avoir à relire tout l'historique
git commit par commit.

Périmètre couvert : commits `fba9f6e` → `cdfe190` sur `develop`.

---

## 1. Vue d'ensemble de la stack

- **Frontend** : Astro 5 en mode SSR (`output: 'server'`), adapter `@astrojs/node` en mode
  `standalone`. Servi par `node ./dist/server/entry.mjs`.
- **Backend** : Laravel 13 + Octane + FrankenPHP (pas PHP-FPM/Nginx classique).
- **Pattern d'auth** : BFF (Backend-For-Frontend). Le frontend ne parle jamais directement à
  Laravel depuis le navigateur — il passe par ses propres routes API Astro
  (`src/pages/api/...`) qui posent un cookie de session **HttpOnly** signé (HMAC), et
  relaient les appels vers Laravel avec `Authorization: Bearer <token>` côté serveur. Voir
  `src/lib/auth.ts` et `src/lib/bff.ts`.
- **Registre d'images** : Harbor privé, accessible uniquement via un tunnel Tailscale
  (`100.98.227.73`), jamais exposé sur l'internet public.
- **CI/CD** : GitHub Actions, runner **self-hosted** (`ndewo`), pas de runner GitHub hébergé.

---

## 2. Dockerisation backend (`api/Dockerfile.laravel`)

Image multi-stage sur `dunglas/frankenphp` :

1. **`base`** : FrankenPHP + extensions PHP requises (`pcntl`, `pdo_sqlite`, `opcache`, `zip`)
   + `apt-get update && apt-get upgrade -y` (patch des CVE OS entre deux releases de l'image
   de base — voir §4.4).
2. **`vendor`** : `composer install` (deux passes : sans le code applicatif pour profiter du
   cache Docker, puis avec).
3. **`assets`** : build Vite/Tailwind sur `node:22-alpine`, séparé du runtime PHP.
4. **`runtime`** : image finale, `CMD php artisan octane:start --server=frankenphp ...`.

### Bugs réels rencontrés (pas des suppositions — chacun reproduit puis corrigé) :

- **`pcntl` manquant** → crash `Undefined constant SIGINT` au démarrage d'Octane. Fix :
  ajouté à `install-php-extensions`.
- **Calcul de `admin-port` d'Octane/FrankenPHP** : la formule interne est
  `2019 + (port - 8000)`. Avec `--port=80`, ça part en négatif et plante. Fix : forcer
  `--admin-port=2019` explicitement dans la `CMD`.
- **`package:discover` plantait au build** : `routes/channels.php` résout le broadcaster par
  défaut (Reverb) dès le boot, donc `composer install` a besoin de `REVERB_APP_KEY/SECRET/ID`
  même si ce sont des notifications fictives. Fix : `ENV` placeholders **dans le stage
  `vendor` uniquement** — ils ne survivent pas dans `runtime` car `ENV` ne traverse pas les
  stages Docker (seul `COPY --from=...` le fait), donc aucun risque de fuite en prod.
- **`ENTRYPOINT` vs `CMD`** : la même image est réutilisée pour les services `queue` et
  `reverb` du `docker-compose.yml`, chacun avec une commande différente. Avec `ENTRYPOINT`,
  `docker-compose`'s `command:` **s'ajoute** à l'entrypoint au lieu de le remplacer — confirmé
  en testant en réel (erreur Symfony Console explicite). Fix : `CMD` partout, jamais
  `ENTRYPOINT`, dès qu'une image est réutilisée avec plusieurs commandes différentes.

### Bug de prod résolu (pas un bug du Dockerfile) : migrations "Nothing to migrate"

**Ce n'était PAS un problème de fichiers manquants.** Trois hypothèses ont été vérifiées et
infirmées avant de trouver la vraie cause (`.dockerignore`, COPY sélectif dans le Dockerfile,
mauvais contexte de build) — toutes les 19 migrations étaient bien dans l'image, à chaque
fois confirmé par inspection directe du container (`docker exec ... ls database/migrations`).

La vraie cause : le fichier SQLite de prod contenait déjà des tables (`cache`, `jobs`, etc.)
créées par un run antérieur, mais la table de suivi `migrations` ne les avait pas
enregistrées — désync entre schéma réel et bookkeeping Laravel. `migrate --force` plantait
sur "table already exists" dès qu'il tentait de recréer une table déjà présente.

**Résolu via `migrate:fresh --force`** — mais c'est une opération **destructive** (drop +
recreate toutes les tables). À utiliser uniquement après confirmation qu'aucune donnée réelle
n'était en jeu. **Ne jamais lancer `migrate:fresh` en prod sans backup vérifié au préalable.**

---

## 3. Dockerisation frontend (`Dockerfile.astro`)

Deux stages :
1. **`builder`** : `npm ci` complet (avec devDependencies) + `npm run build`.
2. **`runtime`** : `npm ci --omit=dev` (réinstalle ses propres deps prod uniquement, ne copie
   pas `node_modules` depuis `builder`) + `COPY --from=builder /app/dist ./dist`.

Healthcheck : `wget --spider http://127.0.0.1:4321/health` — **`127.0.0.1`, pas
`localhost`**. Sur Alpine, `/etc/hosts` résout `localhost` en IPv6 (`::1`) en priorité, mais
le serveur Node ne bind que le wildcard IPv4 → le healthcheck échouait silencieusement avec
`localhost`.

### Bug critique corrigé : `import.meta.env` vs `process.env` pour les secrets serveur

**C'est le bug le plus important de toute cette session, à bien comprendre.**

Vite (utilisé par Astro) **inline statiquement** `import.meta.env.X` au moment du `build` pour
les variables non-`PUBLIC_`. Si la variable n'était pas présente dans l'environnement du
build CI (qui ne reçoit que les vars nécessaires au build, pas les secrets de prod), Vite a
figé en dur le fallback (`?? 'http://localhost:8000'` par exemple) **dans le code compilé**.

Conséquence : configurer `BACKEND_URL` ou `JWT_SECRET` correctement dans l'environnement du
conteneur en production n'avait **aucun effet** — le code compilé ne contenait plus aucune
référence dynamique à ces variables. Vérifié en grep-ant directement `dist/server/*.mjs` :
`const base = "http://localhost:8000";` en dur, zéro occurrence de `BACKEND_URL` dans le
bundle.

**Fix : utiliser `process.env.X` (jamais `import.meta.env.X`) pour toute variable serveur
qui doit pouvoir changer entre le build et le déploiement** (URL de service interne, secrets,
etc.). `process.env` est résolu au runtime Node, jamais inliné par Vite. Validé en rebuildant
sans la variable dans l'environnement et en confirmant que `process.env.X ?? fallback` reste
une expression dynamique dans le bundle compilé.

Fichiers concernés : `src/lib/auth.ts`, `src/lib/bff.ts`, `src/pages/api/auth/login.ts`,
`src/pages/api/auth/register.ts`, `src/pages/api/broadcasting/auth.ts`, `src/pages/api/contact.ts`.

> **Règle à retenir pour tout futur code Astro SSR** : `import.meta.env.X` ne convient que
> pour des constantes vraiment fixes au build (ex: `PUBLIC_*`, valeurs identiques en dev et
> prod). Dès qu'une variable a une valeur différente entre l'environnement de build CI et
> l'environnement de déploiement, il faut `process.env.X`.

### Autre bug corrigé au passage

Les `catch {}` vides autour des appels `fetch()` vers Laravel ne loggaient jamais l'erreur
réelle — un 503 générique masquait systématiquement la vraie cause. Tous les `catch` de ces
fichiers loggent maintenant l'erreur via `console.error(...)` avant de retourner la réponse
d'erreur au client.

---

## 4. Sécurité applicative

### 4.1 Méthodologie de triage Trivy

Ne jamais patcher une CVE à l'aveugle. Pour chaque finding HIGH/CRITICAL :
1. Quelle version est installée, et **qui en dépend** (`npm ls <pkg>` / chaîne de dépendance).
2. Le fix existe-t-il dans la même *major* version, ou faut-il un bump cassant ?
3. Le code vulnérable est-il **réellement exécuté** en prod, ou juste présent dans
   `node_modules` sans jamais être chargé ? Vérifié en grep-ant directement le bundle compilé
   (`dist/server/`) — si le nom du package n'apparaît nulle part dans le code compilé, il
   n'est jamais exécuté au runtime (cas de `fast-uri`, `picomatch`, `svgo`, `astro` : tous des
   outils de build/typecheck, jamais bundlés dans le serveur SSR réel).

### 4.2 Overrides npm (`package.json` → `overrides`)

Utilisés quand `npm update` seul ne peut pas atteindre un patch parce qu'une sous-dépendance
épingle une version trop stricte (pin exact ou range `~`) :

| Package | Avant | Après | Pourquoi `npm update` ne suffisait pas |
|---|---|---|---|
| `path-to-regexp` | — | `^6.3.0` | (déjà en place avant cette session) |
| `lodash` | `4.17.21` | `^4.18.1` | `yaml-language-server` épingle `4.17.21` en exact |
| `ws` | `8.20.1` | `^8.21.0` | `engine.io-client` épingle `~8.20.1` (tilde = patch only) |
| `tar` | `6.2.1` | `^7.5.16` | fix uniquement en 7.x — **seul override impliquant un bump de major**, décidé au cas par cas car `@iconify/tools` (dev-tooling icônes) n'a pas d'API cassante affectée |
| `fast-uri` | `3.1.0` | `^3.1.2` | une seule résolution dans l'arbre, simple |
| `svgo` (imbriqué) | `3.3.2` sous `astro-icon` | `^3.3.3` sous `astro-icon` uniquement | **attention** : `svgo` a deux résolutions en parallèle (`3.3.2` via `astro-icon`, `4.0.1` via `astro` directement, déjà clean). Un override plat aurait **downgradé** la copie d'`astro` de `4.x` vers `3.x` — utilisé un override imbriqué (`{"astro-icon": {"svgo": "^3.3.3"}}`) pour ne cibler que la copie vulnérable |

> **Règle avant tout override** : faire `npm ls <pkg>` d'abord. S'il y a **plusieurs
> résolutions avec des majors différentes dans l'arbre**, un override plat va toutes les
> forcer à la même version — vérifier qu'aucun consommateur légitime n'a besoin de l'autre
> major avant d'écrire l'override (cas `picomatch`, volontairement laissé en l'état : 2.x pour
> `tailwindcss`/`chokidar`, 4.x pour `astro`/`vite` — un override plat casserait l'un des deux).

### 4.3 `.trivyignore`

CVE acceptées et documentées plutôt que patchées dans l'immédiat, **toutes confirmées hors du
chemin d'exécution réel** (grep sur `dist/server/`) :

- **`astro` (CVE-2026-50146, CVE-2026-54299)** : le fix nécessite la migration Astro 5 → 6
  (breaking change), traitée séparément après validation de compatibilité.
- **`picomatch` (CVE-2026-33671)** : conflit de major volontairement non résolu (voir §4.2),
  glob-matching pur, jamais exposé réseau.
- **`esbuild` / gobinary (15 CVE Go stdlib)** : esbuild est bundlé par Astro comme outil de
  build, le fix est lié à la version d'esbuild qu'Astro embarque — pas patchable
  indépendamment sans toucher à Astro lui-même.

Le gate CI (`--ignorefile`) ne s'applique qu'au job de scan bloquant sur tag de prod (voir
§5.3) — pas au rapport informatif, qui doit toujours tout montrer.

### 4.4 OS packages (Dockerfile backend)

`RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*` ajouté juste après
le `FROM` de base, avant toute autre installation — patch les CVE du système Debian sous-jacent
publiées entre deux releases de l'image `dunglas/frankenphp` (ex: `linux-libc-dev`). Le
`rm -rf /var/lib/apt/lists/*` évite de gonfler l'image avec le cache `apt`.

---

## 5. CI/CD (`.github/workflows/ci.yml`)

Runner self-hosted (`ndewo`), pas de runner GitHub hébergé.

### 5.1 Deux flux distincts

- **Flux dev** : déclenché sur `push` vers `develop`. Build → test → scan (informatif
  uniquement) → push vers Harbor `wwa_dev` avec deux tags : `dev` (mutable, suivi par Komodo
  en "Poll for Updates") et `dev-sha-<court-sha>` (immuable, pour épingler une version
  précise).
- **Flux prod** : déclenché sur tag git `v*.*.*`. Build → test → scan (**bloquant** sur
  CRITICAL/HIGH fixable) → gate manuel obligatoire (`environment: production` sur GitHub,
  reviewer doit approuver) → push vers Harbor `www_prod` avec un seul tag : la version sans le
  `v` (ex: `1.2.0`), jamais de tag `latest` en prod.

### 5.2 Jobs et secrets

Secrets **dev** (`HARBOR_USER_DEV`/`HARBOR_PASSWORD_DEV`) et **prod**
(`HARBOR_USER_PROD`/`HARBOR_PASSWORD_PROD`) ne se mélangent jamais entre jobs. Le nom du
projet Harbor prod (`www_prod`) est **codé en dur** dans les jobs prod, jamais réutilisé
depuis `env.HARBOR_PROJECT` (qui vaut `wwa_dev`, scope dev uniquement).

> **Piège déjà rencontré** : ne jamais interpoler un secret directement dans un `run:` via
> `${{ secrets.X }}` si sa valeur peut contenir un caractère `$` (ex: un username Harbor du
> type `robot$wwa_dev+...`) — bash réinterprète le `$` comme début de variable et tronque la
> valeur. Toujours passer les secrets par un bloc `env:` au niveau du step, puis les
> référencer via `$HARBOR_USER` dans le script.

### 5.3 Scan Trivy en deux étapes (jobs `scan-frontend` / `scan-api`)

1. **Rapport informatif** (toujours exécuté, jamais bloquant) :
   `--ignore-unfixed --severity CRITICAL,HIGH,MEDIUM,LOW --exit-code 0`
2. **Gate bloquant** (uniquement sur tag `v*.*.*`, via `if: startsWith(github.ref, 'refs/tags/v')`) :
   `--ignore-unfixed --severity CRITICAL,HIGH --exit-code 1 --ignorefile /root/.trivyignore`
   (le `.trivyignore` du repo est monté dans le conteneur Trivy via `-v`).

`continue-on-error: true` a été **retiré** du job — sinon même l'étape bloquante ne ferait pas
réellement échouer le job, et `push-frontend`/`push-api`/`prod-push-*` continueraient malgré
des CVE critiques.

### 5.4 Validation systématique avant tout commit sur `ci.yml`

`actionlint` (via Docker, `rhysd/actionlint`) à chaque modification — a déjà détecté deux
classes de bugs réels avant qu'ils n'atteignent la prod : des `needs:` incomplets (job
référençant `needs.X.outputs` sans lister `X` dans son propre `needs:`), et un avertissement
shellcheck (`$(pwd)` non quoté, SC2046).

---

## 6. Bonnes pratiques à tenir pour la suite

1. **Ne jamais déclarer "ça marche" sans preuve concrète.** Build réel + grep du bundle
   compilé pour tout ce qui touche à `import.meta.env`/secrets. `actionlint` pour tout
   `ci.yml`. `npm audit` + `npm ls <pkg>` avant tout override de dépendance. Conteneur lancé
   + `curl`/`wget` réel pour tout `Dockerfile`.
2. **Secret serveur Astro → toujours `process.env`, jamais `import.meta.env`.** Voir §3.
3. **Avant un override npm, vérifier `npm ls <pkg>` pour détecter une double-major dans
   l'arbre** — un override plat peut downgrader/casser un autre consommateur (cas `svgo`).
4. **Jamais de secret réel commité.** Seuls `.env.example` / `.env.production.example` sont
   versionnés. Vérifier `.gitignore` avant tout commit dans un dossier touchant aux configs.
5. **Toujours montrer le diff complet avant de committer** quand le changement touche à
   l'infra/CI/sécurité — ces changements ont un blast radius large et sont difficiles à
   réverser une fois en prod.
6. **Ne jamais push sans instruction explicite.** Tous les commits de cette session ont été
   créés en local puis review manuellement avant push.
7. **`migrate:fresh` est destructif** — jamais en prod sans backup vérifié au préalable (voir
   §2). Préférer diagnostiquer la désync schema/migrations avant de choisir cette commande.
8. **CMD, pas ENTRYPOINT, pour toute image Docker réutilisée avec plusieurs commandes**
   différentes (cas `api` réutilisée pour `queue`/`reverb` dans `docker-compose.yml`).
9. **Convention de tag Harbor** : `dev` + `dev-sha-<court-sha>` pour le flux dev,
   `<version-sans-v>` uniquement pour prod (jamais `latest` en prod).

---

## 7. Dette technique connue / points non traités

- **Astro 5 → 6** : migration différée volontairement, deux CVE (`CVE-2026-50146`,
  `CVE-2026-54299`) acceptées dans `.trivyignore` en attendant.
- **`picomatch`** : conflit de major (2.x / 4.x) volontairement non résolu, voir §4.2.
- **SMTP / emails transactionnels non configurés côté Laravel** : `MAIL_MAILER=log` par
  défaut, aucune variable `MAIL_*` dans `docker-compose.yml`/`.env.production.example`. Un
  plan SMTP (Resend) existe dans `docs/DEPLOYMENT.md` mais n'a jamais été câblé. Pire : les
  classes `Notification` (`CandidatureSubmittedNotification`,
  `CandidatureStatusChangedNotification`) ont une méthode `toMail()` écrite mais leur `via()`
  ne retourne que `['database']` — le canal mail n'est jamais activé dans le code, même si
  on configurait Resend aujourd'hui. Les emails de confirmation candidat actuels passent par
  **EmailJS** côté navigateur, indépendamment du backend.
- **`npm audit` résiduel** : à la fin de cette session, seuls `astro` et `picomatch` restent
  en HIGH (les deux ci-dessus), tout le reste est clean.
