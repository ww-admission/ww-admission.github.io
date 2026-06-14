import type { APIRoute } from 'astro'
import { sessionCookieName } from '../../../lib/auth'

export const POST: APIRoute = ({ cookies, request }) => {
  cookies.delete(sessionCookieName(), { path: '/' })
  cookies.delete('wwa_role', { path: '/' })

  // Requête fetch (XHR) : retourner 200 JSON pour que le client redirige manuellement
  const isXHR = request.headers.get('X-Requested-With') === 'fetch'
  if (isXHR) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  // Soumission de formulaire classique : rediriger vers /login
  return new Response(null, { status: 303, headers: { Location: '/' } })
}
