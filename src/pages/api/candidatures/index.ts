import type { APIRoute } from 'astro'
import { forbidden, getSession, proxyFormData, proxyJson, unauthorized } from '../../../lib/bff'

export const GET: APIRoute = async ({ cookies, request }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()
  const url  = new URL(request.url)
  const qs   = url.searchParams.toString()
  const path = qs ? `/candidatures?${qs}` : '/candidatures'
  return proxyJson(path, session)
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()

  const ct = request.headers.get('Content-Type') ?? ''

  // FormData (multipart) - envoi depuis ApplicationForm avec pièces jointes
  if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return new Response(JSON.stringify({ message: 'Corps invalide' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return proxyFormData('/candidatures', session, formData)
  }

  // JSON - envoi depuis syncUnsynced() du dashboard (texte seulement, pas de fichiers)
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ message: 'Corps invalide' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return proxyJson('/candidatures', session, 'POST', body)
}
