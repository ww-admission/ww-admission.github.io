import type { APIRoute } from 'astro'
import { getSession, proxyJson, unauthorized } from '../../../lib/bff'

export const GET: APIRoute = async ({ cookies, request }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()
  const url  = new URL(request.url)
  const qs   = url.searchParams.toString()
  const path = session.role === 'admin'
    ? (qs ? `/community/admin?${qs}` : '/community/admin')
    : (qs ? `/community?${qs}` : '/community')
  return proxyJson(path, session)
}
