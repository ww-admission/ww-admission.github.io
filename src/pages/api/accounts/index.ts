import type { APIRoute } from 'astro'
import { forbidden, getSession, proxyJson, unauthorized } from '../../../lib/bff'

export const GET: APIRoute = async ({ cookies }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()
  if (session.role !== 'admin') return forbidden()
  return proxyJson('/users', session)
}
