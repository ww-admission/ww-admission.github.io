import type { APIRoute } from 'astro'
import { unavailable } from '../../lib/bff'

export const POST: APIRoute = async ({ request }) => {
  let body: unknown
  try { body = await request.json() } catch {
    return new Response(JSON.stringify({ message: 'Corps invalide.' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const base = (process.env.BACKEND_URL ?? 'http://localhost:8000').trim()
  try {
    const resp = await fetch(`${base}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    })
    const text = await resp.text()
    return new Response(text, { status: resp.status, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[api/contact] backend fetch failed:', err)
    return unavailable()
  }
}
