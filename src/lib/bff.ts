import type { AstroCookies } from 'astro'
import { backendFetch, sessionCookieName, verifyToken, type Session } from './auth'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function getSession(cookies: AstroCookies): Promise<Session | null> {
  const raw = cookies.get(sessionCookieName())?.value
  if (!raw) return null
  return verifyToken(raw)
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ message: 'Non authentifié.' }), { status: 401, headers: JSON_HEADERS })
}

export function forbidden(): Response {
  return new Response(JSON.stringify({ message: 'Accès refusé.' }), { status: 403, headers: JSON_HEADERS })
}

export function unavailable(): Response {
  return new Response(JSON.stringify({ message: 'Serveur indisponible.' }), { status: 503, headers: JSON_HEADERS })
}

/** Proxy simplifié : GET/DELETE */
export async function proxyJson(
  path: string,
  session: Session,
  method = 'GET',
  body?: unknown,
): Promise<Response> {
  try {
    const resp = await backendFetch(path, session, {
      method,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const text = await resp.text()
    return new Response(text, {
      status: resp.status,
      headers: JSON_HEADERS,
    })
  } catch {
    return unavailable()
  }
}

/** Proxy multipart/form-data (upload de fichiers) - passe le FormData tel quel */
export async function proxyFormData(
  path: string,
  session: Session,
  formData: FormData,
): Promise<Response> {
  const base = import.meta.env.BACKEND_URL ?? 'http://localhost:8000'
  try {
    const resp = await fetch(`${base}/api${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: formData,
    })
    const text = await resp.text()
    return new Response(text, { status: resp.status, headers: JSON_HEADERS })
  } catch {
    return unavailable()
  }
}

/** Proxy pour les fichiers binaires (download / preview) */
export async function proxyStream(path: string, session: Session): Promise<Response> {
  const base = import.meta.env.BACKEND_URL ?? 'http://localhost:8000'
  try {
    const resp = await fetch(`${base}/api${path}`, {
      method: 'GET',
      headers: {
        Accept: '*/*',
        Authorization: `Bearer ${session.token}`,
      },
    })

    if (!resp.ok) {
      return new Response(null, { status: resp.status })
    }

    return new Response(resp.body, {
      status: resp.status,
      headers: {
        'Content-Type':        resp.headers.get('Content-Type') ?? 'application/octet-stream',
        'Content-Disposition': resp.headers.get('Content-Disposition') ?? 'inline',
        'Content-Length':      resp.headers.get('Content-Length') ?? '',
        'Cache-Control':       'no-store',
      },
    })
  } catch {
    return unavailable()
  }
}
