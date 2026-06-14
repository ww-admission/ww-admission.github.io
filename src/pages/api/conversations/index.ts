import type { APIRoute } from 'astro'
import { getSession, proxyJson, unauthorized } from '../../../lib/bff'

export const GET: APIRoute = async ({ cookies }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()
  return proxyJson('/conversations', session)
}
