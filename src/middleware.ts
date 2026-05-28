import { defineMiddleware } from 'astro:middleware'
import { verifyToken, sessionCookieName } from './lib/auth'

const ADMIN_PREFIX = '/admin'
const CANDIDATE_PREFIX = '/dashboard'

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = new URL(context.request.url)

  const needsAdmin = pathname === ADMIN_PREFIX || pathname.startsWith(ADMIN_PREFIX + '/')
  const needsAuth = pathname === CANDIDATE_PREFIX || pathname.startsWith(CANDIDATE_PREFIX + '/')

  if (!needsAdmin && !needsAuth) {
    context.locals.session = null
    return next()
  }

  const rawToken = context.cookies.get(sessionCookieName())?.value
  const session = rawToken ? await verifyToken(rawToken) : null

  if (!session) {
    const redirectUrl = '/login?redirect=' + encodeURIComponent(pathname)
    return context.redirect(redirectUrl)
  }

  if (needsAdmin && session.role !== 'admin') {
    return context.redirect('/dashboard')
  }

  context.locals.session = session
  return next()
})
