export interface Session {
  sub: string              // email
  name: string
  role: 'admin' | 'candidate'
  exp: number              // unix timestamp (seconds)
  token: string            // Sanctum token pour appels API Laravel
}

const COOKIE_NAME = 'wwa_session'
const TTL_SECONDS = 7 * 24 * 3600  // 7 jours

function toB64url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromB64url(input: string): string {
  return atob(input.replace(/-/g, '+').replace(/_/g, '/'))
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return toB64url(String.fromCharCode(...new Uint8Array(sig)))
}

function getSecret(): string {
  const secret = import.meta.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set in environment variables')
  return secret
}

export async function createToken(payload: Omit<Session, 'exp'>): Promise<string> {
  const session: Session = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  }
  const data = toB64url(JSON.stringify(session))
  const sig = await hmacSign(data, getSecret())
  return `${data}.${sig}`
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const dotIdx = token.lastIndexOf('.')
    if (dotIdx === -1) return null
    const data = token.slice(0, dotIdx)
    const sig = token.slice(dotIdx + 1)
    const expected = await hmacSign(data, getSecret())
    if (sig !== expected) return null
    const session = JSON.parse(fromB64url(data)) as Session
    if (session.exp < Math.floor(Date.now() / 1000)) return null
    return session
  } catch {
    return null
  }
}

export function sessionCookieName(): string {
  return COOKIE_NAME
}

export function makeSetCookieHeader(token: string): string {
  const secure = import.meta.env.PUBLIC_SITE_URL?.startsWith('https') ? '; Secure' : ''
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${TTL_SECONDS}${secure}`
}

export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`
}

// Helper pour appels serveur Astro → Laravel
export function backendFetch(path: string, session: Session | null, init?: RequestInit): Promise<Response> {
  const base = import.meta.env.BACKEND_URL ?? 'http://localhost:8000'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(init?.headers as Record<string, string> ?? {}),
  }
  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`
  }
  return fetch(`${base}/api${path}`, { ...init, headers })
}
