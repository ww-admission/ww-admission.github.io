/**
 * Origines publiques et identité de l'environnement.
 *
 * Deux hôtes servis par le MÊME process Astro (Node standalone derrière nginx) :
 *   - PUBLIC_SITE_URL → vitrine     (ex. https://worldwise-admission.com)
 *   - PUBLIC_APP_URL  → back-office (ex. https://app.worldwise-admission.com)
 *
 * En staging, ces deux valeurs pointent sous `dev.` :
 *   - https://dev.worldwise-admission.com
 *   - https://app.dev.worldwise-admission.com
 *
 * INVARIANT (validé par deploy/deploy.sh) : l'hôte de PUBLIC_APP_URL doit être un
 * sous-domaine de celui de PUBLIC_SITE_URL, et COOKIE_DOMAIN doit valoir exactement
 * l'hôte de PUBLIC_SITE_URL. C'est ce qui garantit qu'une session de test ne peut
 * jamais écraser une session de production.
 *
 * Ce module est importé par du code CLIENT (DashboardLayout) : uniquement des
 * variables PUBLIC_* via import.meta.env, jamais process.env (inexistant côté
 * navigateur), jamais de secret.
 */

export type EnvName = 'production' | 'staging' | 'local'

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function hostOf(origin: string): string {
  try {
    return new URL(origin).host.toLowerCase()
  } catch {
    return ''
  }
}

const rawEnv = (import.meta.env.PUBLIC_ENV_NAME || '').trim().toLowerCase()

export const ENV_NAME: EnvName =
  rawEnv === 'production' ? 'production' : rawEnv === 'staging' ? 'staging' : 'local'

export const IS_PRODUCTION = ENV_NAME === 'production'
export const IS_STAGING = ENV_NAME === 'staging'

/** Référence du build (sha court), injectée par deploy/deploy.sh */
export const RELEASE = (import.meta.env.PUBLIC_RELEASE || '').trim()

const rawSite = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321'
const rawApp = import.meta.env.PUBLIC_APP_URL || rawSite

export const SITE_ORIGIN = normalizeOrigin(rawSite)
export const APP_ORIGIN = normalizeOrigin(rawApp)

export const SITE_HOST = hostOf(SITE_ORIGIN)
export const APP_HOST = hostOf(APP_ORIGIN)

/** true uniquement quand vitrine et back-office sont sur deux hôtes distincts */
export const SPLIT_HOSTS = SITE_HOST !== '' && APP_HOST !== '' && SITE_HOST !== APP_HOST

/** Chemins qui n'existent QUE sur l'hôte du back-office */
export const APP_ONLY_PREFIXES = ['/admin', '/dashboard', '/login', '/register'] as const

/** Chemins servis indifféremment par les deux hôtes : API same-origin, assets, WebSocket */
const SHARED_EXACT = new Set(['/api', '/robots.txt', '/favicon.svg', '/health'])
const SHARED_PREFIXES = ['/api/', '/_astro/', '/_image', '/_server-islands', '/app/']

export function isAppOnlyPath(pathname: string): boolean {
  return APP_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export function isSharedPath(pathname: string): boolean {
  if (SHARED_EXACT.has(pathname)) return true
  if (SHARED_PREFIXES.some((p) => pathname.startsWith(p))) return true
  // Tout fichier avec extension est un asset statique → servi par les deux hôtes
  return /\.[a-z0-9]+$/i.test(pathname)
}

export function appUrl(pathname = '/'): string {
  return APP_ORIGIN + (pathname.startsWith('/') ? pathname : '/' + pathname)
}

export function siteUrl(pathname = '/'): string {
  return SITE_ORIGIN + (pathname.startsWith('/') ? pathname : '/' + pathname)
}

/**
 * Lien à poser dans le HTML vers le back-office : absolu quand les deux hôtes
 * sont distincts (prod/staging), relatif sinon (local, un seul hôte).
 */
export function appLink(pathname = '/'): string {
  return SPLIT_HOSTS ? appUrl(pathname) : pathname
}
