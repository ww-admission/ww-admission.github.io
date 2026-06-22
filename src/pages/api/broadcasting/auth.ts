import type { APIRoute } from 'astro'
import { getSession } from '../../../lib/bff'

export const POST: APIRoute = async ({ cookies, request }) => {
  const session = await getSession(cookies)
  if (!session) return new Response(JSON.stringify({ message: 'Non authentifié.' }), { status: 401 })

  const base = (process.env.BACKEND_URL ?? 'http://localhost:8000').trim()
  try {
    const body = await request.text()
    const resp = await fetch(`${base}/broadcasting/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept:         'application/json',
        Authorization:  `Bearer ${session.token}`,
      },
      body,
    })
    const text = await resp.text()
    return new Response(text, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[broadcasting/auth] backend fetch failed:', err)
    return new Response(JSON.stringify({ message: 'Serveur indisponible.' }), { status: 503 })
  }
}
