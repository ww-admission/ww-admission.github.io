import type { APIRoute } from 'astro'
import { forbidden, getSession, proxyJson, unauthorized } from '../../../lib/bff'

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()
  if (session.role !== 'admin') return forbidden()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ message: 'Corps invalide' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return proxyJson(`/users/${params.id}`, session, 'PATCH', body)
}
