# Déploiement — WorldWise Admission sur VPS OVH

> Deux environnements complets — **TEST** et **PRODUCTION** — sur un seul VPS OVH.
> Front Astro, back Laravel et bases PostgreSQL. Aucun service tiers d'hébergement.
>
> **Deux prestataires, deux rôles :** le serveur est chez **OVH**, le nom de domaine,
> sa zone DNS et la messagerie `info@` sont chez **Hostinger**.
>
> Le quotidien (publier sur le test, mettre une version en production, corriger vite,
> revenir en arrière) est dans **[BRANCHING.md](BRANCHING.md)**. Ce document-ci décrit
> l'installation.

---

## Table des matières

1. [Architecture cible](#1-architecture-cible)
2. [Ce qui a changé dans la codebase](#2-ce-qui-a-changé-dans-la-codebase)
3. [Étape 0 — Branches et versions](#étape-0--branches-et-versions)
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
   tag vX.Y.Z                                       branche develop
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
| Ce qui est déployé | un tag de version `vX.Y.Z` (`main` = version en ligne) | la pointe de `develop` (branche par défaut) |
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
| Approbation GitHub | **oui** (environnement `production`) | non (environnement `staging`) |

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
| `astro.config.mjs` | `outDir` surchargeable (`WWA_OUT_DIR`) | `deploy.sh` construit dans `dist-next/` puis bascule |
| `package.json` | `start`, `release`, `release:hotfix`, `release:dry`, `hooks:install` | Commandes du quotidien |
| `src/lib/urls.ts` | **nouveau** | `ENV_NAME`, `IS_STAGING`, `RELEASE`, `SPLIT_HOSTS`, `appLink()`, `siteUrl()` |
| `src/middleware.ts` | Routage par hôte + `X-Robots-Tag` + `X-WWA-Env` | Le back-office ne vit que sur `app.` ; hors production rien n'est indexable |
| `src/pages/robots.txt.ts` | Dépend de l'hôte **et** de l'environnement | `Disallow: /` partout en test |
| `src/pages/health.ts` | **nouveau** | Sonde utilisée par `deploy.sh` et les workflows : `env`, `version` (tag), `release` (commit) |
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
│   ├── production.conf          tags vX.Y.Z, /var/www/wwa, ports 4321/8080
│   └── staging.conf             branche develop, /var/www/wwa-dev, ports 4322/8081
├── deploy.sh                    déploiement, préflight, verrou, bascule, sauvegarde, retour arrière
├── ssh-gate.sh                  seule commande permise à la clé SSH de GitHub Actions
├── install.sh                   installe systemd + supervisor + nginx + sudoers + ssh-gate
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
| `scripts/release.ps1` | `npm run release` / `release:hotfix` / `release:dry` : crée le tag de version, avec résumé et confirmation |
| `scripts/git-hooks/pre-push` | Refuse un push direct sur `main` et toute suppression ou déplacement d'un tag `vX.Y.Z` |
| `scripts/install-git-hooks.ps1` | Active `core.hooksPath` |
| `.gitattributes` | Force LF sur les scripts shell et `deploy/` (sinon CRLF sous Windows) |
| `.github/workflows/ci-build.yml` | Build + typage + contrôle du bundle, sur `develop`, les PR, et avant chaque mise en production |
| `.github/workflows/deploy-staging.yml` | Push `develop` (ou *Run workflow* sur une branche) → TEST, environnement `staging` |
| `.github/workflows/deploy-production.yml` | Tag `vX.Y.Z` → résumé → build → **approbation** → PRODUCTION → Release GitHub, `main` avancée, report dans `develop` |

### Variables `PUBLIC_*` : figées au build

Astro remplace `import.meta.env.PUBLIC_*` par sa valeur **au moment du
`npm run build`**. Toute modification de `PUBLIC_ENV_NAME`, `PUBLIC_SITE_URL`,
`PUBLIC_APP_URL` ou `PUBLIC_REVERB_*` impose donc un **rebuild**, pas un simple
`systemctl restart`. `deploy.sh` rebuild systématiquement, donc c'est couvert.

---

## Étape 0 — Branches et versions

| Quoi | Où | Déclencheur | Approbation |
|---|---|---|---|
| TEST | branche `develop` (par défaut) | `git push` | non |
| PRODUCTION | tag `vX.Y.Z` | `npm run release` | **oui**, environnement GitHub `production` |
| Version en ligne | branche `main` | avancée par le workflow après chaque mise en production | — |
| Archive | *Releases* GitHub | créée par le workflow | — |

C'est la procédure qui existait déjà (tags `v1.0.0` et `v1.0.1` approuvés dans
*Deployments → production*), débarrassée de Harbor, Komodo et Tailscale : le
déploiement se fait directement sur le VPS. Le détail du quotidien est dans
[BRANCHING.md](BRANCHING.md).

> **Ne supprime jamais `main` ni un tag `vX.Y.Z`** : `main` est la référence de la
> production, chaque tag est l'archive d'une version.

### État de départ (au 2026-09-17)

- `develop` et `main` ont été réconciliés le 2026-09-16 : `develop` contient tout
  l'historique de `main`, donc la première version publiée depuis `develop` sera
  acceptée par le contrôle « construit sur la production ».
- `origin/main` est encore dans l'état de l'ancien site GitHub Pages (pas de
  `deploy/`, pas de `/health`). Elle sera avancée automatiquement par la première mise
  en production réussie. Ne la modifie pas à la main.
- Dernière version publiée : `v1.0.1` (22 juin, pipeline Docker). La prochaine
  proposée par `npm run release` sera `v1.1.0`.

Contrôle à tout moment :

```powershell
git fetch --prune --tags origin
git merge-base --is-ancestor origin/main origin/develop; $LASTEXITCODE   # 0 = OK
```

### L'ancienne infrastructure Docker

`develop` contient toujours `docker-compose.yml`, `Dockerfile.astro`,
`api/Dockerfile.laravel` et le pipeline `.github/workflows/ci.yml` (images poussées
vers un **Harbor privé via Tailscale**, runner self-hosted `ndewo`, déploiement par
**Komodo**). Ce pipeline est en **déclenchement manuel uniquement**
(`workflow_dispatch`) : il n'est plus lancé par les pushes ni par les tags, et le
déploiement décrit ici n'en dépend pas. Les images `www_prod/*:1.0.0` et `1.0.1`
restent dans Harbor à titre d'archive.

Rien n'a été supprimé : le pipeline se réactive en restaurant son bloc `on:`.

---

## Étape 1 — Commander et sécuriser le VPS

### 1.0 État du VPS constaté le 2026-09-16 (à lire avant tout)

Vu de l'extérieur, le VPS (`37.59.97.158`, `vps-d51894c8.vps.ovh.net`) n'est **pas**
vierge :

- les ports **80 et 443** sont tenus par **SafeLine**, un pare-feu applicatif
  (Chaitin) : redirection vers `https://hôte:443/`, certificats Let's Encrypt du
  2026-08-22 pour `worldwise-admission.com` et `dev.` seulement, puis **504** après
  60 s (aucune application derrière) ;
- la **console d'administration SafeLine est ouverte à Internet** sur le port `9443` ;
- le port **SSH 22 refuse les connexions** depuis Internet.

Décision (2026-09-17) : **retirer SafeLine** et suivre ce guide (nginx + certbot). Deux
façons, choisis selon ce que contient le serveur :

**Option A — réinstaller (recommandé si rien d'autre n'y tourne)** : étape 1.1
ci-dessous. SafeLine et tout le reste disparaissent, on repart d'un Ubuntu propre.

**Option B — garder le système et retirer SafeLine** : connecte-toi (console KVM du
manager OVH si SSH est fermé), puis **inventaire d'abord** :

```bash
sudo ss -ltnp | grep -E ':(22|80|443|9443)\b'      # qui écoute sur ces ports
sudo docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

> Si d'autres conteneurs que ceux de SafeLine (`safeline-*`) tournent — Komodo,
> `wwa-*`, une base — **arrête-toi** : ils appartiennent peut-être à l'ancienne
> infrastructure de l'agence. Vérifie avant de supprimer quoi que ce soit.

Si seul SafeLine est présent :

```bash
# Dossier d'installation de SafeLine (souvent /data/safeline)
DIR=$(sudo docker inspect safeline-mgt --format '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}')
echo "$DIR"
cd "$DIR" && sudo docker compose down        # arrête et retire les conteneurs SafeLine
sudo ss -ltnp | grep -E ':(80|443|9443)\b' || echo "80, 443 et 9443 sont libres"
```

`docker compose down` conserve les données de SafeLine sur le disque (réversible).
Quand tout fonctionne avec nginx, tu peux supprimer `$DIR` et, si Docker ne sert plus à
rien d'autre, `sudo apt purge docker-ce docker-ce-cli containerd.io`.

Enfin, rends SSH joignable (nécessaire à GitHub Actions) :

```bash
sudo systemctl enable --now ssh
sudo sshd -T | awk '/^port /{print "port SSH :", $2}'
sudo ufw allow OpenSSH        # ou : sudo ufw allow <port>/tcp
```

et vérifie dans le manager OVH (**Network → Firewall**) que ce port n'est pas bloqué.
Depuis ta machine :

```powershell
Test-NetConnection 37.59.97.158 -Port 22    # TcpTestSucceeded : True
```

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
git clone -b develop "$REPO" /var/www/wwa         # PRODUCTION (se placera sur un tag)
```

Les deux dossiers partent de `develop` : c'est `deploy.sh` qui place ensuite chaque
environnement sur la bonne référence (pointe de `develop` pour le test, tag
`vX.Y.Z` pour la production). `main` n'est pas utilisable pour cloner la production
tant que la première version n'a pas été publiée (étape 0).

> Clone **sans** `--single-branch` : GitHub Actions transmet au VPS le commit ou le tag
> exact à déployer, `deploy.sh` doit pouvoir le trouver après un `git fetch --tags`.

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
écart. Puis :

1. récupère le code ;
2. met l'API en maintenance ;
3. **construit le frontend dans `dist-next/`** pendant que `dist/` reste en ligne — si
   le build échoue, le code précédent est remis et rien n'a changé pour les visiteurs ;
4. (production) **sauvegarde la base** dans `/var/backups/wwa/pre-deploy-*.dump` ;
5. dépendances Composer, migrations, caches ;
6. **bascule** `dist-next/` → `dist/` (l'ancien devient `dist-prev/`), redémarre ;
7. interroge `/health` ; si le nouveau frontend ne répond pas, **remet `dist-prev/`**
   automatiquement.

Sortie attendue à la fin :

```
  ✓ sante : {"status":"ok","env":"staging","version":null,"release":"a1b2c3d"}
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

```

La production ne déploie **que des versions**. Une fois le TEST validé (étape 6 +
[10.5](#105-parcours-fonctionnel-sur-le-test)), publie la première depuis ta machine :

```powershell
npm run release:dry      # vérifier ce qui part
npm run release          # type "minor" -> v1.1.0, tu retapes "v1.1.0"
```

Sur GitHub, le run **PRODUCTION ← v1.1.0** s'arrête sur l'approbation. **Ne l'approuve
pas encore** (les secrets de l'étape 9 n'existent pas) : laisse-le en attente, et
déploie cette version à la main sur le VPS :

```bash
sudo bash /var/www/wwa/deploy/deploy.sh production v1.1.0
```

Le script affiche une bannière rouge et demande de taper `PRODUCTION` en entier.

Après l'étape 9, approuve le run resté en attente : il redéploie `v1.1.0` par SSH (ce
qui valide la chaîne complète), crée la Release GitHub et avance `main`.

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

Objectif : `git push` sur `develop` met à jour le test tout seul ; un tag `vX.Y.Z`
approuvé met à jour la production. GitHub Actions se connecte au VPS avec une clé qui
**ne peut rien faire d'autre** que lancer un déploiement.

### 9.1 Utilisateur de déploiement sur le VPS

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo mkdir -p /home/deploy/.ssh && sudo chmod 700 /home/deploy/.ssh

# Paire de clés dédiée à GitHub Actions
sudo -u deploy ssh-keygen -t ed25519 -N "" -f /home/deploy/.ssh/gh_actions -C "github-actions@wwa"

# La clé n'a qu'une commande possible : /usr/local/sbin/wwa-deploy-gate (deploy/ssh-gate.sh).
# `restrict` interdit shell interactif, transfert de fichiers et tunnels.
echo "command=\"/usr/local/sbin/wwa-deploy-gate\",restrict $(sudo cat /home/deploy/.ssh/gh_actions.pub)" \
  | sudo tee /home/deploy/.ssh/authorized_keys >/dev/null
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
- valide la règle avec `visudo -c` et l'annule si elle est invalide ;
- installe **`/usr/local/sbin/wwa-deploy-gate`** (`deploy/ssh-gate.sh`), la commande
  forcée de la clé : elle n'accepte que `staging [sha]` et `production vX.Y.Z`.

> C'est une **copie** volontairement : si `sudoers` pointait directement sur
> `deploy/deploy.sh`, l'utilisateur `deploy` pourrait éditer ce fichier et obtenir
> root. Conséquence à retenir : après toute modification de `deploy/deploy.sh`, il faut
> relancer `install.sh` pour rafraîchir la copie.

Test sur le VPS :

```bash
sudo -u deploy sudo -n /usr/local/sbin/wwa-deploy staging --yes
```

Test de la clé depuis n'importe quelle machine (après avoir copié la clé privée
temporairement) :

```bash
ssh -i gh_actions deploy@IP_DU_VPS staging          # lance un déploiement du test
ssh -i gh_actions deploy@IP_DU_VPS 'cat /etc/passwd'  # doit être refusé
```

### 9.3 Récupérer les valeurs pour GitHub

```bash
sudo cat /home/deploy/.ssh/gh_actions        # → secret VPS_SSH_KEY (tout, en-têtes inclus)
SSH_PORT=$(sudo sshd -T | awk '/^port /{print $2; exit}')
ssh-keyscan -p "$SSH_PORT" -H "$(curl -s ifconfig.me)"   # → secret VPS_SSH_KNOWN_HOSTS
curl -s ifconfig.me                                      # → secret VPS_HOST
echo "$SSH_PORT"                                         # → secret VPS_PORT (si ≠ 22)
```

Une fois `VPS_SSH_KEY` enregistré dans GitHub, **supprime la clé privée du VPS** : elle
n'a plus rien à y faire.

```bash
sudo shred -u /home/deploy/.ssh/gh_actions
```

> Le port SSH doit être joignable **depuis Internet** : les runners GitHub Actions
> n'ont pas d'IP fixe. S'il est filtré (pare-feu OVH, `ufw`, WAF), le déploiement
> échoue à l'étape « Deployer ».

### 9.4 Réglages GitHub

Suis [BRANCHING.md §7](BRANCHING.md#7-réglages-github-une-seule-fois) :

- environnement `production` : reviewers (déjà en place) + règle de tag `v*`
- ruleset des tags `v*` (ni suppression, ni déplacement)
- ruleset de `main` (ni suppression, ni force-push)
- les cinq secrets **au niveau du dépôt**
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

→ **TEST - deploiement** passe au vert ; `https://dev.worldwise-admission.com/deploy-check.txt`
affiche l'horodatage.

```powershell
npm run release          # type "patch"
```

→ **PRODUCTION ← vX.Y.Z** : le résumé liste le commit de test, l'approbation est
demandée, puis tout passe au vert ;
`https://worldwise-admission.com/health` annonce `"version":"vX.Y.Z"` ;
`https://worldwise-admission.com/deploy-check.txt` affiche le même horodatage ;
la Release `vX.Y.Z` apparaît dans *Releases* et `main` pointe dessus.

Puis teste le **retour arrière** : *Actions → PRODUCTION → Run workflow → Use workflow
from : tag de la version précédente* → le résumé affiche **RETOUR ARRIERE** →
après approbation, `/health` annonce l'ancienne version.

Enfin, supprime le fichier (`git rm public/deploy-check.txt`, commit, push) et publie
une nouvelle version pour revenir à un état propre.

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

En plus de cette sauvegarde quotidienne, **chaque mise en production** sauvegarde la
base juste avant les migrations (`deploy.sh`) :
`/var/backups/wwa/pre-deploy-<date>-<version>.dump`, 20 dernières conservées. C'est
celle à restaurer si une migration pose problème.

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
| `la production ne deploie que des versions` | commit sans tag demandé en production | `npm run release`, ou `WWA_ALLOW_UNTAGGED=1` en urgence |
| `wwa-deploy-gate : commande refusee` | commande SSH autre que `staging [sha]` / `production vX.Y.Z` | `journalctl -t wwa-deploy-gate` |
| Workflow : `n'est pas construit sur la production actuelle` | un hotfix en ligne n'est pas dans `develop` | `git checkout develop; git merge origin/main; git push` puis nouvelle version |
| Workflow : `Permission denied (publickey)` | clé absente d'`authorized_keys` ou mauvaise clé en secret | `sudo cat /home/deploy/.ssh/authorized_keys` |
| Workflow : `Host key verification failed` | `VPS_SSH_KNOWN_HOSTS` vide ou d'un autre port | refaire `ssh-keyscan -p <port> -H <ip>` |
| Workflow : `Connection refused` / timeout SSH | port SSH fermé (ufw, pare-feu OVH) | `Test-NetConnection <ip> -Port <port>` |
| `build echoue ... Le site en ligne n'a pas ete touche` | erreur de build Astro | log du run ; le site sert toujours la version précédente |
| `ancien frontend de nouveau en ligne` | le nouveau build ne répondait pas | `ls /var/www/wwa*/dist-failed`, `journalctl -u wwa-web -n 50` |
| Ports 80/443 déjà pris, nginx ne démarre pas | SafeLine (ou autre) toujours actif | [étape 1.0](#10-état-du-vps-constaté-le-2026-09-16-à-lire-avant-tout) |

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
- [ ] `git merge-base --is-ancestor origin/main origin/develop` renvoie 0
- [ ] Branche par défaut GitHub = `develop`
- [ ] Environnement `production` : reviewers + règle de tag `v*`
- [ ] Ruleset tags `v*` : suppression, force-push et mise à jour interdits
- [ ] Ruleset `main` : suppression et force-push interdits
- [ ] Secrets **du dépôt** renseignés (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_SSH_KNOWN_HOSTS`, `VPS_PORT` si SSH ≠ 22)
- [ ] GitHub Pages désactivé, environnement `github-pages` supprimé
- [ ] `ci.yml` (pipeline Docker) en `workflow_dispatch` uniquement
- [ ] `npm run hooks:install` lancé sur chaque poste

### Infrastructure
- [ ] SafeLine retiré : 80 et 443 tenus par nginx, 9443 fermé
- [ ] SSH joignable depuis Internet sur le port déclaré dans `VPS_PORT`
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
- [ ] `/usr/local/sbin/wwa-deploy` et `wwa-deploy-gate` installés, `/etc/sudoers.d/wwa-deploy` valide
- [ ] `authorized_keys` de `deploy` : `command="/usr/local/sbin/wwa-deploy-gate",restrict`
- [ ] Clé privée `gh_actions` supprimée du VPS après copie dans GitHub

### Sécurité et SEO
- [ ] Seul `worldwise-admission.com/robots.txt` contient `Allow: /`
- [ ] `X-Robots-Tag: noindex` sur les trois autres hôtes
- [ ] `https://api.domaine.com/storage/` renvoie 403
- [ ] Isolation des sessions vérifiée ([10.4](#104-isolation-des-sessions))
- [ ] Mot de passe super admin différent de tout exemple

### Fonctionnel
- [ ] Toutes les vérifications de l'[étape 10](#étape-10--vérifications) passent
- [ ] Chaîne `git push` → TEST → `npm run release` → approbation → PRODUCTION testée ([10.6](#106-chaîne-complète-de-déploiement))
- [ ] Retour arrière par *Run workflow* sur un tag testé une fois
- [ ] Release GitHub créée et `main` = version en ligne
- [ ] Sauvegarde quotidienne planifiée **et restauration testée une fois**
