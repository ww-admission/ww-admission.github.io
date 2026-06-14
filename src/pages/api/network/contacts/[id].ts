import type { APIRoute } from 'astro'
import { forbidden, getSession, proxyJson, unauthorized } from '../../../../lib/bff'

export const GET: APIRoute = async ({ cookies, params }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()
  return proxyJson(`/network/contacts/${params.id}`, session)
}

export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()
  if (session.role !== 'admin') return forbidden()
  let body: Record<string, unknown>
  try { body = await request.json() } catch {
    return new Response(JSON.stringify({ message: 'Corps invalide' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }
  return proxyJson(`/network/contacts/${params.id}`, session, 'PATCH', body)
}

export const DELETE: APIRoute = async ({ cookies, params }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()
  if (session.role !== 'admin') return forbidden()
  return proxyJson(`/network/contacts/${params.id}`, session, 'DELETE')
}
