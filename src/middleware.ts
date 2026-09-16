import { defineMiddleware } from 'astro:middleware'
import { verifyToken, sessionCookieName } from './lib/auth'
import {
  APP_HOST,
  ENV_NAME,
  IS_PRODUCTION,
  SPLIT_HOSTS,
  appUrl,
  isAppOnlyPath,
  isSharedPath,
  siteUrl,
} from './lib/urls'

const ADMIN_PREFIX = '/admin'
const CANDIDATE_PREFIX = '/dashboard'

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

const NOINDEX = 'noindex, nofollow'

/**
 * Hôte réel de la requête. Derrière nginx, `Host` est conservé tel quel
 * (proxy_set_header Host $host) ; x-forwarded-host est lu en priorité si présent.
 */
function requestHost(request: Request, url: URL): string {
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  return (forwarded || request.headers.get('host') || url.host).toLowerCase()
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url)
  const { pathname, search } = url
  const onAppHost = SPLIT_HOSTS && requestHost(context.request, url) === APP_HOST

  const needsAdmin = pathname === ADMIN_PREFIX || pathname.startsWith(ADMIN_PREFIX + '/')
  const needsAuth = pathname === CANDIDATE_PREFIX || pathname.startsWith(CANDIDATE_PREFIX + '/')

  // La vérification HMAC n'a lieu que si la session est réellement nécessaire
  const needsSession = needsAdmin || needsAuth || (onAppHost && pathname === '/')
  const rawToken = needsSession ? context.cookies.get(sessionCookieName())?.value : undefined
  const session = rawToken ? await verifyToken(rawToken) : null

  // ── Routage par hôte (prod et staging) ───────────────────────────────────
  // Ne s'applique qu'aux routes rendues à la demande. Les pages prérendues
  // (/, /contact, /faq, /blog/*…) ne passent pas par le middleware au runtime :
  // c'est nginx (deploy/nginx/wwa-app.conf, wwa-dev-app.conf) qui les redirige.
  if (SPLIT_HOSTS) {
    if (onAppHost) {
      // La racine du back-office n'affiche pas la vitrine : on oriente l'utilisateur
      if (pathname === '/') {
        const dest = session ? (session.role === 'admin' ? '/admin' : '/dashboard') : '/login'
        return context.redirect(dest, 302)
      }
      // Le back-office ne duplique pas les pages publiques (contenu + SEO)
      if (!isAppOnlyPath(pathname) && !isSharedPath(pathname)) {
        return context.redirect(siteUrl(pathname + search), 302)
      }
    } else if (isAppOnlyPath(pathname)) {
      // /login, /register, /admin/*, /dashboard/* vivent sur l'hôte app.
      return context.redirect(appUrl(pathname + search), 302)
    }
  }

  const applyHeaders = (response: Response): Response => {
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v))
    // Le back-office n'est jamais indexable ; hors production, RIEN ne l'est.
    if (onAppHost || !IS_PRODUCTION) response.headers.set('X-Robots-Tag', NOINDEX)
    if (!IS_PRODUCTION) response.headers.set('X-WWA-Env', ENV_NAME)
    return response
  }

  if (!needsAdmin && !needsAuth) {
    context.locals.session = null
    return applyHeaders(await next())
  }

  if (!session) {
    return context.redirect('/login?redirect=' + encodeURIComponent(pathname), 302)
  }

  if (needsAdmin && session.role !== 'admin') {
    return context.redirect('/dashboard', 302)
  }

  context.locals.session = session
  return applyHeaders(await next())
})
