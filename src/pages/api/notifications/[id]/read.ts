import type { APIRoute } from 'astro'
import { getSession, proxyJson, unauthorized } from '../../../../lib/bff'

export const PATCH: APIRoute = async ({ cookies, params }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()
  return proxyJson(`/notifications/${params.id}/read`, session, 'PATCH')
}
