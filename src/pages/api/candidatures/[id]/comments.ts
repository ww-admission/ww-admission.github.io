import type { APIRoute } from 'astro'
import { forbidden, getSession, proxyJson, unauthorized } from '../../../../lib/bff'

export const POST: APIRoute = async ({ cookies, params, request }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()
  if (session.role !== 'admin') return forbidden()
  let body: unknown
  try { body = await request.json() } catch { body = {} }
  return proxyJson(`/candidatures/${params.id}/comments`, session, 'POST', body)
}
