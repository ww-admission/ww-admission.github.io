# Architecture - WorldWise Admission

> Guide technique approfondi : comment le système est construit, pourquoi ces choix, comment les pièces s'assemblent.

---

## Table des matières

1. [Vue d'ensemble du système](#1-vue-densemble-du-système)
2. [Frontend - Astro SSR](#2-frontend--astro-ssr)
3. [Système d'authentification](#3-système-dauthentification)
4. [Middleware et sécurité](#4-middleware-et-sécurité)
5. [Backend - Laravel 11](#5-backend--laravel-11)
6. [Système de candidature](#6-système-de-candidature)
7. [Composants clés](#7-composants-clés)
8. [Design System](#8-design-system)
9. [Patterns de code importants](#9-patterns-de-code-importants)
10. [Décisions architecturales](#10-décisions-architecturales)

---

## 1. Vue d'ensemble du système

### Topologie complète

```
╔══════════════════════════════════════════════════════════════╗
║                    INTERNET                                  ║
╚══════════════╤═══════════════════════════════════════════════╝
               │ HTTPS (TLS 1.3)
               ▼
╔══════════════════════════════════════════════════════════════╗
║              VERCEL EDGE NETWORK                             ║
║  ┌──────────────────────────────────────────────────────┐   ║
║  │                 ASTRO SSR SERVER                      │   ║
║  │                                                       │   ║
║  │  ① Request arrives                                    │   ║
║  │       │                                               │   ║
║  │       ▼                                               │   ║
║  │  ② src/middleware.ts                                  │   ║
║  │    ├─ verifyToken(cookie)                             │   ║
║  │    ├─ RBAC check (/admin → role=admin requis)         │   ║
║  │    ├─ Security headers injection                      │   ║
║  │    └─ Astro.locals.session = { sub, name, role, token}│   ║
║  │       │                                               │   ║
║  │       ▼                                               │   ║
║  │  ③ Page SSR render (.astro)                           │   ║
║  │    ├─ Lit Astro.locals.session                        │   ║
║  │    ├─ Rendu HTML côté serveur                         │   ║
║  │    └─ Retourne HTML + cookies                         │   ║
║  │                                                       │   ║
║  │  Endpoints API: /api/auth/*, /api/candidatures        │   ║
║  └──────────────────────────────────────────────────────┘   ║
╚══════════════╤═══════════════════════════════════════════════╝
               │ HTTP interne (BACKEND_URL, jamais exposé)
               ▼
╔══════════════════════════════════════════════════════════════╗
║              LARAVEL 11 BACKEND (api/)                       ║
║                                                              ║
║  Routes API:                                                 ║
║  POST /api/auth/login|register|logout                        ║
║  GET  /api/candidatures[/stats][/{id}]                       ║
║  POST/PATCH /api/candidatures[/{id}]                         ║
║  GET  /api/conversations[/{id}/messages]                     ║
║  POST /api/conversations/{id}/messages                       ║
║  POST /api/attachments | GET /download|preview               ║
║  GET  /api/notifications | POST /read-all                    ║
║  GET  /api/network/contacts  (candidat: lecture seule)       ║
║  GET/POST/PATCH/DELETE /api/network/contacts[/{id}] (admin)  ║
║  GET  /api/community          (profils publics)              ║
║  GET  /api/community/admin    (admin: tous les profils)      ║
║  GET  /api/users (admin) | GET /api/logs (admin)             ║
║  GET  /api/contact (admin) | POST /api/contact (public)      ║
║                                                              ║
║  ┌─────────────────────────────────────────────────────┐    ║
║  │  Models: User, Candidature, Message, Conversation,  │    ║
║  │          Attachment, Notification, Contact,         │    ║
║  │          ContactSubmission, AppLog                  │    ║
║  │  Auth:   Laravel Sanctum (Bearer tokens)            │    ║
║  └─────────────────────────────────────────────────────┘    ║
║  ┌─────────────────────────────────────────────────────┐    ║
║  │             SQLite (MVP)                             │    ║
║  │   users / candidatures / messages / conversations   │    ║
║  │   attachments / notifications / contacts /          │    ║
║  │   contact_submissions / app_logs                    │    ║
║  └─────────────────────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════╝
```

### Rôles des deux serveurs

| | Astro SSR (Vercel) | Laravel (api/) |
|---|---|---|
| **Responsabilité** | Rendu HTML, routing, sécurité session | Logique métier, persistance, auth tokens |
| **Connaissance du client** | Cookies, headers HTTP, session HMAC | Tokens Sanctum uniquement |
| **Base de données** | Aucune | SQLite → PostgreSQL en prod |
| **Secrets exposés** | `JWT_SECRET` (jamais au client) | `APP_KEY`, credentials DB |
| **Scale** | Serverless Vercel (auto) | VPS / PaaS à déployer |

---

## 2. Frontend - Astro SSR

### Mode de rendu

Le projet utilise `output: 'server'` - **tout est SSR** par défaut. Chaque requête est rendue côté serveur, ce qui permet :

- Les redirections serveur immédiates (`Astro.redirect()`)
- L'accès aux cookies HTTP-only (`Astro.cookies`)
- Le middleware d'authentification
- Des pages toujours fraîches (pas de stale data)

```js
// astro.config.mjs
export default defineConfig({
  output: 'server',      // SSR - pas de static export
  adapter: vercel(),     // Serverless sur Vercel
})
```

### ClientRouter (View Transitions)

`<ClientRouter fallback="swap" />` est activé dans `Header.astro`. Il intercepte les clics sur les liens et effectue des navigations client-side (SPA-like) :

```
Navigation classique:            Avec ClientRouter:
──────────────────               ──────────────────────────────
Clic → rechargement page         Clic → fetch SSR server
                                 → swap DOM body
                                 → astro:page-load event
                                 → scripts ré-initialisés
```

**Implication critique pour les scripts :** Les `<script>` (modules JS) sont mis en cache entre navigations. Il faut utiliser `document.addEventListener('astro:page-load', ...)` pour se rebrancher sur le nouveau DOM après chaque navigation, OU `<script is:inline>` qui s'exécute à chaque fois.

```
                  astro:page-load
                       │
         ┌─────────────┴────────────┐
         ▼                          ▼
  <script is:inline>         <script> (module)
  Exécuté à chaque           Exécuté une seule fois
  navigation                 (mis en cache)
  ─────────────────          ──────────────────────
  login.astro                Login.astro modal
  register.astro             (utilise astro:page-load)
  DashboardLayout.astro
  dashboard/candidature.astro
```

### Structure des layouts

```
Layout.astro                  DashboardLayout.astro
─────────────────             ──────────────────────────────
NavigationBar                 Sidebar (SSR - Astro.locals.session)
  ├─ Logo                       ├─ Logo
  ├─ Nav items                  ├─ Role badge (admin/candidat)
  └─ "Se connecter" → modal     ├─ Nav items (selon rôle)
                                └─ User info + Déconnexion
Main (slot)
Footer                        Main (slot)
LoginModal (#login)
RegisterModal (#register)
LocalScripts
```

### Routing Astro (file-based)

```
src/pages/
├── index.astro             → GET /
├── login.astro             → GET /login
├── register.astro          → GET /register
├── candidature.astro       → GET /candidature
├── dashboard/
│   ├── index.astro         → GET /dashboard
│   ├── candidature.astro   → GET /dashboard/candidature
│   └── messages.astro      → GET /dashboard/messages
├── admin/
│   ├── index.astro         → GET /admin
│   ├── candidatures.astro  → GET /admin/candidatures
│   └── candidatures/
│       └── [id].astro      → GET /admin/candidatures/:id  (dynamique SSR)
└── api/
    ├── auth/login.ts           → POST /api/auth/login
    ├── auth/register.ts        → POST /api/auth/register
    ├── auth/logout.ts          → POST /api/auth/logout
    ├── candidatures/index.ts   → GET+POST /api/candidatures
    ├── candidatures/[id].ts    → GET+PATCH /api/candidatures/:id
    ├── candidatures/stats.ts   → GET /api/candidatures/stats
    ├── network/contacts.ts     → GET+POST /api/network/contacts
    ├── network/contacts/[id].ts → GET+PATCH+DELETE /api/network/contacts/:id
    ├── community/index.ts      → GET /api/community (admin → /admin, candidat → /)
    ├── notifications/index.ts  → GET+POST /api/notifications
    ├── notifications/[id].ts   → PATCH /api/notifications/:id/read
    ├── conversations/[id]/messages.ts → GET+POST /api/conversations/:id/messages
    ├── attachments/index.ts    → POST /api/attachments
    ├── attachments/[id]/*.ts   → GET download/preview, DELETE
    ├── accounts/index.ts       → GET /api/users (admin)
    ├── contact.ts              → POST /api/contact (public)
    └── broadcasting/auth.ts    → POST /broadcasting/auth (Reverb)
```

---

## 3. Système d'authentification

### Vue d'ensemble

L'authentification est **hybride** :
- **Laravel Sanctum** génère les tokens API (Bearer tokens)
- **Astro** crée un cookie de session signé HMAC qui encapsule le token Sanctum
- Le client ne voit jamais le token Sanctum directement

```
┌──────────────────────────────────────────────────────────────┐
│                  Couches d'authentification                  │
│                                                              │
│  Client           ┌──────────────────────────────────────┐  │
│  (navigateur)     │  Cookie wwa_session (HTTP-only)       │  │
│                   │  ─────────────────────────────────    │  │
│  Inaccessible JS  │  Base64url(JSON{sub,name,role,token}) │  │
│                   │  +                                    │  │
│                   │  HMAC-SHA256(data, JWT_SECRET)        │  │
│                   └──────────────────────────────────────┘  │
│                              │                               │
│                              │ Middleware lit + vérifie      │
│                              ▼                               │
│                   ┌──────────────────────────────────────┐  │
│  Cookie wwa_role  │  Astro.locals.session                │  │
│  (lisible JS)     │  { sub, name, role, token, exp }     │  │
│  "admin"|"cand."  │                                      │  │
│                   └──────────────────────────────────────┘  │
│                              │                               │
│                              │ Bearer ${session.token}       │
│                              ▼                               │
│                   ┌──────────────────────────────────────┐  │
│                   │  Laravel Sanctum                      │  │
│                   │  Valide le token sur chaque requête  │  │
│                   └──────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### src/lib/auth.ts - Le cœur du système

Ce fichier implémente un système de token signé HMAC sans dépendance externe :

```typescript
// Structure d'une session
interface Session {
  sub: string           // email (subject)
  name: string          // nom d'affichage
  role: 'admin' | 'candidate'
  exp: number           // expiration Unix timestamp
  token: string         // Bearer token Sanctum (pour appels API Laravel)
}

// Flux de création
createToken(payload)
  → JSON.stringify(session)
  → Base64url encode → "data"
  → HMAC-SHA256(data, JWT_SECRET) → "sig"
  → retourne "data.sig"

// Flux de vérification
verifyToken("data.sig")
  → extraire data et sig
  → recalculer HMAC(data, JWT_SECRET)
  → comparer avec sig (timing-safe)
  → décoder et vérifier exp
  → retourne Session | null
```

**Pourquoi HMAC maison et pas JWT ?**
- Aucune dépendance externe (moins de surface d'attaque)
- Format simple et auditable
- `crypto.subtle` (Web Crypto API) disponible dans les runtimes Vercel/Edge
- Le JWT standard est souvent over-engineered pour ce cas d'usage

### Flux complet de connexion

```
1. Utilisateur soumet le formulaire login (modal ou page /login)
        │
        │ fetch POST /api/auth/login
        │ { email, password }
        ▼
2. src/pages/api/auth/login.ts
        │ proxy vers Laravel: POST BACKEND_URL/api/auth/login
        │
        ▼ (Laravel valide et répond)
3. { user: { email, name, role }, token }
        │
        │ createToken({ sub, name, role, token })
        │
        ▼
4. cookies.set('wwa_session', hmacToken, { httpOnly: true, ... })
   cookies.set('wwa_role', role, { httpOnly: false })
        │
        │ return { role, name }
        ▼
5. JS client: window.location.href = role === 'admin' ? '/admin' : '/dashboard'
        │
        ▼
6. GET /dashboard → middleware.ts
        │ cookies.get('wwa_session')
        │ verifyToken(raw) → session
        │ Astro.locals.session = session
        ▼
7. DashboardLayout.astro reçoit session
   session.name, session.role disponibles server-side
   Sidebar rendue avec les bons items de nav
```

### Deux cookies complémentaires

| Cookie | `httpOnly` | Durée | Contenu | Usage |
|---|---|---|---|---|
| `wwa_session` | ✅ Oui | 7 jours | Token HMAC signé complet | Validation serveur (middleware) |
| `wwa_role` | ❌ Non | 7 jours | `"admin"` ou `"candidate"` | Check client-side (modal "déjà connecté") |

> `wwa_role` est intentionnellement lisible par JS mais ne donne aucun accès. Si un attaquant le falsifie, le middleware rejette la requête car `wwa_session` est toujours vérifié.

---

## 4. Middleware et sécurité

### src/middleware.ts - Pipeline de sécurité

Chaque requête HTTP passe par ce fichier avant d'atteindre une page :

```
Request HTTP
     │
     ▼
src/middleware.ts
     │
     ├─ /admin/* ou /dashboard/* ?
     │       │ OUI
     │       ▼
     │  Lire cookie wwa_session
     │       │
     │       ├─ Cookie absent ou invalide ?
     │       │       → redirect /login?redirect=<pathname>
     │       │
     │       ├─ Token expiré ?
     │       │       → redirect /login
     │       │
     │       ├─ /admin/* et role ≠ 'admin' ?
     │       │       → redirect /dashboard
     │       │
     │       └─ OK → locals.session = session → next()
     │
     ├─ Autres routes → locals.session = null → next()
     │
     └─ Ajouter Security Headers sur la réponse
            X-Content-Type-Options: nosniff
            X-Frame-Options: DENY
            Referrer-Policy: strict-origin-when-cross-origin
            Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### RBAC (Role-Based Access Control)

| URL Pattern | Rôle requis | Si non-conforme |
|---|---|---|
| `/admin` | `admin` | → `/dashboard` |
| `/admin/*` | `admin` | → `/dashboard` |
| `/dashboard` | authentifié | → `/login` |
| `/dashboard/*` | authentifié | → `/login` |
| Tout le reste | aucun | accès libre |

---

## 5. Backend - Laravel 11

### Structure API

```
api/routes/api.php
│
├── POST /api/auth/register  → AuthController@register
│     body: { name, email, password, password_confirmation }
│     return: { user: { id, name, email, role }, token }
│
├── POST /api/auth/login     → AuthController@login
│     body: { email, password }
│     return: { user: { id, name, email, role }, token }
│
├── Sanctum protected (Bearer token):
│   ├── POST /api/candidatures   → CandidatureController@store
│   ├── GET  /api/candidatures   → CandidatureController@index
│   ├── GET  /api/messages       → ConversationController@index
│   └── GET  /api/logs           → LogController@index
```

### Modèles de données

```
users
├── id, name, email, password
├── role: enum('admin', 'candidate')  default: 'candidate'
└── timestamps

candidatures
├── id, user_id (FK → users)
├── status: enum('pending','reviewing','accepted','rejected','on_hold')
├── data: JSON (toutes les données du formulaire)
├── synced: boolean
└── timestamps

candidature_comments
├── id, candidature_id (FK), user_id (FK)
├── content: text
└── timestamps

conversations
├── id, candidature_id (FK)
├── participants: JSON
└── timestamps

messages
├── id, conversation_id (FK), user_id (FK)
├── content: text, read_at
└── timestamps
```

### Communication Astro ↔ Laravel

Les endpoints Astro (`/api/auth/*`, `/api/candidatures`) agissent comme **BFF (Backend For Frontend)** :

```
Client          Astro Endpoint           Laravel
  │                  │                     │
  ├─POST─────────▶   │                     │
  │             parse + valide             │
  │                  ├─POST (BACKEND_URL)──▶
  │                  │                     │ logique métier
  │                  │◀──JSON──────────────┤
  │             crée cookie HMAC           │
  │◀───JSON──────────┤                     │
```

**Avantages du pattern BFF :**
- `BACKEND_URL` jamais exposé au client
- Le token Sanctum ne transite jamais par le JS client
- L'Astro endpoint peut enrichir/transformer la réponse
- Gestion d'erreur centralisée (502 si Laravel indisponible)

---

## 6. Système de candidature

### Machine à états - `/dashboard/candidature`

```
                    Page chargée
                         │
                         ▼
                  ┌─────────────┐
                  │   LOADING   │  ← spinner
                  └──────┬──────┘
                         │ migrateResult() + loadCandidatures()
                         ▼
           ┌─────────────────────────┐
           │                         │
     candidatures.length = 0   candidatures.length ≥ 1
           │                         │
           ▼                         ▼
    ┌─────────────┐          ┌─────────────┐
    │    EMPTY    │──────────▶    LIST      │
    │  CTA bouton │  "Nouvelle │  Cards grid │
    └──────┬──────┘  candid." └──────┬──────┘
           │                         │
           │ "Déposer candid."        │ Clic card
           ▼                         ▼
    ┌─────────────┐          ┌─────────────┐
    │    FORM     │          │   DETAIL    │
    │ ApplicationForm        │  Statut,    │
    │ (6 étapes)  │          │  Timeline,  │
    └──────┬──────┘          │  Données    │
           │ soumission OK   └──────┬──────┘
           ▼                        │ "Nouvelle"
    wwa:candidature-submitted       │
           │                        │
           ▼                        │
    migrateResult()                 │
    renderList()    ◀───────────────┘
    setView('list')
           │
           │ background sync
           ▼
    POST /api/candidatures (Laravel)
```

### Pipeline de données localStorage

```
localStorage['wwa_candidature_v2']    ← Draft (auto-save 500ms debounce)
        │
        │ Formulaire soumis → handleSubmit()
        │ 1. saveSubmittedState()
        ▼
localStorage['wwa_candidature_result']  ← Données du dossier soumis
        │
        │ dispatchEvent('wwa:candidature-submitted')
        │ OU page refresh → init() → migrateResult()
        ▼
localStorage['wwa_candidatures']   ← Array JSON (tous les dossiers)
[{
  id: "uuid",
  submittedAt: "2026-05-20T10:30:00Z",
  status: "pending",
  synced: false,
  nom: "Dupont",
  prenom: "Jean",
  ...tous les champs du formulaire
}]
        │
        │ syncUnsynced() → fetch POST /api/candidatures
        ▼
Laravel DB  synced: true
```

### Préremplissage

Quand l'utilisateur choisit "Préremplir depuis le dernier dossier" :

```javascript
const last = candidatures[0]  // Plus récent en tête du tableau
const prefill = { ...last }
delete prefill.id            // Nouvel identifiant généré
delete prefill.submittedAt  // Nouvelle date
delete prefill.status        // Reset status
delete prefill.synced        // Reset sync
prefill.currentPanel = '1'   // Remettre au panel 1

localStorage.setItem('wwa_candidature_v2', JSON.stringify(prefill))
// ApplicationForm lit wwa_candidature_v2 dans restoreFromLocal()
// → tous les champs pré-remplis, panneau 1 affiché
```

---

## 7. Composants clés

### ApplicationForm.astro

Le composant le plus complexe du projet. 1800+ lignes.

```
ApplicationForm.astro
│
├── Props: { classes?, successHref? = '/' }
│
├── Vue "déjà soumis" (submittedView)
│   ├── Affiché si localStorage['wwa_candidature_result'] existe
│   ├── Timeline de statut
│   └── Bouton "Nouvelle candidature"
│
├── Vue formulaire (formContent)
│   ├── Panel 1 - Informations personnelles
│   │   └── nom, prénom, dateNaissance, passeport, téléphone, email…
│   ├── Panel 2 - Informations académiques
│   │   └── niveauEtude, établissement, spécialité, moyenne
│   ├── Panel 3 - Destination & Programme
│   │   └── destination picker (cards), niveauVise, programme, faculté
│   ├── Panel 4 - Complémentaire (Chine uniquement)
│   │   └── contact urgence, déjà étudié en Chine, financement
│   ├── Panel 5 - Documents
│   │   └── FileUpload (diplôme, pièce d'identité, relevés…)
│   └── Panel 6 - Récapitulatif + envoi
│       └── Tableau complet + confirmations
│
├── Scripts (module script, astro:page-load):
│   ├── Navigation entre panels (goToPanel, getStepSeq)
│   ├── Validation par panel (validateCurrentPanel)
│   ├── Auto-save localStorage (500ms debounce)
│   ├── Autocomplete adresse (Nominatim OpenStreetMap)
│   ├── Autocomplete établissements (liste Gabon)
│   ├── Géolocalisation (navigator.geolocation)
│   ├── Dropdown pays (restcountries.com)
│   ├── Soumission FormBold (text-only, sans fichiers)
│   ├── Email confirmation EmailJS (fire-and-forget)
│   └── dispatchEvent('wwa:candidature-submitted') ← dashboard écoute
│
└── Events émis:
    └── wwa:candidature-submitted (CustomEvent)
```

### DashboardLayout.astro

Layout SSR pour toutes les pages protégées. Rendu entièrement côté serveur.

```
DashboardLayout.astro
│
├── Props: { title, activeNav? }
├── Lit: Astro.locals.session (garanti non-null par middleware)
│
├── Sidebar (rendue SSR)
│   ├── Logo
│   ├── Badge rôle (admin: primary, candidat: amber)
│   ├── Nav items (filtrés par rôle, actif par activeNav prop)
│   └── User info (session.name, session.sub)
│       └── Formulaire POST /api/auth/logout
│
├── Header mobile (toggle sidebar)
│
├── Main (slot → contenu de la page)
│
└── Script is:inline (mobile sidebar toggle uniquement)
    ├── openSidebar / closeSidebar
    └── overlay click handler
```

### Login.astro (modal)

```
Login.astro (composant modal)
│
├── Utilise Modal.astro (overlay blur, popup card)
│
├── Script (module, astro:page-load):
│   ├── MutationObserver sur #login (classe "open")
│   │   ├── onOpen:
│   │   │   ├── Vérifier wwa_role cookie → si connecté, redirect
│   │   │   └── history.pushState('/login')
│   │   └── onClose:
│   │       └── history.replaceState(savedUrl)
│   │
│   ├── Toggle mot de passe
│   │
│   └── Submit → fetch /api/auth/login
│       ├── Succès: cookie posé server-side, redirect
│       └── Erreur: extractError() → affichage Laravel 422
│
└── Lien "Créer un compte" → data-modal="register"
    (LocalScripts ferme login, ouvre register)
```

---

## 8. Design System

### Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `primary-500` | `#E2187D` (rose) | CTAs, liens actifs, focus |
| `primary-700` | `#be185d` | Hover sur primary |
| `neutral-*` | Slate scale | Textes, bordures, fonds |
| `amber-400` | Focus ring | Tous les champs de formulaire |

### Composants UI réutilisables

```
src/components/ui/
├── Button.astro          → props: type, size, style, modal, link
├── Modal.astro           → props: id, title - bg-white/50 backdrop-blur
├── NavigationBar.astro   → lit navigationBar.ts
├── Footer.astro          → lit footerNavigation.ts
├── Section.astro         → wrapper avec padding/classes
├── Row.astro + Col.astro → grid 12 colonnes
└── forms/
    ├── InputField.astro  → floating label, amber focus
    ├── SelectField.astro → floating label, arrow custom
    ├── PhoneInput.astro  → indicatif + numéro séparés
    ├── MultiSelect.astro → tags avec suppression
    ├── FileUpload.astro  → drag & drop, validation type/taille
    └── TextArea.astro    → auto-resize
```

### Pattern Floating Label (InputField)

```html
<!-- Technique CSS peer - label remonte quand input focus ou rempli -->
<div class="relative w-full">
  <input
    placeholder="Adresse email"      ← placeholder transparent (trick)
    class="peer placeholder-transparent focus:border-amber-400"
  />
  <label class="
    absolute -top-2 left-2            ← position "flottée" par défaut
    peer-placeholder-shown:top-3     ← descend si input vide
    peer-focus:-top-2                ← remonte au focus
    peer-focus:text-amber-500        ← coloration au focus
  ">
    Adresse email
  </label>
</div>
```

### Système modal

```
Déclencheur (Button data-modal="login")
       │
       │ LocalScripts.astro (astro:page-load)
       │ openModal() → ajoute classe "open"
       ▼
Modal.astro (#login)
  class="modal"           ← h-0 → h-full quand open
  .modal__popup           ← translate-y-6 opacity-0 → 0 opacity-100
  .modal__header          ← titre + bouton fermer
  .modal__body            ← slot (contenu)

Fermeture:
  ├── Clic .modal__close (X)
  ├── Clic backdrop (event.target === modal)
  └── Bouton retour navigateur → popstate (Login.astro)
```

---

## 9. Patterns de code importants

### Guard de sécurité côté serveur

```typescript
// src/middleware.ts
export const onRequest = defineMiddleware(async (context, next) => {
  const needsAuth = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
  if (!needsAuth) {
    context.locals.session = null
    const response = await next()
    applySecurityHeaders(response)
    return response
  }

  const session = await verifyToken(context.cookies.get('wwa_session')?.value)
  if (!session) return context.redirect('/login?redirect=' + encodeURIComponent(pathname))

  // RBAC
  if (pathname.startsWith('/admin') && session.role !== 'admin')
    return context.redirect('/dashboard')

  context.locals.session = session
  const response = await next()
  applySecurityHeaders(response)
  return response
})
```

### Proxy BFF sécurisé (endpoints API)

```typescript
// src/pages/api/auth/login.ts
export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json()                    // parse et valide

  const resp = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })                                                   // proxy vers Laravel

  const data = await resp.json()                      // parse réponse
  if (!resp.ok) return json(data, resp.status)        // propage erreurs

  // Valide structure avant de créer la session
  const user = data.user
  if (!user?.email || !user?.name || typeof data.token !== 'string')
    return json({ message: 'Réponse serveur inattendue.' }, 502)

  const sessionToken = await createToken({ ... })     // HMAC signing
  cookies.set('wwa_session', sessionToken, { httpOnly: true, ... })
  return json({ role, name }, 200)                    // jamais le token raw
}
```

### Extraction d'erreurs Laravel 422

```typescript
function extractError(json: Record<string, unknown>, fallback: string): string {
  // Laravel retourne: { message: "…", errors: { email: ["…"], password: ["…"] } }
  if (json.errors && typeof json.errors === 'object') {
    const first = Object.values(json.errors as Record<string, unknown[]>)[0]
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
  }
  return (typeof json.message === 'string' && json.message) || fallback
}
```

### Migration localStorage au chargement

```javascript
// dashboard/candidature.astro - is:inline, astro:page-load
// Doit s'exécuter AVANT ApplicationForm pour que wwa_candidature_result
// soit vide quand checkSubmittedState() d'ApplicationForm tourne
document.addEventListener('astro:page-load', function() {
  migrateResult()     // ← migre wwa_candidature_result → wwa_candidatures
  _candidatures = loadCandidatures()
  // ... reste de l'init
})
```

### Communication modale ↔ dashboard (événements custom)

```
ApplicationForm         Dashboard
      │                    │
      │ saveSubmittedState()
      │ → localStorage['wwa_candidature_result'] = {...}
      │
      │ dispatchEvent('wwa:candidature-submitted')
      ├──────────────────▶ │
      │                    │ migrateResult()
      │                    │ renderList()
      │                    │ setView('list')
      │
      │ Show success modal
```

---

## 10. Décisions architecturales

### Pourquoi SSR et pas Static ?

| Critère | Static (ancien) | SSR (actuel) |
|---|---|---|
| Auth | localStorage + JS hacks | Cookie HTTP-only sécurisé |
| Sécurité | Token exposé au JS | Token jamais accessible au client |
| Flash de contenu | Spinner JS attendu | Rendu immédiat après auth |
| Routes dynamiques | `getStaticPaths()` obligatoire | Route dynamique native |
| Module script caching | Bug avec ClientRouter | `is:inline` ou `astro:page-load` |

La migration vers SSR a éliminé 6 bugs significatifs identifiés en audit.

### Pourquoi HMAC et pas JWT standard ?

- Aucune dépendance npm (`jsonwebtoken`, `jose`, etc.)
- `crypto.subtle` natif dans tous les runtimes modernes (Vercel Edge, Node, Deno)
- Format plus simple, auditable en 50 lignes
- Pas de vulnérabilités liées à l'algo `none` de JWT

### Pourquoi localStorage pour les candidatures (MVP) ?

- Zéro latence - données disponibles instantanément
- Fonctionnel sans backend (offline-first)
- Migration transparente : `synced: false` → background sync → `synced: true`
- Structure identique en localStorage et en DB → migration sans transformation

**Limitation :** données locales à l'appareil. Pour un usage multi-device, le backend doit être connecté et les candidatures fetchées depuis l'API au chargement.

### Pourquoi FormBold + EmailJS plutôt que Laravel pour les formulaires ?

- **MVP rapide** : pas besoin de configurer un serveur email
- **FormBold free tier** : 50 soumissions/mois gratuites, notifications équipe
- **EmailJS** : email de confirmation au candidat sans backend
- **Transition prévue** : Resend (Laravel) remplacera les deux quand le backend sera opérationnel

### Pourquoi deux cookies (`wwa_session` + `wwa_role`) ?

- `wwa_session` HTTP-only = inviolable côté JS, sert uniquement au middleware serveur
- `wwa_role` lisible JS = permet à la modal de détecter si l'utilisateur est déjà connecté **sans** appel serveur
- Si `wwa_role` est falsifié, le middleware rejette la requête via `wwa_session`
