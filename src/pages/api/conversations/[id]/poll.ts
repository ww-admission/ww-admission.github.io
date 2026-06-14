import type { APIRoute } from 'astro'
import { getSession, unauthorized } from '../../../../lib/bff'
import { backendFetch } from '../../../../lib/auth'

export const GET: APIRoute = async ({ cookies, params, url }) => {
  const session = await getSession(cookies)
  if (!session) return unauthorized()
  const since = url.searchParams.get('since') ?? ''
  const path  = `/conversations/${params.id}/poll${since ? `?since=${encodeURIComponent(since)}` : ''}`
  try {
    const resp = await backendFetch(path, session)
    const text = await resp.text()
    return new Response(text, { status: resp.status, headers: { 'Content-Type': 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ newMessages: [], unreadCount: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
}
