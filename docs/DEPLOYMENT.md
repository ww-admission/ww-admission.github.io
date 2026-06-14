# Déploiement — WorldWise Admission

> Guide complet pour déployer le frontend Astro sur Vercel et le backend Laravel sur un VPS/PaaS, avec checklist de mise en production.

---

## Table des matières

1. [Architecture de déploiement](#1-architecture-de-déploiement)
2. [Frontend — Vercel](#2-frontend--vercel)
3. [Backend — Laravel sur VPS](#3-backend--laravel-sur-vps)
4. [Variables d'environnement de production](#4-variables-denvironnement-de-production)
5. [Base de données](#5-base-de-données)
6. [CORS et communication inter-services](#6-cors-et-communication-inter-services)
7. [Checklist mise en production](#7-checklist-mise-en-production)
8. [Domaine et DNS](#8-domaine-et-dns)
9. [Surveillance et logs](#9-surveillance-et-logs)

---

## 1. Architecture de déploiement

```
┌──────────────────────────────────────────────────────────────┐
│  INTERNET                                                     │
│  worldwise-admission.com → Vercel Edge                        │
│  api.worldwise-admission.com → VPS (Laravel)                  │
└────────────────┬─────────────────────────────────────────────┘
                 │
    ┌────────────▼────────────┐    ┌──────────────────────────┐
    │  Vercel (Astro SSR)      │    │  VPS / PaaS (Laravel 11) │
    │  worldwise-admission.com │    │  api.worldwise-adm...com │
    │                          │    │                          │
    │  ├─ Pages publiques      │    │  ├─ POST /api/auth/*     │
    │  ├─ /login, /register    │────▶  ├─ GET/POST /api/cand.  │
    │  ├─ /dashboard/*         │ HTTP  ├─ GET /api/messages    │
    │  ├─ /admin/*             │ interne ├─ GET /api/logs      │
    │  └─ /api/auth/* (BFF)    │    │  └─ SQLite → PostgreSQL  │
    └──────────────────────────┘    └──────────────────────────┘
```

Le frontend Vercel ne parle **jamais** directement à la base de données. Il passe toujours par le backend Laravel via `BACKEND_URL` (variable serveur, jamais exposée au navigateur).

---

## 2. Frontend — Vercel

### Prérequis

- Compte Vercel (vercel.com)
- Dépôt GitHub connecté à Vercel
- Projet configuré avec `output: 'server'` + `adapter: vercel()` (déjà en place dans `astro.config.mjs`)

### Déploiement initial

```bash
# Installer la CLI Vercel (une fois)
npm i -g vercel

# Depuis la racine du projet
vercel

# Suivre les prompts :
#   → Set up and deploy? Y
#   → Which scope? (ton compte Vercel)
#   → Link to existing project? N (ou Y si déjà créé)
#   → Project name: wwa-astro
#   → Directory: ./  (racine)
#   → Override settings? N
```

### Déploiements suivants

Chaque `git push` sur `main` déclenche automatiquement un déploiement si le dépôt GitHub est connecté à Vercel.

Pour un déploiement manuel :

```bash
vercel --prod
```

### Variables d'environnement Vercel

Dans le dashboard Vercel → Settings → Environment Variables, ajouter :

| Variable | Scope | Valeur |
|---|---|---|
| `JWT_SECRET` | Production | Clé aléatoire 32+ chars (voir ci-dessous) |
| `BACKEND_URL` | Production | `https://api.worldwise-admission.com` |
| `PUBLIC_SITE_URL` | Production | `https://worldwise-admission.com` |

> **Générer JWT_SECRET :**
> ```bash
> # PowerShell
> -join ((1..48) | ForEach-Object { [char](Get-Random -Min 65 -Max 122) })
>
> # Bash / Linux
> openssl rand -base64 48
> ```

> ⚠️ Ne **jamais** préfixer `JWT_SECRET` ou `BACKEND_URL` avec `PUBLIC_` — ces variables ne doivent pas apparaître dans le bundle JS client.

### Configuration vercel.json (si nécessaire)

Si des ajustements de timeout ou de région sont nécessaires, créer `vercel.json` à la racine :

```json
{
  "regions": ["cdg1"],
  "functions": {
    "src/pages/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

---

## 3. Backend — Laravel sur VPS

### Option A — VPS Linux (recommandé pour la prod)

#### Prérequis serveur

- Ubuntu 22.04 LTS
- PHP 8.2+ avec extensions : `pdo`, `pdo_sqlite` (MVP) ou `pdo_pgsql` (prod), `mbstring`, `xml`, `curl`, `zip`
- Composer
- Nginx
- (Optionnel) Supervisor pour les queues Laravel

#### Installation PHP + Nginx (Ubuntu)

```bash
sudo apt update
sudo apt install -y nginx php8.2-fpm php8.2-cli php8.2-mbstring \
  php8.2-xml php8.2-curl php8.2-zip php8.2-sqlite3 php8.2-pgsql

# Installer Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

#### Déployer l'application

```bash
# Cloner le dépôt (si accès Git sur le VPS)
git clone https://github.com/ww-admission/wwa-astro-dev.git /var/www/wwa
cd /var/www/wwa/api

# Installer les dépendances
composer install --no-dev --optimize-autoloader

# Configurer .env
cp .env.example .env
nano .env  # remplir les valeurs (voir section 4)

# Générer la clé Laravel
php artisan key:generate

# Migrations + seeder
php artisan migrate --force
php artisan db:seed --force

# Optimisations Laravel
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Permissions
chown -R www-data:www-data /var/www/wwa/api
chmod -R 755 /var/www/wwa/api/storage
chmod -R 755 /var/www/wwa/api/bootstrap/cache
```

#### Configuration Nginx

```nginx
# /etc/nginx/sites-available/wwa-api
server {
    listen 80;
    server_name api.worldwise-admission.com;
    root /var/www/wwa/api/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/wwa-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

#### SSL avec Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.worldwise-admission.com
```

### Option B — Railway / Render / Fly.io (PaaS simplifié)

Ces plateformes peuvent héberger Laravel sans configuration Nginx manuelle. Les variables d'environnement se configurent dans leur dashboard. Se référer à la documentation de chaque plateforme pour le déploiement PHP.

---

## 4. Variables d'environnement de production

### Frontend — `.env` (Vercel)

```env
# Obligatoires
JWT_SECRET=<clé-aléatoire-32+-chars>
BACKEND_URL=https://api.worldwise-admission.com
PUBLIC_SITE_URL=https://worldwise-admission.com

# Optionnels (futur)
# PUBLIC_GOOGLE_CLIENT_ID=<google-oauth-client-id>
# GOOGLE_CLIENT_SECRET=<google-oauth-secret>
```

### Backend — `api/.env` (VPS)

```env
APP_NAME=WWA-API
APP_ENV=production
APP_KEY=<généré par php artisan key:generate>
APP_DEBUG=false
APP_URL=https://api.worldwise-admission.com

FRONTEND_URL=https://worldwise-admission.com

# Compte Super Admin
SUPER_ADMIN_EMAIL=info@worldwise-admission.com
SUPER_ADMIN_PASSWORD=<mot-de-passe-fort>

# Base de données (PostgreSQL en prod)
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=wwa_production
DB_USERNAME=wwa_user
DB_PASSWORD=<mot-de-passe-db>

# Logs
LOG_CHANNEL=stack
LOG_STACK=daily
LOG_LEVEL=warning

# Sessions
SESSION_DRIVER=database
SESSION_LIFETIME=10080  # 7 jours en minutes

# Cache
CACHE_STORE=database

# Mail (Resend)
MAIL_MAILER=smtp
MAIL_HOST=smtp.resend.com
MAIL_PORT=465
MAIL_USERNAME=resend
MAIL_PASSWORD=<resend-api-key>
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS=noreply@worldwise-admission.com
MAIL_FROM_NAME="WorldWise Admission"
```

---

## 5. Base de données

### Migration SQLite → PostgreSQL

Pour le passage en production, remplacer SQLite par PostgreSQL :

```bash
# Sur le VPS
sudo apt install -y postgresql postgresql-contrib php8.2-pgsql

# Créer la base
sudo -u postgres psql
  CREATE DATABASE wwa_production;
  CREATE USER wwa_user WITH PASSWORD 'mot-de-passe-fort';
  GRANT ALL PRIVILEGES ON DATABASE wwa_production TO wwa_user;
  \q

# Dans api/.env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=wwa_production
DB_USERNAME=wwa_user
DB_PASSWORD=mot-de-passe-fort

# Appliquer les migrations
php artisan migrate --force
php artisan db:seed --force
```

### Sauvegardes

```bash
# Sauvegarde PostgreSQL (à automatiser via cron)
pg_dump -U wwa_user wwa_production > backup_$(date +%Y%m%d).sql

# Cron journalier à 3h00
0 3 * * * pg_dump -U wwa_user wwa_production > /backups/wwa_$(date +\%Y\%m\%d).sql
```

---

## 6. CORS et communication inter-services

### Configuration CORS Laravel

Le fichier `api/config/cors.php` doit autoriser uniquement le frontend :

```php
// api/config/cors.php
'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:4321')],
'allowed_methods' => ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
'allowed_headers' => ['Content-Type', 'Authorization', 'Accept'],
'exposed_headers' => [],
'max_age' => 3600,
'supports_credentials' => false,
```

> En production : `FRONTEND_URL=https://worldwise-admission.com` dans `api/.env`.

### Pourquoi pas de CORS strict côté Astro ?

Les appels de l'Astro SSR vers Laravel se font serveur-à-serveur (via `BACKEND_URL`). CORS ne s'applique qu'aux appels navigateur → serveur. Le BFF Astro agit comme proxy, donc le navigateur ne parle jamais directement à Laravel.

---

## 7. Checklist mise en production

### Avant le premier déploiement

- [ ] Générer `JWT_SECRET` avec `openssl rand -base64 48` et l'ajouter dans Vercel
- [ ] Définir `BACKEND_URL` dans Vercel (URL publique du backend Laravel)
- [ ] Définir `SUPER_ADMIN_EMAIL` et `SUPER_ADMIN_PASSWORD` dans `api/.env`
- [ ] Lancer `php artisan key:generate` sur le VPS
- [ ] Lancer `php artisan migrate --force` et `php artisan db:seed --force`
- [ ] Vérifier que `APP_DEBUG=false` dans `api/.env`
- [ ] Configurer CORS (`FRONTEND_URL` dans `api/.env`)
- [ ] Installer SSL (Let's Encrypt) sur le VPS
- [ ] Tester le login avec `info@worldwise-admission.com`

### Vérifications fonctionnelles

- [ ] Page `/` charge correctement
- [ ] Page `/candidature` — formulaire multi-étapes fonctionne
- [ ] Modal `/login` — connexion admin → redirige vers `/admin`
- [ ] `/register` — création compte candidat → redirige vers `/dashboard`
- [ ] `/admin/candidatures` — liste visible (même si vide)
- [ ] `/dashboard/candidature` — page candidat accessible
- [ ] POST `/api/auth/logout` — déconnexion efface le cookie

### Sécurité

- [ ] `APP_DEBUG=false` en production (erreurs Laravel non exposées)
- [ ] Cookie `wwa_session` : `httpOnly=true`, `secure=true`, `sameSite=Lax`
- [ ] Headers de sécurité injectés par `src/middleware.ts` (`X-Frame-Options`, etc.)
- [ ] `JWT_SECRET` unique et aléatoire (jamais la valeur exemple)
- [ ] Aucune variable secrète préfixée `PUBLIC_` dans Vercel

### Performance

- [ ] `php artisan config:cache` exécuté en production
- [ ] `php artisan route:cache` exécuté en production
- [ ] `composer install --no-dev --optimize-autoloader`

---

## 8. Domaine et DNS

### Configuration recommandée

| Sous-domaine | Type | Valeur | Destination |
|---|---|---|---|
| `worldwise-admission.com` | CNAME | `cname.vercel-dns.com` | Vercel (frontend) |
| `www.worldwise-admission.com` | CNAME | `cname.vercel-dns.com` | Vercel (frontend) |
| `api.worldwise-admission.com` | A | IP du VPS | Laravel backend |

### Configurer le domaine dans Vercel

1. Dashboard Vercel → projet → Settings → Domains
2. Ajouter `worldwise-admission.com` et `www.worldwise-admission.com`
3. Vercel génère les enregistrements DNS à ajouter chez le registrar

---

## 9. Surveillance et logs

### Logs Laravel

```bash
# Consulter les logs en temps réel
tail -f /var/www/wwa/api/storage/logs/laravel.log

# Logs quotidiens (si LOG_STACK=daily)
ls /var/www/wwa/api/storage/logs/
```

### Logs Vercel

Dans le dashboard Vercel → Deployments → sélectionner un déploiement → Functions → voir les logs serverless en temps réel.

### Vérification santé API

```bash
# Tester que le backend répond
curl -X POST https://api.worldwise-admission.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"info@worldwise-admission.com","password":"Worldwise@ADMIN-1234"}'
# Attendu: { "token": "...", "user": { ... } }
```

### Mises à jour (frontend)

```bash
git push origin main
# → Vercel détecte le push et redéploie automatiquement
```

### Mises à jour (backend)

```bash
# Sur le VPS
cd /var/www/wwa/api
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
sudo systemctl reload php8.2-fpm
```
