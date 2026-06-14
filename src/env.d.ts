/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL: string
  readonly JWT_SECRET: string
  readonly SUPER_ADMIN_EMAIL: string
  readonly SUPER_ADMIN_PASSWORD: string
  readonly BACKEND_URL: string | undefined
  readonly PUBLIC_BACKEND_URL: string | undefined
  readonly PUBLIC_GOOGLE_CLIENT_ID: string | undefined
  readonly GOOGLE_CLIENT_SECRET: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
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
