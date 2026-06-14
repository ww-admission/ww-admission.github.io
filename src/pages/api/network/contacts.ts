import type { APIRoute } from 'astro'
import { forbidden, getSession, proxyJson, unauthorized } from '../../../lib/bff'

export const GET: APIRoute = async ({ cookies, request }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()
  const url = new URL(request.url)
  const qs  = url.searchParams.toString()
  const path = session.role === 'admin'
    ? (qs ? `/network/contacts?${qs}` : '/network/contacts')
    : '/network/contacts'
  return proxyJson(path, session)
}

export const POST: APIRoute = async ({ cookies, request }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()
  if (session.role !== 'admin') return forbidden()
  let body: Record<string, unknown>
  try { body = await request.json() } catch {
    return new Response(JSON.stringify({ message: 'Corps invalide' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }
  return proxyJson('/network/contacts', session, 'POST', body)
}
