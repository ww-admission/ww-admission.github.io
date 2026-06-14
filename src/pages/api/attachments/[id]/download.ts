import type { APIRoute } from 'astro'
import { getSession, proxyStream, unauthorized } from '../../../../lib/bff'

export const GET: APIRoute = async ({ cookies, params }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()
  return proxyStream(`/attachments/${params.id}/download`, session)
}
