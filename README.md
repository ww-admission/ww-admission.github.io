# WorldWise Admission — Documentation Technique

> **WWA** est une plateforme d'accompagnement pour étudiants africains souhaitant étudier à l'étranger (Chine, Ghana, Russie…). Elle couvre le site vitrine, le formulaire de candidature multi-étapes, les dashboards candidat et admin, et un système d'authentification SSR sécurisé par cookie HMAC.

![WWA Platform](https://services.qatorze.com/public/wwa-showup-image.png)

---

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Stack technique](#stack-technique)
- [Architecture en un coup d'œil](#architecture-en-un-coup-dœil)
- [Démarrage rapide](#démarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [Structure du projet](#structure-du-projet)
- [Comptes de test](#comptes-de-test)
- [Commandes utiles](#commandes-utiles)
- [Documentation détaillée](#documentation-détaillée)

---

## Vue d'ensemble

WWA est une application full-stack composée de deux parties qui communiquent via une API REST et des WebSockets temps réel :

| Partie | Technologie | Rôle |
|---|---|---|
| **Frontend** | Astro 5 SSR + Vercel | Site vitrine, formulaires, dashboards |
| **Backend** | Laravel 13 + SQLite | API REST, authentification, persistance |
| **WebSocket** | Laravel Reverb + Echo | Messagerie temps réel, notifications live |

```
┌──────────────────────────────────────────────────────────────┐
│                        Navigateur                            │
│    ClientRouter (Astro)    +    Laravel Echo (WS client)     │
└──────────────┬────────────────────────────┬──────────────────┘
               │ HTTPS                      │ WSS
               ▼                            ▼
┌──────────────────────────┐  ┌─────────────────────────────────┐
│   Vercel Edge / Astro    │  │  VPS Hostinger (Laravel 13)      │
│   SSR + BFF              │  │                                  │
│  /api/auth/*      ───────┼──▶ POST /api/auth/*                 │
│  /api/conversations/* ───┼──▶ GET/POST /api/conversations/*    │
│  /api/broadcasting/auth──┼──▶ /broadcasting/auth (Sanctum)    │
│  /api/notifications/* ───┼──▶ GET /api/notifications/*         │
└──────────────────────────┘  │                                  │
                              │  ┌─────────────────────────────┐ │
                              │  │  Laravel Reverb (WS server) │ │
                              │  │  :8080 (géré par supervisord)│ │
                              │  │  canal conversation.{id}    │ │
                              │  │  canal user.{id}            │ │
                              │  └─────────────────────────────┘ │
                              │  ┌──────────────┐                │
                              │  │  SQLite/PgSQL│                │
                              │  └──────────────┘                │
                              └─────────────────────────────────┘
```

---

## Stack technique

### Frontend

| Outil | Version | Rôle |
|---|---|---|
| **Astro** | 5.7.2 | Framework SSR — routing, composants, build |
| **@astrojs/vercel** | 9.x | Adapter Vercel pour déploiement SSR |
| **Tailwind CSS** | 3.4 | Styles utilitaires, design system |
| **TypeScript** | 5.4 | Typage strict sur tout le codebase |
| **ClientRouter** | intégré Astro | Navigation SPA sans rechargement de page |
| **astro-icon** | 1.x | Icônes SVG Heroicons inline |
| **@astrojs/sitemap** | 3.x | Sitemap XML automatique |
| **FormBold** | SaaS | Réception des soumissions formulaires (notifications équipe) |
| **EmailJS** | SaaS | Emails de confirmation candidat (fire-and-forget) |

### Backend

| Outil | Version | Rôle |
|---|---|---|
| **Laravel** | 13.8 | Framework PHP — routing, ORM, middleware |
| **Laravel Sanctum** | 4.0 | Authentification API par token porteur |
| **Laravel Reverb** | 1.10 | Serveur WebSocket natif (temps réel) |
| **Laravel Echo** | client | Client WebSocket côté frontend |
| **SQLite** | MVP | Base de données locale (→ PostgreSQL en prod) |
| **PHP** | ≥ 8.3 | Langage serveur |
| **supervisord** | — | Daemons `reverb:start` + `queue:work` sur VPS |

### Sécurité

| Mécanisme | Implémentation | Fichier |
|---|---|---|
| Cookie HTTP-only HMAC | SHA-256 HMAC sur données de session | `src/lib/auth.ts` |
| Auth Guard SSR | Middleware Astro avant rendu | `src/middleware.ts` |
| RBAC | Vérification rôle par préfixe d'URL | `src/middleware.ts` |
| SameSite=Lax | Protection CSRF sur cookies | `src/pages/api/auth/*.ts` |
| Headers HTTP | X-Frame-Options, X-Content-Type-Options… | `src/middleware.ts` |
| Open Redirect Guard | Whitelist `/admin`, `/dashboard` | `src/pages/login.astro` |

---

## Architecture en un coup d'œil

### Flux de connexion

```
Navigateur          Astro SSR              Laravel
    │                   │                     │
    ├─POST /api/auth/login──────────────────▶ │
    │                   │                     │ vérifie email/mdp
    │                   │◀── { user, token } ─┤
    │                   │                     │
    │                   │ createToken() HMAC   │
    │                   │ Set-Cookie: wwa_session (httpOnly, 7j)
    │                   │ Set-Cookie: wwa_role (non-httponly, JS)
    │◀── 200 {role,name}─┤                     │
    │                   │                     │
    ├─GET /dashboard ──▶│                     │
    │                   │ middleware:          │
    │                   │  verifyToken(cookie) │
    │                   │  locals.session = …  │
    │◀── Page SSR ───────┤                     │
```

### Flux candidature

```
┌─────────────────────────────────────────────────────────────┐
│   localStorage['wwa_candidature_v2']   ← draft auto-sauvegardé
│           │
│           │ Formulaire soumis via FormBold (POST texte)
│           ▼
│   localStorage['wwa_candidature_result']  ← résultat brut
│           │
│           │ dispatchEvent('wwa:candidature-submitted')
│           ▼
│   localStorage['wwa_candidatures']  ← tableau JSON
│           │
│           │ fetch('/api/candidatures')  background sync
│           ▼
│   Laravel DB (candidatures table)  synced: true
└─────────────────────────────────────────────────────────────┘
```

---

## Démarrage rapide

### Prérequis

- **Node.js** ≥ 18 — [nodejs.org](https://nodejs.org)
- **PHP** ≥ 8.2 + **Composer** — [php.net](https://php.net) / [getcomposer.org](https://getcomposer.org)

### 1. Installer les dépendances

```bash
# Frontend
npm install

# Backend
cd api && composer install && cd ..
```

### 2. Configurer les variables d'environnement

```bash
# Créer le .env frontend à la racine
cp .env.example .env   # si disponible, sinon créer manuellement
```

Contenu minimal du `.env` à la racine :

```env
JWT_SECRET=changer-cette-valeur-par-une-clé-aléatoire-longue
BACKEND_URL=http://localhost:8000
PUBLIC_SITE_URL=http://localhost:4321
```

```bash
# .env du backend
cd api
cp .env.example .env
php artisan key:generate
```

### 3. Préparer la base de données

```bash
cd api
php artisan migrate --seed
cd ..
```

### 4. Lancer les serveurs en développement

**Option rapide (tout en une commande) :**
```bash
cd api && composer dev
# Lance en parallèle : serve + queue:listen + reverb:start + logs
```

**Ou manuellement (4 terminaux) :**
```bash
# Terminal 1 — Frontend Astro
npm run dev          # → http://localhost:4321

# Terminal 2 — Backend Laravel
cd api && php artisan serve   # → http://localhost:8000

# Terminal 3 — WebSocket Reverb (temps réel messages + notifications)
cd api && php artisan reverb:start --host=0.0.0.0 --port=8080

# Terminal 4 — Queue worker (ProcessAttachment, emails…)
cd api && php artisan queue:listen --tries=1
```

---

## Variables d'environnement

### Frontend (`.env` à la racine)

| Variable | Req. | Description |
|---|---|---|
| `JWT_SECRET` | ✅ | Clé HMAC 32+ chars. Absence = erreur au démarrage. |
| `BACKEND_URL` | ✅ | URL interne Laravel. **Jamais exposée au client.** |
| `PUBLIC_SITE_URL` | ✅ | URL publique frontend. |
| `PUBLIC_REVERB_APP_KEY` | ✅ | Clé publique Reverb (idem `REVERB_APP_KEY` côté Laravel). |
| `PUBLIC_REVERB_HOST` | ✅ | Hôte Reverb (`localhost` en dev, domaine en prod). |
| `PUBLIC_REVERB_PORT` | ✅ | Port Reverb (`8080` par défaut). |
| `PUBLIC_REVERB_SCHEME` | ✅ | `http` en dev, `https` en prod. |
| `SUPER_ADMIN_EMAIL` | Dev | Email admin pour le seeder Laravel. |
| `SUPER_ADMIN_PASSWORD` | Dev | Mot de passe admin pour le seeder. |

> ⚠️ Variables sans préfixe `PUBLIC_` → **serveur uniquement**, jamais dans le bundle JS client.

### Backend (`api/.env`)

| Variable | Req. | Description |
|---|---|---|
| `REVERB_APP_KEY` | ✅ | Clé d'identification Reverb. |
| `REVERB_APP_SECRET` | ✅ | Secret de signature Reverb. |
| `REVERB_APP_ID` | ✅ | ID application Reverb. |
| `REVERB_ALLOWED_ORIGINS` | ✅ | Origines WebSocket autorisées. **Jamais `*` en prod.** |
| `BROADCAST_CONNECTION` | ✅ | `reverb` en prod, `log` pour désactiver. |
| `QUEUE_CONNECTION` | ✅ | `database` (mono-instance) → `redis` (multi-instances). |

---

## Structure du projet

```
wwa-astro-dev/
│
├── api/                              ← Backend Laravel
│   ├── app/Http/Controllers/         ← AuthController, CandidatureController…
│   ├── app/Models/                   ← User, Candidature, Message…
│   ├── database/migrations/          ← Schéma de base de données
│   ├── database/seeders/             ← Données initiales (super admin)
│   └── routes/api.php                ← Routes API REST
│
├── src/
│   ├── components/
│   │   ├── blocks/                   ← Sections de page (hero, CTA, modal…)
│   │   │   ├── candidature/          ← ApplicationForm.astro (6 étapes)
│   │   │   └── modal/                ← Login.astro, Register.astro
│   │   ├── ui/                       ← Composants atomiques (Button, Card…)
│   │   │   └── forms/                ← Champs de formulaire (Input, Select…)
│   │   └── scripts/                  ← LocalScripts, Analytics
│   │
│   ├── config/                       ← Données de configuration métier
│   │   ├── candidature.config.ts     ← Destinations, docs requis, validation
│   │   └── programs.config.ts        ← Programmes et facultés
│   │
│   ├── layouts/
│   │   ├── Layout.astro              ← Layout public (nav + footer + modals)
│   │   └── DashboardLayout.astro     ← Layout dashboard SSR (sidebar + auth)
│   │
│   ├── lib/
│   │   ├── auth.ts                   ← HMAC signing, createToken, verifyToken
│   │   └── mock-data.ts              ← Mock data dashboard (→ remplacer par API)
│   │
│   ├── middleware.ts                 ← Auth guard + RBAC + security headers
│   ├── env.d.ts                      ← Types TypeScript globaux
│   │
│   └── pages/
│       ├── index.astro               ← Accueil
│       ├── candidature.astro         ← Page marketing (CTA → dashboard)
│       ├── login.astro               ← Connexion standalone (SSR redirect)
│       ├── register.astro            ← Inscription standalone (SSR redirect)
│       ├── api/
│       │   ├── auth/login.ts         ← POST → Laravel → cookie HMAC
│       │   ├── auth/register.ts      ← POST → Laravel → cookie HMAC
│       │   ├── auth/logout.ts        ← POST → efface cookies
│       │   └── candidatures/index.ts ← POST → background sync Laravel
│       ├── dashboard/
│       │   ├── index.astro           ← Vue d'ensemble candidat
│       │   ├── candidature.astro     ← Machine à états (empty/form/list/detail)
│       │   └── messages.astro        ← Messagerie candidat
│       └── admin/
│           ├── index.astro           ← Tableau de bord admin
│           ├── candidatures.astro    ← Liste + filtres par statut
│           ├── candidatures/[id].astro ← Détail candidature (SSR dynamique)
│           ├── messages.astro        ← Messagerie admin
│           └── logs.astro            ← Logs d'activité
│
├── public/                           ← Assets statiques (logo.svg, fonts)
├── astro.config.mjs                  ← output: 'server', adapter: vercel()
├── tailwind.config.mjs               ← Thème, couleurs primary (rose), fonts
├── tsconfig.json                     ← TypeScript strict, exclude api/
└── package.json                      ← Dépendances, scripts npm
```

---

## Comptes de test

| Rôle | Email | Mot de passe | Accès |
|---|---|---|---|
| Super Admin | `info@worldwise-admission.com` | `Worldwise@ADMIN-1234` | `/admin/*` |
| Candidat | Créer via `/register` | Libre | `/dashboard/*` |

---

## Commandes utiles

```bash
# ── Frontend ─────────────────────────────────────────
npm run dev           # Serveur de développement (http://localhost:4321)
npm run build         # Build de production (dossier dist/)
npm run preview       # Prévisualiser le build
npx astro check       # Vérification TypeScript sans build

# ── Backend ──────────────────────────────────────────
cd api
php artisan serve                    # Serveur dev (http://localhost:8000)
php artisan reverb:start             # Serveur WebSocket (ws://localhost:8080)
php artisan queue:listen --tries=1   # Worker file de tâches
php artisan migrate                  # Appliquer les migrations
php artisan migrate:fresh --seed     # Reset base + seeders
php artisan route:list               # Lister toutes les routes API
php artisan test                     # Lancer la suite de tests PHPUnit

# ── Tests backend ─────────────────────────────────────
cd api
php artisan test --filter NotificationTest   # Tests notifications
php artisan test --filter ConversationTest   # Tests messagerie

# ── Supervisord (VPS production) ──────────────────────
sudo supervisorctl start wwa:*       # Démarrer reverb + queue
sudo supervisorctl status wwa:*      # État des daemons
sudo supervisorctl restart wwa:*     # Redémarrer après déploiement
```

---

## Documentation détaillée

| Document | Description |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture complète, flux de données, système d'auth, patterns de code, composants clés |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Déploiement Vercel + Laravel, variables de production, checklist mise en prod |
