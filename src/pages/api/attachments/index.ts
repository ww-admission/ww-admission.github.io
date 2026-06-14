import type { APIRoute } from 'astro'
import { getSession, proxyFormData, unauthorized } from '../../../lib/bff'

export const POST: APIRoute = async ({ cookies, request }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return new Response(JSON.stringify({ message: 'Données invalides.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return proxyFormData('/attachments', session, formData)
}
