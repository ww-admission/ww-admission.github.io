import type { APIRoute } from 'astro'
import { getSession, proxyFormData, proxyJson, unauthorized } from '../../../../lib/bff'

export const GET: APIRoute = async ({ cookies, params }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()
  return proxyJson(`/conversations/${params.id}/messages`, session)
}

export const POST: APIRoute = async ({ cookies, params, request }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()

  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    return proxyFormData(`/conversations/${params.id}/messages`, session, formData)
  }

  let body: unknown
  try { body = await request.json() } catch { body = {} }
  return proxyJson(`/conversations/${params.id}/messages`, session, 'POST', body)
}
