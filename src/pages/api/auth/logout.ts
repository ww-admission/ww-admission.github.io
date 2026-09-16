import type { APIRoute } from 'astro'
import { sessionCookieClearOptions, sessionCookieName } from '../../../lib/auth'
import { siteUrl } from '../../../lib/urls'

export const POST: APIRoute = ({ cookies, request }) => {
  const clearOpts = sessionCookieClearOptions()
  cookies.delete(sessionCookieName(), clearOpts)
  cookies.delete('wwa_role', clearOpts)

  // Requête fetch (XHR) : retourner 200 JSON pour que le client redirige manuellement
  const isXHR = request.headers.get('X-Requested-With') === 'fetch'
  if (isXHR) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  // Soumission de formulaire classique : retour à la vitrine
  return new Response(null, { status: 303, headers: { Location: siteUrl('/') } })
}
