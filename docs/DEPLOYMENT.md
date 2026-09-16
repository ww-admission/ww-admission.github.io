# Déploiement — WorldWise Admission sur VPS OVH

> Deux environnements complets — **TEST** et **PRODUCTION** — sur un seul VPS OVH.
> Front Astro, back Laravel et bases PostgreSQL. Aucun service tiers d'hébergement.
>
> **Deux prestataires, deux rôles :** le serveur est chez **OVH**, le nom de domaine,
> sa zone DNS et la messagerie `info@` sont chez **Hostinger**.
>
> Le workflow quotidien (quelle branche, comment mettre en ligne) est dans
> **[BRANCHING.md](BRANCHING.md)**. Ce document-ci décrit l'installation.

---

## Table des matières

1. [Architecture cible](#1-architecture-cible)
2. [Ce qui a changé dans la codebase](#2-ce-qui-a-changé-dans-la-codebase)
3. [Étape 0 — Réconcilier les branches](#étape-0--réconcilier-les-branches)
4. [Étape 1 — Commander et sécuriser le VPS](#étape-1--commander-et-sécuriser-le-vps)
5. [Étape 2 — DNS chez Hostinger](#étape-2--dns-chez-hostinger)
6. [Étape 3 — Installer la pile logicielle](#étape-3--installer-la-pile-logicielle)
7. [Étape 4 — Les deux bases PostgreSQL](#étape-4--les-deux-bases-postgresql)
8. [Étape 5 — Cloner les deux environnements](#étape-5--cloner-les-deux-environnements)
9. [Étape 6 — Environnement de TEST](#étape-6--environnement-de-test)
10. [Étape 7 — Environnement de PRODUCTION](#étape-7--environnement-de-production)
11. [Étape 8 — HTTPS avec Let's Encrypt](#étape-8--https-avec-lets-encrypt)
12. [Étape 9 — Push-to-deploy](#étape-9--push-to-deploy)
13. [Étape 10 — Vérifications](#étape-10--vérifications)
14. [Étape 11 — Sauvegardes automatiques](#étape-11--sauvegardes-automatiques)
15. [Dépannage](#dépannage)
16. [Checklist de mise en production](#checklist-de-mise-en-production)

---

## 1. Architecture cible

Sept noms de domaine, deux environnements isolés, **une seule machine**.

```
                              INTERNET
                                 │
                        ┌────────┴────────┐
                        │   nginx  :443   │  ← TLS (Let's Encrypt, 2 certificats)
                        └────────┬────────┘
        ┌────────────────────────┴────────────────────────┐
        │                                                 │
   PRODUCTION                                          TEST
   branche main                                     branche develop
        │                                                 │
  ┌─────┴──────┬──────────────┐              ┌────────────┼──────────────┐
  ▼            ▼              ▼              ▼            ▼              ▼
domaine.com  app.domaine   api.domaine   dev.domaine  app.dev.dom   api.dev.dom
(vitrine)    (back-office) (API + WS)    (vitrine)    (back-office) (API + WS)
  │            │              │              │            │              │
  └──────┬─────┘              │              └──────┬─────┘              │
         ▼                    ▼                     ▼                    ▼
  ┌──────────────┐    ┌──────────────┐      ┌──────────────┐    ┌──────────────┐
  │ Node :4321   │───▶│ php-fpm      │      │ Node :4322   │───▶│ php-fpm      │
  │ wwa-web      │BFF │ + Reverb 8080│      │ wwa-dev-web  │BFF │ + Reverb 8081│
  │ /var/www/wwa │    │ supervisor   │      │/var/www/wwa- │    │ supervisor   │
  └──────────────┘    │   wwa:*      │      │        dev   │    │  wwa-dev:*   │
                      └──────┬───────┘      └──────────────┘    └──────┬───────┘
                             ▼                                          ▼
                    ┌──────────────────┐                     ┌──────────────────┐
                    │ PostgreSQL       │                     │ PostgreSQL       │
                    │ wwa_production   │                     │ wwa_staging      │
                    │ user: wwa_user   │                     │ user:wwa_dev_user│
                    └──────────────────┘                     └──────────────────┘
```

### Ce qui sépare les deux environnements

| | PRODUCTION | TEST |
|---|---|---|
| Branche git | `main` (reçoit les merges de `develop`) | `develop` (branche par défaut) |
| Dossier | `/var/www/wwa` | `/var/www/wwa-dev` |
| Vitrine | `worldwise-admission.com` | `dev.worldwise-admission.com` |
| Back-office | `app.worldwise-admission.com` | `app.dev.worldwise-admission.com` |
| API + WebSocket | `api.worldwise-admission.com` | `api.dev.worldwise-admission.com` |
| Port Node | 4321 | 4322 |
| Port Reverb | 8080 | 8081 |
| Service systemd | `wwa-web` | `wwa-dev-web` |
| Groupe supervisor | `wwa` | `wwa-dev` |
| Base PostgreSQL | `wwa_production` | `wwa_staging` |
| Utilisateur base | `wwa_user` | `wwa_dev_user` |
| `COOKIE_DOMAIN` | `.worldwise-admission.com` | `.dev.worldwise-admission.com` |
| `JWT_SECRET` | un secret | **un autre secret** |
| Indexation Google | vitrine oui, back-office non | **rien, nulle part** |
| Emails | Resend (réels) | `MAIL_MAILER=log` (aucun envoi) |
| Bandeau orange | non | oui, avec le n° de version |

Le fichier `deploy/targets/production.conf` et `deploy/targets/staging.conf`
contiennent ces valeurs. `deploy/deploy.sh` les lit et **refuse de déployer** si les
`.env` ne correspondent pas.

### Pourquoi `app.dev.domaine.com` et pas `dev.app.domaine.com`

C'est la décision d'architecture la plus importante de ce document, et elle n'est pas
cosmétique.

La page `/candidature` est servie par la **vitrine**, mais elle poste vers
`/api/candidatures` **avec le cookie de session**. Le cookie doit donc être valable
sur la vitrine **et** sur le back-office. C'est le rôle de `COOKIE_DOMAIN`.

Or un cookie posé sur `Domain=dev.worldwise-admission.com` couvre ce domaine et ses
sous-domaines. Et `dev.app.worldwise-admission.com` **n'est pas** un sous-domaine de
`dev.worldwise-admission.com` — leurs parents sont `app.worldwise-admission.com` puis
`worldwise-admission.com`.

Conséquence, avec la forme `dev.app.` :

- soit le cookie ne couvre pas les deux hôtes → **toute candidature d'un utilisateur
  connecté partirait sans authentification** ;
- soit on remonte à `COOKIE_DOMAIN=.worldwise-admission.com` → le cookie de test est
  envoyé aux hôtes de production, **avec le même nom `wwa_session`** : se connecter
  au test déconnecterait les utilisateurs du site live.

Avec `app.dev.` tout l'environnement de test vit sous `dev.`, `COOKIE_DOMAIN=.dev.…`
couvre exactement les deux hôtes de test, et jamais la production.

`deploy.sh` fait respecter cet invariant :

```
COOKIE_DOMAIN (sans le point) == hôte de PUBLIC_SITE_URL
hôte de PUBLIC_APP_URL        == sous-domaine de l'hôte de PUBLIC_SITE_URL
```

Vérifié sur les cinq combinaisons possibles ; les trois formes cassées sont refusées.

---

## 2. Ce qui a changé dans la codebase

### Adapter et environnements

| Fichier | Changement | Pourquoi |
|---|---|---|
| `astro.config.mjs` | `@astrojs/vercel` → `@astrojs/node` (`standalone`) | Le serveur tourne sur le VPS |
| `astro.config.mjs` | sitemap **uniquement en production** | Le test est entièrement interdit à l'indexation |
| `package.json` | `start`, `promote`, `promote:dry`, `hooks:install` | Commandes du quotidien |
| `src/lib/urls.ts` | **nouveau** | `ENV_NAME`, `IS_STAGING`, `RELEASE`, `SPLIT_HOSTS`, `appLink()`, `siteUrl()` |
| `src/middleware.ts` | Routage par hôte + `X-Robots-Tag` + `X-WWA-Env` | Le back-office ne vit que sur `app.` ; hors production rien n'est indexable |
| `src/pages/robots.txt.ts` | Dépend de l'hôte **et** de l'environnement | `Disallow: /` partout en test |
| `src/pages/health.ts` | **nouveau** | Sonde utilisée par `deploy.sh` et les workflows |
| `src/components/ui/EnvBanner.astro` | **nouveau** | Bandeau orange, non masquable, avec le n° de version |
| `src/layouts/Layout.astro`, `DashboardLayout.astro`, `pages/login.astro`, `pages/register.astro` | Insertion du bandeau | `/login` et `/register` n'utilisent aucun layout partagé — il fallait les traiter à part |
| `src/env.d.ts` | Séparation `import.meta.env` / `process.env` | Deux mécanismes distincts, à ne pas confondre |

### Session partagée entre vitrine et back-office

| Fichier | Changement |
|---|---|
| `src/lib/auth.ts` | `cookieDomain()`, `sessionCookieOptions()`, `sessionCookieClearOptions()` |
| `src/pages/api/auth/{login,register,logout}.ts` | Utilisent ces options partagées |
| `src/config/navigationBar.ts` | Lien « Se connecter » via `appLink('/login')` |

### Variables serveur : `process.env`, jamais `import.meta.env`

`src/lib/auth.ts`, `src/lib/bff.ts` et les routes `src/pages/api/**` lisent désormais
`JWT_SECRET`, `BACKEND_URL` et `COOKIE_DOMAIN` via `process.env`.

C'est la règle documentée dans [INFRA-CHANGES.md §3](INFRA-CHANGES.md) : `import.meta.env`
peut être figé au build par Vite, ce qui rendrait la configuration du VPS sans effet.
Sur la version actuelle d'Astro, la transformation en `process.env` se fait bien
automatiquement — vérifié en inspectant `dist/server/` — mais écrire `process.env`
explicitement supprime toute dépendance à ce comportement.

Le workflow `ci-build.yml` vérifie ce point à chaque push :

```
process.env.JWT_SECRET     présent dans dist/server/   → OK
process.env.BACKEND_URL    présent dans dist/server/   → OK
process.env.COOKIE_DOMAIN  présent dans dist/server/   → OK
aucun secret de build figé dans dist/                  → OK
```

### Infrastructure (nouveau dossier `deploy/`)

```
deploy/
├── targets/
│   ├── production.conf          branche main, /var/www/wwa, ports 4321/8080
│   └── staging.conf             branche develop, /var/www/wwa-dev, ports 4322/8081
├── deploy.sh                    déploiement, préflight, verrou, retour arrière
├── install.sh                   installe systemd + supervisor + nginx + sudoers
├── env/
│   ├── frontend.env.prod.example      api.env.prod.example
│   └── frontend.env.staging.example   api.env.staging.example
├── nginx/
│   ├── snippets/wwa-node-proxy.conf       (→ 4321)
│   ├── snippets/wwa-dev-node-proxy.conf   (→ 4322)
│   ├── wwa-site.conf      wwa-app.conf      wwa-api.conf
│   └── wwa-dev-site.conf  wwa-dev-app.conf  wwa-dev-api.conf
├── systemd/
│   ├── wwa-web.service      wwa-dev-web.service
└── supervisor/
    ├── wwa.conf             wwa-dev.conf
```

`api/supervisord.conf` a été supprimé : son contenu est repris dans
`deploy/supervisor/wwa.conf`, à côté de son pendant staging. Garder les deux au même
endroit évite qu'ils divergent.

### Scripts et workflows

| Fichier | Rôle |
|---|---|
| `scripts/promote.ps1` | Merge `develop` → `main` depuis le terminal, avec contrôles et confirmation |
| `scripts/git-hooks/pre-push` | Refuse un `git push` sur `main` contenant du code absent de `develop` |
| `scripts/install-git-hooks.ps1` | Active `core.hooksPath` |
| `.gitattributes` | Force LF sur les scripts shell et `deploy/` (sinon CRLF sous Windows) |
| `.github/workflows/ci-build.yml` | Build + typage + contrôle du bundle, sur `develop`, `main` et les PR |
| `.github/workflows/deploy-staging.yml` | Push `develop` → déploiement TEST automatique |
| `.github/workflows/deploy-production.yml` | Merge dans `main` → contrôle `guard` → PRODUCTION (approbation optionnelle) |

### Variables `PUBLIC_*` : figées au build

Astro remplace `import.meta.env.PUBLIC_*` par sa valeur **au moment du
`npm run build`**. Toute modification de `PUBLIC_ENV_NAME`, `PUBLIC_SITE_URL`,
`PUBLIC_APP_URL` ou `PUBLIC_REVERB_*` impose donc un **rebuild**, pas un simple
`systemctl restart`. `deploy.sh` rebuild systématiquement, donc c'est couvert.

---

## Étape 0 — Les branches

| Branche | Environnement | Déclencheur |
|---|---|---|
| `develop` (par défaut) | TEST | `git push` |
| `main` | PRODUCTION | merge de `develop` dans `main` (Pull Request *Create a merge commit*, ou `npm run promote`) |

> **Ne supprime jamais `main`** : c'est la branche de production. Le workflow
> quotidien est décrit dans [BRANCHING.md](BRANCHING.md).

### Réconciliation (faite le 2026-09-16)

`main` et `develop` avaient divergé (15 commits Docker/CI/CVE d'un côté, les annuaires
universités/formations de l'autre). Ils ont été réconciliés par un merge, et `develop`
contient désormais tout l'historique de `main`. Contrôle :

```powershell
git fetch --prune origin
git log --oneline --no-merges origin/develop..origin/main   # doit être vide
```

Si cette commande affiche des commits, **ne merge pas `develop` dans `main`** avant
d'avoir rapatrié ces commits dans `develop`
([BRANCHING.md §5](BRANCHING.md#main-a-divergé-de-develop)).

### Avant le premier déploiement de production

`origin/main` est encore dans l'état de l'ancien site GitHub Pages : pas de dossier
`deploy/`, pas de `/health`, et un workflow `.github/workflows/deploy.yml` (GitHub
Pages) que `develop` a supprimé. Le premier merge `develop` → `main` (un fast-forward)
met `main` au niveau de `develop`. Tant que ce merge n'a pas eu lieu, `/var/www/wwa`
cloné sur `main` ne contient pas de quoi se déployer : fais ce premier merge **après**
avoir validé le test (étape 6), et **avant** l'étape 7.

> Ce premier merge déclenche **Deploy - PRODUCTION (main)**. Si l'étape 7 n'est pas
> encore faite, ce run échouera sans rien casser : relance-le depuis l'onglet
> *Actions* (**Re-run jobs**) une fois la production installée.

Fais ensuite les réglages GitHub de
[BRANCHING.md §4](BRANCHING.md#4-réglages-github-à-faire-une-seule-fois) :
branche par défaut `develop`, merge commits uniquement, protection de `main`,
environnement `production`, secrets, désactivation de GitHub Pages.

### Le pipeline Docker existant sur `develop`

`develop` contient une infrastructure Docker complète (`docker-compose.yml`,
`Dockerfile.astro`, `api/Dockerfile.laravel`, Octane/FrankenPHP) et un pipeline
`.github/workflows/ci.yml` de 366 lignes qui pousse des images vers un **Harbor privé
via Tailscale**, sur un **runner self-hosted `ndewo`**.

Cette infrastructure suppose du matériel qui n'existe pas sur un VPS OVH neuf. Le
déploiement décrit ici n'en dépend pas.

**Ne supprime rien** — mais après la réconciliation, mets son déclencheur en manuel,
sinon chaque push sur `develop` lancerait un pipeline qui ne peut pas s'exécuter :

```yaml
# .github/workflows/ci.yml — remplacer tout le bloc `on:` par :
on:
  workflow_dispatch: {}
```

Le contenu du pipeline reste intact et réactivable en une ligne.

---

## Étape 1 — Commander et sécuriser le VPS

### 1.1 Réinstaller le VPS

Espace client OVH : **Bare Metal Cloud → VPS → ton VPS → … → Réinstaller mon VPS**.

- Distribution : **Ubuntu 24.04 LTS**, image nue (pas de Plesk / cPanel)
- Ajoute ta **clé SSH** à ce moment-là

```powershell
ssh-keygen -t ed25519 -C "steeve@wwa"
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub   # à coller dans OVH
```

OVH t'envoie ensuite l'IP et le login initial (`ubuntu` ou `root`).

> **Dimensionnement.** Deux environnements sur une machine, c'est deux process Node,
> deux Reverb, deux queues et une base. Prends **4 Go de RAM minimum**. Sur 2 Go
> ça tient, mais le build Astro se fait tuer sans swap — voir 1.4.

### 1.2 Mettre à jour, verrouiller SSH

```bash
ssh ubuntu@IP_DU_VPS
sudo apt update && sudo apt full-upgrade -y
sudo timedatectl set-timezone Africa/Libreville
sudo nano /etc/ssh/sshd_config
```

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

> ⚠️ Ne passe `PasswordAuthentication no` **qu'après** avoir vérifié que ta clé
> fonctionne, depuis une seconde fenêtre. Garde la session actuelle ouverte.

```bash
sudo systemctl restart ssh
```

### 1.3 Pare-feu et fail2ban

```bash
sudo apt install -y ufw fail2ban
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo systemctl enable --now fail2ban
sudo ufw status
```

Seuls 22, 80 et 443 sont ouverts. Node (4321/4322), Reverb (8080/8081) et PostgreSQL
(5432) n'écoutent que sur `127.0.0.1`.

> OVH propose aussi un **Network Firewall** dans le manager. Facultatif ; si tu
> l'actives, ouvre 22/80/443 sinon tu coupes l'accès.

### 1.4 Swap

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

---

## Étape 2 — DNS chez Hostinger

Le nom de domaine et sa zone DNS sont gérés chez **Hostinger**. OVH ne fournit que le
serveur : il n'y a rien à régler dans l'espace client OVH pour cette étape.

### 2.1 Vérifier que c'est bien la zone Hostinger qui répond

Les enregistrements saisis dans hPanel n'ont aucun effet si le domaine délègue à
d'autres serveurs de noms :

```powershell
Resolve-DnsName worldwise-admission.com -Type NS | Where-Object Type -eq 'NS' |
  Select-Object -ExpandProperty NameHost
```

Réponse attendue : `ns1.dns-parking.com` et `ns2.dns-parking.com`, les serveurs de
Hostinger.

### 2.2 Les sept enregistrements

hPanel : **Domaines → worldwise-admission.com → DNS / Serveurs de noms → Enregistrements DNS**.

Remplace `203.0.113.10` par l'IPv4 du VPS (espace client OVH, fiche du VPS) :

| Type | Nom | Pointe vers | Sert à |
|---|---|---|---|
| `A` | `@` | `203.0.113.10` | vitrine production |
| `CNAME` | `www` | `worldwise-admission.com` | vitrine production |
| `A` | `app` | `203.0.113.10` | back-office production |
| `A` | `api` | `203.0.113.10` | API + WebSocket production |
| `A` | `dev` | `203.0.113.10` | vitrine test |
| `A` | `app.dev` | `203.0.113.10` | back-office test |
| `A` | `api.dev` | `203.0.113.10` | API + WebSocket test |

- **Nom** : seulement la partie sous-domaine. `@` désigne le domaine nu, `app.dev`
  produit `app.dev.worldwise-admission.com`. Les noms à deux niveaux sont acceptés, et
  Let's Encrypt les certifie sans problème en validation HTTP.
- **`www`** est un `CNAME` vers le domaine nu : il suit l'IP de `@` sans qu'on ait à
  la recopier. Si Hostinger l'a déjà créé ainsi, laisse-le. Un `CNAME` et un `A` ne
  peuvent pas coexister sur le même nom.
- **Un enregistrement existe déjà sur ce nom** (page de parking Hostinger, ancien
  GitHub Pages en `185.199.x.x`, ancien Vercel en `cname.vercel-dns.com`) :
  **modifie-le** plutôt que d'en ajouter un second. Deux `A` sur le même nom, c'est une
  réponse tirée au hasard entre deux IP.
- **TTL** : `300` pendant l'installation, pour qu'une erreur se corrige en cinq
  minutes et non en quatre heures (`14400`, la valeur proposée par défaut). Tu peux la
  remonter une fois tout validé.
- **IPv6** : si le VPS en a une, ajoute les mêmes noms en `AAAA`, sauf `www` qui suit
  le `CNAME`.

> **À ne pas toucher : la messagerie.** L'adresse `info@worldwise-admission.com` est
> hébergée chez Hostinger et dépend d'enregistrements de la même zone :
>
> | Type | Nom | Valeur |
> |---|---|---|
> | `MX` | `@` | `mx1.hostinger.com` (5), `mx2.hostinger.com` (10) |
> | `TXT` | `@` | `v=spf1 include:_spf.mail.hostinger.com ~all` |
> | `CNAME` | `hostingermail-a._domainkey` (et `-b`, `-c`) | DKIM Hostinger |
> | `CNAME` | `autodiscover`, `autoconfig` | configuration des clients mail |
>
> Les supprimer en « faisant le ménage » coupe la réception et l'envoi des e-mails.

> **CAA.** Si la zone contient des enregistrements `CAA`, l'un d'eux doit autoriser
> Let's Encrypt (`0 issue "letsencrypt.org"`), sinon certbot échoue à l'étape 8. Sans
> aucun `CAA`, toutes les autorités sont acceptées.

> **Reverse DNS (PTR).** Il dépend du propriétaire de l'IP, donc d'OVH, pas de
> Hostinger. Rien à faire : le serveur n'envoie pas d'e-mails lui-même.

### 2.3 E-mails transactionnels (Resend), plus tard

Quand les `MAIL_*` de production seront branchés sur Resend, celui-ci demandera de
vérifier le domaine. Les enregistrements qu'il affiche (DKIM sur `resend._domainkey`,
`MX` et `TXT` sur le sous-domaine `send`) s'ajoutent **dans la zone Hostinger**, avec les
valeurs exactes données par Resend.

Ils vivent sur leurs propres noms et ne remplacent rien. En particulier, n'ajoute
**jamais** un second `TXT v=spf1` sur `@` : un domaine ne peut avoir qu'un seul SPF, et
deux SPF invalident les deux, donc aussi la messagerie Hostinger.

### 2.4 Vérifier

Interroge directement le serveur de Hostinger. La réponse reflète la zone tout de
suite, sans attendre l'expiration des caches :

```powershell
'','www.','app.','api.','dev.','app.dev.','api.dev.' | ForEach-Object {
  $h = "$($_)worldwise-admission.com"
  $ip = (Resolve-DnsName $h -Type A -Server ns1.dns-parking.com -DnsOnly -ErrorAction SilentlyContinue |
         Where-Object Type -eq 'A').IPAddress -join ','
  "{0,-34} {1}" -f $h, $ip
}

# La messagerie est toujours en place
Resolve-DnsName worldwise-admission.com -Type MX -Server ns1.dns-parking.com |
  Where-Object Type -eq 'MX' | Select-Object -ExpandProperty NameExchange
```

Les sept hôtes doivent renvoyer l'IP du VPS, et les `MX` rester `mx1` / `mx2.hostinger.com`.

Si Hostinger répond juste mais qu'un navigateur ou certbot voit encore l'ancienne IP,
c'est le cache : attends la fin du TTL précédent (`Clear-DnsClientCache` vide celui de
ta machine). Relance la même boucle sans `-Server ns1.dns-parking.com` pour voir ce que
voit le reste d'Internet.

---

## Étape 3 — Installer la pile logicielle

```bash
# Base
sudo apt install -y nginx git curl unzip supervisor

# Node 22 LTS (le paquet Ubuntu est trop ancien : les deps exigent >= 22)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v            # v22.x

# PHP 8.3 (correspond au "php": "^8.3" de api/composer.json)
sudo apt install -y php8.3-fpm php8.3-cli php8.3-common php8.3-pgsql \
  php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath \
  php8.3-intl php8.3-gd
sudo systemctl enable --now php8.3-fpm

# Composer
curl -sS https://getcomposer.org/installer -o /tmp/composer-setup.php
sudo php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

Limites PHP pour les pièces jointes :

```bash
sudo nano /etc/php/8.3/fpm/php.ini
```

```ini
upload_max_filesize = 25M
post_max_size = 26M
memory_limit = 256M
max_execution_time = 120
```

```bash
sudo systemctl restart php8.3-fpm
```

> Les deux environnements partagent le même pool php-fpm. C'est suffisant à ce
> volume. Si le test se met à ralentir la production, crée un pool dédié
> (`/etc/php/8.3/fpm/pool.d/wwa-dev.conf`) et fais pointer `fastcgi_pass` de
> `wwa-dev-api.conf` vers son socket.

---

## Étape 4 — Les deux bases PostgreSQL

Deux bases, **deux utilisateurs distincts** : une compromission du test ne doit pas
donner accès aux données réelles.

```bash
openssl rand -base64 24   # mot de passe production
openssl rand -base64 24   # mot de passe test
sudo -u postgres psql
```

```sql
-- ── PRODUCTION ────────────────────────────────────────────────────────────
CREATE DATABASE wwa_production;
CREATE USER wwa_user WITH ENCRYPTED PASSWORD 'MOT_DE_PASSE_PROD';
GRANT ALL PRIVILEGES ON DATABASE wwa_production TO wwa_user;
ALTER DATABASE wwa_production OWNER TO wwa_user;
\c wwa_production
GRANT ALL ON SCHEMA public TO wwa_user;     -- requis depuis PostgreSQL 15
ALTER ROLE wwa_user SET client_encoding TO 'utf8';
ALTER ROLE wwa_user SET timezone TO 'UTC';

-- ── TEST ──────────────────────────────────────────────────────────────────
\c postgres
CREATE DATABASE wwa_staging;
CREATE USER wwa_dev_user WITH ENCRYPTED PASSWORD 'MOT_DE_PASSE_TEST';
GRANT ALL PRIVILEGES ON DATABASE wwa_staging TO wwa_dev_user;
ALTER DATABASE wwa_staging OWNER TO wwa_dev_user;
\c wwa_staging
GRANT ALL ON SCHEMA public TO wwa_dev_user;
ALTER ROLE wwa_dev_user SET client_encoding TO 'utf8';
ALTER ROLE wwa_dev_user SET timezone TO 'UTC';
\q
```

Vérifie les deux :

```bash
psql "postgresql://wwa_user:MOT_DE_PASSE_PROD@127.0.0.1:5432/wwa_production" -c '\conninfo'
psql "postgresql://wwa_dev_user:MOT_DE_PASSE_TEST@127.0.0.1:5432/wwa_staging" -c '\conninfo'
```

> **Pas de copie des données de production vers le test.** La base contient des
> données personnelles réelles (passeports, adresses, relevés). Les copier dans un
> environnement moins protégé est un risque disproportionné. Le test se peuple avec
> le seeder et des données saisies à la main.

---

## Étape 5 — Cloner les deux environnements

```bash
sudo mkdir -p /var/www
sudo chown "$USER:$USER" /var/www

REPO=https://github.com/ww-admission/ww-admission.github.io.git

git clone -b develop "$REPO" /var/www/wwa-dev     # TEST
git clone -b main    "$REPO" /var/www/wwa         # PRODUCTION
```

> Clone **sans** `--single-branch` : GitHub Actions transmet au VPS le commit exact à
> déployer, `deploy.sh` doit pouvoir le trouver après un `git fetch`.

> `main` doit avoir reçu le premier merge de `develop`
> ([étape 0](#avant-le-premier-déploiement-de-production)). Sinon, clone `develop` dans
> `/var/www/wwa` : `deploy.sh production` se placera sur `origin/main` au premier
> déploiement.

> **Dépôt privé ?** Crée une clé de déploiement en **lecture seule** sur le VPS
> (`ssh-keygen -t ed25519 -f ~/.ssh/wwa_deploy`), ajoute la publique dans
> **GitHub → Settings → Deploy keys**, et clone en `git@github.com:…`.
> Le VPS n'a jamais besoin d'écrire sur le dépôt.

---

## Étape 6 — Environnement de TEST

On installe le **test d'abord**, volontairement : c'est là qu'on apprend la procédure
sans risque.

### 6.1 Installer les services

```bash
sudo bash /var/www/wwa-dev/deploy/install.sh staging
```

Le script installe et vérifie : l'unité systemd `wwa-dev-web`, le groupe supervisor
`wwa-dev`, le snippet nginx et les trois vhosts `wwa-dev-site` / `wwa-dev-app` /
`wwa-dev-api`, puis lance `nginx -t` avant de recharger. Il est idempotent.

> Si ton domaine n'est pas `worldwise-admission.com`, remplace-le **avant** :
> ```bash
> cd /var/www/wwa-dev/deploy/nginx
> sed -i 's/worldwise-admission\.com/TON-DOMAINE.com/g' ./*.conf
> ```

### 6.2 Configuration du frontend

```bash
sudo cp /var/www/wwa-dev/deploy/env/frontend.env.staging.example /var/www/wwa-dev/.env
sudo nano /var/www/wwa-dev/.env
```

| Variable | Valeur |
|---|---|
| `PUBLIC_ENV_NAME` | `staging` |
| `PUBLIC_SITE_URL` | `https://dev.worldwise-admission.com` |
| `PUBLIC_APP_URL` | `https://app.dev.worldwise-admission.com` |
| `COOKIE_DOMAIN` | `.dev.worldwise-admission.com` |
| `PORT` | `4322` |
| `JWT_SECRET` | `openssl rand -base64 48` — **différent de la production** |
| `BACKEND_URL` | `https://api.dev.worldwise-admission.com` |
| `PUBLIC_REVERB_APP_KEY` | identique à `REVERB_APP_KEY` de `api/.env` |
| `PUBLIC_REVERB_HOST` | `api.dev.worldwise-admission.com` |

> ⚠️ Lu par **systemd** : format `KEY=value` strict, pas de `export`, pas de
> commentaire en fin de ligne, pas d'espace autour du `=`.

### 6.3 Configuration du backend

```bash
sudo cp /var/www/wwa-dev/deploy/env/api.env.staging.example /var/www/wwa-dev/api/.env
sudo nano /var/www/wwa-dev/api/.env
```

À remplir : `DB_PASSWORD` (celui du test), les trois secrets Reverb, et laisser
`MAIL_MAILER=log` pour ne rien envoyer à de vrais candidats.

```bash
for n in ID KEY SECRET; do echo "REVERB_APP_$n=$(openssl rand -hex 16)"; done
```

Note la valeur de `REVERB_APP_KEY` : elle doit être recopiée dans
`PUBLIC_REVERB_APP_KEY` du `.env` frontend.

### 6.4 Première initialisation

```bash
cd /var/www/wwa-dev/api
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force        # crée le compte super admin
```

### 6.5 Premier déploiement

```bash
sudo bash /var/www/wwa-dev/deploy/deploy.sh
```

Sans argument, la cible est **staging** — c'est le défaut voulu.

Le script commence par vérifier la cohérence de la configuration : environnement,
hôtes, invariant du cookie, longueur et unicité du `JWT_SECRET`, base de données,
CORS, clé Reverb, port Reverb. Il s'arrête avec un message explicite au premier
écart. Puis il récupère le code, met à jour Laravel, rebuild Astro, corrige les
permissions, redémarre les services et interroge `/health`.

Sortie attendue à la fin :

```
  ✓ sante : {"status":"ok","env":"staging","release":"a1b2c3d"}
  ✓ release en ligne : a1b2c3d
  OK  Deploiement staging termine — release a1b2c3d
```

---

## Étape 7 — Environnement de PRODUCTION

Même procédure, avec les valeurs de production. Le test t'a servi de répétition.

```bash
sudo bash /var/www/wwa/deploy/install.sh production

sudo cp /var/www/wwa/deploy/env/frontend.env.prod.example /var/www/wwa/.env
sudo nano /var/www/wwa/.env
#   PUBLIC_ENV_NAME=production
#   PUBLIC_SITE_URL=https://worldwise-admission.com
#   PUBLIC_APP_URL=https://app.worldwise-admission.com
#   COOKIE_DOMAIN=.worldwise-admission.com
#   PORT=4321
#   JWT_SECRET=<openssl rand -base64 48, différent du test>
#   BACKEND_URL=https://api.worldwise-admission.com
#   PUBLIC_REVERB_HOST=api.worldwise-admission.com

sudo cp /var/www/wwa/deploy/env/api.env.prod.example /var/www/wwa/api/.env
sudo nano /var/www/wwa/api/.env
#   DB_DATABASE=wwa_production, DB_USERNAME=wwa_user, DB_PASSWORD=<prod>
#   REVERB_SERVER_PORT=8080
#   trois nouveaux secrets Reverb (différents du test)
#   MAIL_* → Resend (domaine vérifié via la zone Hostinger, étape 2.3)

cd /var/www/wwa/api
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force

sudo bash /var/www/wwa/deploy/deploy.sh production
```

Ce dernier affiche une bannière rouge et demande de taper `PRODUCTION` en entier.

---

## Étape 8 — HTTPS avec Let's Encrypt

Les sept enregistrements de la zone Hostinger doivent déjà résoudre vers le VPS
([étape 2.4](#24-vérifier)). Let's Encrypt interroge le DNS public : si un hôte
renvoie encore une ancienne IP en cache, certbot échoue pour cet hôte.

Deux certificats séparés : un incident sur le certificat de test ne doit jamais
toucher la production.

```bash
sudo apt install -y certbot python3-certbot-nginx

# PRODUCTION
sudo certbot --nginx \
  -d worldwise-admission.com \
  -d www.worldwise-admission.com \
  -d app.worldwise-admission.com \
  -d api.worldwise-admission.com \
  --agree-tos -m info@worldwise-admission.com --redirect

# TEST
sudo certbot --nginx \
  -d dev.worldwise-admission.com \
  -d app.dev.worldwise-admission.com \
  -d api.dev.worldwise-admission.com \
  --agree-tos -m info@worldwise-admission.com --redirect
```

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

> `install.sh` **ne réécrit pas** un vhost contenant déjà `listen 443` : il détecte
> le passage de certbot et te prévient. Si tu modifies un fichier `deploy/nginx/*`
> après certbot, reporte le changement à la main dans
> `/etc/nginx/sites-available/`, puis `nginx -t && systemctl reload nginx`.

### Redirection `www` → domaine nu (optionnel)

Après certbot, dans `/etc/nginx/sites-available/wwa-site`, sors `www` dans son propre
bloc :

```nginx
server {
    listen 443 ssl;
    server_name www.worldwise-admission.com;
    # les directives ssl_* ajoutées par certbot restent ici
    return 301 https://worldwise-admission.com$request_uri;
}
```

---

## Étape 9 — Push-to-deploy

Objectif : `git push` sur `develop` met à jour le test tout seul ; un merge de
`develop` dans `main` met à jour la production.

### 9.1 Utilisateur de déploiement sur le VPS

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo mkdir -p /home/deploy/.ssh && sudo chmod 700 /home/deploy/.ssh

# Paire de clés dédiée à GitHub Actions
sudo -u deploy ssh-keygen -t ed25519 -N "" -f /home/deploy/.ssh/gh_actions -C "github-actions@wwa"
sudo -u deploy cp /home/deploy/.ssh/gh_actions.pub /home/deploy/.ssh/authorized_keys
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh

# `deploy` doit pouvoir lire les dépôts et écrire dans les dossiers de build
sudo usermod -aG www-data deploy
```

### 9.2 Autoriser uniquement le déploiement, rien d'autre

```bash
sudo bash /var/www/wwa/deploy/install.sh production deploy
sudo bash /var/www/wwa-dev/deploy/install.sh staging deploy
```

Avec un utilisateur en second argument, `install.sh` :

- copie `deploy.sh` dans **`/usr/local/sbin/wwa-deploy`**, propriété de root, non
  modifiable par `deploy` ;
- écrit `/etc/sudoers.d/wwa-deploy` avec une seule autorisation :
  `deploy ALL=(root) NOPASSWD: /usr/local/sbin/wwa-deploy` ;
- valide la règle avec `visudo -c` et l'annule si elle est invalide.

> C'est une **copie** volontairement : si `sudoers` pointait directement sur
> `deploy/deploy.sh`, l'utilisateur `deploy` pourrait éditer ce fichier et obtenir
> root. Conséquence à retenir : après toute modification de `deploy/deploy.sh`, il faut
> relancer `install.sh` pour rafraîchir la copie.

Test :

```bash
sudo -u deploy sudo -n /usr/local/sbin/wwa-deploy staging --yes
```

### 9.3 Récupérer les valeurs pour GitHub

```bash
sudo cat /home/deploy/.ssh/gh_actions        # → secret VPS_SSH_KEY (tout, en-têtes inclus)
SSH_PORT=$(sudo sshd -T | awk '/^port /{print $2; exit}')
ssh-keyscan -p "$SSH_PORT" -H "$(curl -s ifconfig.me)"   # → secret VPS_SSH_KNOWN_HOSTS
curl -s ifconfig.me                                      # → secret VPS_HOST
echo "$SSH_PORT"                                         # → secret VPS_PORT (si ≠ 22)
```

> Le port SSH doit être joignable **depuis Internet** : les runners GitHub Actions
> n'ont pas d'IP fixe. S'il est filtré (pare-feu OVH, `ufw`, WAF), le déploiement
> échoue à l'étape « Deployer ».

### 9.4 Réglages GitHub

Suis [BRANCHING.md §4](BRANCHING.md#4-réglages-github-à-faire-une-seule-fois) :

- branche par défaut `develop`
- merge commits uniquement (ni squash ni rebase)
- protection de `main` (interdire force-push et suppression)
- environnement `production` : branche `main` uniquement, « Required reviewers » au choix
- les secrets **au niveau du dépôt** (le workflow de test n'a pas d'environnement)
- GitHub Pages désactivé

### 9.5 Garde-fous sur ta machine

```powershell
npm run hooks:install
```

> Active les workflows **après** avoir réussi les déploiements manuels des étapes 6
> et 7 et obtenu les certificats. Les workflows vérifient les URLs publiques en
> HTTPS : ils échoueraient avant.

---

## Étape 10 — Vérifications

### 10.1 Services

```bash
systemctl is-active nginx php8.3-fpm postgresql wwa-web wwa-dev-web
sudo supervisorctl status
```

Attendu :

```
wwa:wwa-queue              RUNNING
wwa:wwa-reverb             RUNNING
wwa-dev:wwa-dev-queue      RUNNING
wwa-dev:wwa-dev-reverb     RUNNING
```

### 10.2 Isolation des ports

```bash
sudo ss -ltnp | grep -E '4321|4322|8080|8081|5432'
```

Les cinq doivent être sur `127.0.0.1`, **aucun** sur `0.0.0.0`.

### 10.3 Routage, environnements, SEO

```bash
# PRODUCTION
curl -sI https://worldwise-admission.com/login | grep -i location
#   → https://app.worldwise-admission.com/login
curl -sI https://app.worldwise-admission.com/            # 302 → /login
curl -sI https://app.worldwise-admission.com/contact     # 302 → vitrine
curl -s  https://worldwise-admission.com/health          # env=production
curl -s  https://worldwise-admission.com/robots.txt      # Allow: /
curl -s  https://app.worldwise-admission.com/robots.txt  # Disallow: /
curl -sI https://app.worldwise-admission.com/login | grep -i x-robots-tag

# TEST
curl -sI https://dev.worldwise-admission.com/login | grep -i location
#   → https://app.dev.worldwise-admission.com/login
curl -s  https://dev.worldwise-admission.com/health      # env=staging
curl -s  https://dev.worldwise-admission.com/robots.txt      # Disallow: /
curl -s  https://app.dev.worldwise-admission.com/robots.txt  # Disallow: /
```

**Le contrôle le plus important** — la vitrine de production doit être indexable, et
absolument rien d'autre :

```bash
for u in https://worldwise-admission.com \
         https://app.worldwise-admission.com \
         https://dev.worldwise-admission.com \
         https://app.dev.worldwise-admission.com; do
  printf '%-42s %s\n' "$u" "$(curl -s "$u/robots.txt" | tr '\n' ' ')"
done
```

Seul le premier doit contenir `Allow: /`.

### 10.4 Isolation des sessions

Le test qui prouve que les deux environnements ne se marchent pas dessus :

1. Connecte-toi sur `https://app.worldwise-admission.com/login` (production)
2. Dans le **même navigateur**, connecte-toi sur
   `https://app.dev.worldwise-admission.com/login` (test)
3. Recharge l'onglet de production → **tu dois toujours être connecté**

Dans les outils du navigateur → Application → Cookies, tu dois voir deux cookies
`wwa_session` distincts, l'un sur `.worldwise-admission.com`, l'autre sur
`.dev.worldwise-admission.com`.

### 10.5 Parcours fonctionnel, sur le TEST

- [ ] Bandeau orange « Environnement de test » visible en bas à gauche, avec la version
- [ ] Connexion admin → `app.dev.…/admin`, statistiques chargées depuis Laravel
- [ ] Inscription candidat sur `app.dev.…/register` → `app.dev.…/dashboard`
- [ ] `dev.…/candidature` : formulaire 6 étapes soumis, visible dans l'admin
- [ ] Messagerie temps réel sans rechargement (WebSocket Reverb)
- [ ] Pièce jointe téléversée puis téléchargée depuis l'admin
- [ ] Bascule clair/sombre conservée après rechargement
- [ ] Déconnexion → retour vitrine ; `app.dev.…/admin` renvoie vers `/login`

Puis les mêmes vérifications en production, **sans** le bandeau orange.

### 10.6 Chaîne complète de déploiement

Le fichier de test doit être **hors** de `docs/` et des `*.md` : les workflows
ignorent ces chemins, un commit qui ne touche qu'eux ne déploie rien.

```powershell
git checkout develop
$stamp = Get-Date -Format o
"deploy-check $stamp" | Out-File -Encoding ascii public/deploy-check.txt
git add public/deploy-check.txt
git commit -m "test: verifier la chaine de deploiement"
git push
```

→ le workflow **Deploy - TEST (develop)** doit passer au vert, `dev.…/health` renvoyer
le nouveau `release`, et `https://dev.worldwise-admission.com/deploy-check.txt`
afficher l'horodatage.

Puis merge `develop` dans `main` (Pull Request *Create a merge commit*, ou
`npm run promote`) :

→ le workflow **Deploy - PRODUCTION (main)** doit passer le job `guard`, attendre ton
clic si « Required reviewers » est coché, puis passer au vert ;
`https://worldwise-admission.com/deploy-check.txt` doit afficher le même horodatage.

Enfin, supprime le fichier (`git rm public/deploy-check.txt`, commit, push) et
refais un merge vers `main` pour le retirer aussi de la production.

---

## Étape 11 — Sauvegardes automatiques

Seule la production est sauvegardée : le test est reconstructible à volonté.

```bash
sudo nano /usr/local/bin/wwa-backup.sh
```

```bash
#!/usr/bin/env bash
set -euo pipefail
DEST=/var/backups/wwa
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$DEST"

sudo -u postgres pg_dump -Fc wwa_production > "$DEST/db-$STAMP.dump"
tar czf "$DEST/storage-$STAMP.tar.gz" -C /var/www/wwa/api storage/app
find "$DEST" -type f -mtime +14 -delete
```

```bash
sudo chmod +x /usr/local/bin/wwa-backup.sh
sudo crontab -e
```

```cron
0 3 * * * /usr/local/bin/wwa-backup.sh >> /var/log/wwa-backup.log 2>&1
```

Restauration :

```bash
sudo -u postgres pg_restore -d wwa_production --clean /var/backups/wwa/db-20260818-0300.dump
```

> Une sauvegarde sur le VPS ne protège pas de la perte du VPS. Copie-les ailleurs
> (`rsync` vers ta machine) ou active l'option **Snapshot / Backup automatisé** d'OVH.

**Astuce test** : pour peupler le test avec une structure réaliste sans données
personnelles, restaure une sauvegarde de production dans `wwa_staging` **puis
anonymise**. À défaut d'un script d'anonymisation vérifié, reste sur le seeder.

---

## Dépannage

| Symptôme | Cause probable | Vérification |
|---|---|---|
| certbot : `DNS problem: NXDOMAIN` | hôte absent de la zone Hostinger, ou mal nommé | boucle de l'[étape 2.4](#24-vérifier) |
| certbot : mauvaise IP / `Timeout during connect` | ancienne IP encore en cache DNS | même boucle, avec puis sans `-Server ns1.dns-parking.com` |
| certbot : `CAA record ... prevents issuance` | un `CAA` de la zone Hostinger exclut Let's Encrypt | ajouter `0 issue "letsencrypt.org"` |
| Modification dans hPanel sans effet | le domaine délègue à d'autres serveurs de noms | `Resolve-DnsName worldwise-admission.com -Type NS` |
| `info@` ne reçoit plus rien | `MX`, SPF ou DKIM Hostinger supprimés de la zone | les recréer ([étape 2.2](#22-les-sept-enregistrements)) |
| `502` sur une vitrine ou un back-office | le service Node est arrêté | `journalctl -u wwa-web -n 50` / `-u wwa-dev-web` |
| Le service redémarre en boucle | `JWT_SECRET` absent du `.env` | `systemctl show wwa-web -p EnvironmentFiles` |
| `502` sur une API | mauvais socket php-fpm | `ls /run/php/` puis corriger `fastcgi_pass` |
| `deploy.sh` refuse : `COOKIE_DOMAIN incoherent` | le garde-fou fait son travail | il doit valoir exactement `.` + hôte de `PUBLIC_SITE_URL` |
| `deploy.sh` refuse : `PUBLIC_ENV_NAME ... mais la cible est ...` | `.env` du mauvais environnement | `grep PUBLIC_ENV_NAME /var/www/wwa*/.env` |
| `deploy.sh` refuse : `DB_DATABASE ... attendu ...` | risque d'écraser la base de prod | `grep DB_DATABASE /var/www/wwa*/api/.env` |
| `deploy.sh` refuse : `JWT_SECRET identique` | test et prod partagent le secret | en régénérer un pour le test |
| Session perdue entre vitrine et back-office | `COOKIE_DOMAIN` vide → cookie host-only | onglet Cookies du navigateur |
| Se connecter au test déconnecte de la prod | `COOKIE_DOMAIN` du test trop large | doit être `.dev.domaine.com` |
| Le bandeau orange manque sur le test | `PUBLIC_ENV_NAME` absent au build | `curl dev.…/health` puis rebuild |
| Bandeau orange visible en **production** | `PUBLIC_ENV_NAME` ≠ `production` | corriger puis `deploy.sh production` |
| `robots.txt` de la prod en `Disallow: /` | idem — **urgent, désindexation** | corriger et redéployer immédiatement |
| La vitrine s'affiche sur `app.…` | vhost `*-app` inactif | `nginx -T \| grep -A3 'server_name app'` |
| WebSocket qui échoue | clé Reverb ou origine incohérente | `/var/log/supervisor/wwa-reverb.log` |
| Le test répond avec les assets de la prod | mauvais chemin `/_astro/` dans un vhost | `grep -r alias /etc/nginx/sites-available/` |
| Pages en données mock | Laravel injoignable depuis Node | `curl https://api.…/api/auth/login` depuis le VPS |
| `npm run build` tué (OOM) | pas assez de RAM | ajouter du swap (étape 1.4) |
| Modification de `.env` sans effet | variable `PUBLIC_*` figée au build | relancer `deploy.sh` (pas un simple restart) |
| Modification de `deploy.sh` sans effet en CI | la copie root n'est pas à jour | relancer `install.sh <cible> deploy` |
| `un déploiement est déjà en cours` | verrou `flock` | attendre, ou `ls -l /var/lock/wwa-deploy-*` |

**Journaux :**

```bash
sudo journalctl -u wwa-web -f                        # Astro production
sudo journalctl -u wwa-dev-web -f                    # Astro test
sudo tail -f /var/log/nginx/wwa-app.error.log
sudo tail -f /var/www/wwa/api/storage/logs/laravel-*.log
sudo tail -f /var/log/supervisor/wwa-reverb.log
sudo tail -f /var/log/supervisor/wwa-dev-reverb.log
```

---

## Checklist de mise en production

### Branches et GitHub
- [ ] `git log --no-merges origin/develop..origin/main` vide (rien sur `main` qui manque à `develop`)
- [ ] Premier merge `develop` → `main` fait après validation du test
- [ ] Branche par défaut GitHub = `develop`
- [ ] Pull Requests : merge commits uniquement (squash et rebase désactivés)
- [ ] `main` protégée : force-push et suppression interdits
- [ ] Environnement `production` limité à `main` ; « Required reviewers » selon ton choix
- [ ] Secrets **du dépôt** renseignés (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_SSH_KNOWN_HOSTS`, `VPS_PORT` si SSH ≠ 22)
- [ ] GitHub Pages désactivé, environnement `github-pages` supprimé
- [ ] `ci.yml` (pipeline Docker) passé en `workflow_dispatch`
- [ ] `npm run hooks:install` lancé sur ta machine

### Infrastructure
- [ ] Ubuntu 24.04 à jour, fuseau horaire réglé
- [ ] SSH par clé, `PermitRootLogin no`, `PasswordAuthentication no`
- [ ] `ufw` actif : 22 / 80 / 443 uniquement
- [ ] `fail2ban` actif
- [ ] Swap présent (4 Go conseillé pour deux environnements)
- [ ] Serveurs de noms = `ns1` / `ns2.dns-parking.com` (Hostinger)
- [ ] Les 7 hôtes pointent vers le VPS dans la zone Hostinger, anciens Vercel/Pages supprimés
- [ ] `MX`, SPF et DKIM Hostinger intacts : `info@` reçoit toujours
- [ ] TTL remontés après validation (300 → 3600 ou plus)
- [ ] Node 22, PHP 8.3, PostgreSQL 16, nginx, supervisor installés

### Configuration
- [ ] `PUBLIC_ENV_NAME` = `production` d'un côté, `staging` de l'autre
- [ ] `COOKIE_DOMAIN` = `.domaine.com` / `.dev.domaine.com`
- [ ] Les deux `JWT_SECRET` sont **différents** et font ≥ 32 caractères
- [ ] Les deux jeux de secrets Reverb sont différents
- [ ] `PUBLIC_REVERB_APP_KEY` == `REVERB_APP_KEY` dans chaque environnement
- [ ] `REVERB_ALLOWED_ORIGINS` pointe le bon hôte `app.` — jamais `*`
- [ ] `APP_DEBUG=false` dans les deux `api/.env`
- [ ] `DB_DATABASE` : `wwa_production` / `wwa_staging`, deux utilisateurs distincts
- [ ] `MAIL_MAILER=log` sur le test
- [ ] Si Resend est branché en production : domaine vérifié, enregistrements dans la zone Hostinger, un seul SPF sur `@`
- [ ] Les quatre `.env` en `chmod 600`, propriétaire `www-data`
- [ ] Aucun secret préfixé `PUBLIC_`

### Services
- [ ] `wwa-web` et `wwa-dev-web` : `enabled` et `active`
- [ ] `wwa:*` et `wwa-dev:*` : `RUNNING`
- [ ] Ports 4321, 4322, 8080, 8081, 5432 tous sur `127.0.0.1`
- [ ] Deux certificats Let's Encrypt émis, `certbot.timer` actif
- [ ] `/usr/local/sbin/wwa-deploy` installé, `/etc/sudoers.d/wwa-deploy` valide

### Sécurité et SEO
- [ ] Seul `worldwise-admission.com/robots.txt` contient `Allow: /`
- [ ] `X-Robots-Tag: noindex` sur les trois autres hôtes
- [ ] `https://api.domaine.com/storage/` renvoie 403
- [ ] Isolation des sessions vérifiée ([10.4](#104-isolation-des-sessions))
- [ ] Mot de passe super admin différent de tout exemple

### Fonctionnel
- [ ] Toutes les vérifications de l'[étape 10](#étape-10--vérifications) passent
- [ ] Chaîne `git push` → test → `promote` → production testée de bout en bout
- [ ] Sauvegarde quotidienne planifiée **et restauration testée une fois**
