import type { APIRoute } from 'astro'
import { createToken, sessionCookieName } from '../../../lib/auth'

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ message: 'Corps de requête invalide' }, 400)
  }

  const backendUrl = (import.meta.env.BACKEND_URL ?? 'http://localhost:8000').trim()

  let resp: Response
  try {
    resp = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error('[auth/login] backend fetch failed:', err)
    return json({ message: 'Impossible de contacter le serveur.' }, 503)
  }

  // Parser la réponse JSON — Laravel peut renvoyer du HTML sur erreur 500
  let data: Record<string, unknown>
  try {
    data = await resp.json()
  } catch {
    return json({ message: 'Réponse invalide du serveur.' }, 502)
  }

  if (!resp.ok) {
    return json(data, resp.status)
  }

  // Valider la structure de la réponse Laravel avant d'y accéder
  const user = data.user as { id?: number; email?: string; name?: string; role?: string } | undefined
  if (!user?.email || !user?.name || !user?.role || typeof data.token !== 'string') {
    return json({ message: 'Réponse du serveur inattendue.' }, 502)
  }

  const role = user.role === 'admin' ? 'admin' : 'candidate'
  const uid  = typeof user.id === 'number' ? user.id : 0

  const sessionToken = await createToken({
    sub:  user.email,
    uid,
    name: user.name,
    role,
    token: data.token,
  })

  const cookieOpts = {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  }

  cookies.set(sessionCookieName(), sessionToken, cookieOpts)
  cookies.set('wwa_role', role, { ...cookieOpts, httpOnly: false })

  return json({ role, name: user.name }, 200)
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
