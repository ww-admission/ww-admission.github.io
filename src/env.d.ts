/// <reference types="astro/client" />

/**
 * Deux familles de variables, à ne pas confondre :
 *
 *  - `PUBLIC_*` → lues via `import.meta.env`, FIGÉES DANS LE BUNDLE AU BUILD.
 *    Toute modification impose un rebuild (deploy/deploy.sh le fait toujours).
 *    Déclarées ici.
 *
 *  - variables serveur (secrets, URLs internes) → lues via `process.env`,
 *    résolues au RUNTIME par Node. Fournies par systemd (EnvironmentFile).
 *    Déclarées dans NodeJS.ProcessEnv ci-dessous.
 *    Ne JAMAIS les lire via `import.meta.env` : voir docs/INFRA-CHANGES.md §3.
 */
interface ImportMetaEnv {
  // ── Identité de l'environnement ──────────────────────────────────────────
  readonly PUBLIC_ENV_NAME: 'production' | 'staging' | undefined
  readonly PUBLIC_RELEASE: string | undefined   // sha court du build
  readonly PUBLIC_VERSION: string | undefined   // tag vX.Y.Z si le build vient d'une release

  // ── Hôtes publics ────────────────────────────────────────────────────────
  readonly PUBLIC_SITE_URL: string              // vitrine
  readonly PUBLIC_APP_URL: string | undefined   // back-office

  // ── Backend (valeur publique, non sensible) ──────────────────────────────
  readonly PUBLIC_BACKEND_URL: string | undefined

  // ── Reverb (WebSocket temps réel, côté navigateur) ───────────────────────
  readonly PUBLIC_REVERB_APP_KEY: string | undefined
  readonly PUBLIC_REVERB_HOST: string | undefined
  readonly PUBLIC_REVERB_PORT: string | undefined
  readonly PUBLIC_REVERB_SCHEME: string | undefined

  // ── Google OAuth (à venir) ───────────────────────────────────────────────
  readonly PUBLIC_GOOGLE_CLIENT_ID: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace NodeJS {
  interface ProcessEnv {
    JWT_SECRET?: string
    COOKIE_DOMAIN?: string
    BACKEND_URL?: string
    SUPER_ADMIN_EMAIL?: string
    SUPER_ADMIN_PASSWORD?: string
    GOOGLE_CLIENT_SECRET?: string
    HOST?: string
    PORT?: string
  }
}

// Augmentation globale d'App.Locals pour Astro middleware
// On inline le type pour éviter de transformer env.d.ts en module
declare namespace App {
  interface Locals {
    session: {
      sub: string
      uid: number
      name: string
      role: 'admin' | 'candidate'
      exp: number
      token: string
    } | null
  }
}
