import type { APIRoute } from 'astro'
import { ENV_NAME, RELEASE, VERSION } from '../lib/urls'

export const prerender = false

/**
 * Sonde de santé du process Node. Utilisée par deploy/deploy.sh après chaque
 * déploiement et par les workflows GitHub Actions pour confirmer que la bonne
 * release est bien en ligne avant de déclarer le déploiement réussi.
 */
export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      env: ENV_NAME,
      version: VERSION || null,
      release: RELEASE || null,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    },
  )
}
