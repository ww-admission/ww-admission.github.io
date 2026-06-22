import type { APIRoute } from 'astro'
import { forbidden, getSession, proxyJson, unauthorized } from '../../../lib/bff'

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()
  if (session.role !== 'admin') return forbidden()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ message: 'Corps JSON invalide.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return proxyJson('/universites', session, 'POST', body)
}
