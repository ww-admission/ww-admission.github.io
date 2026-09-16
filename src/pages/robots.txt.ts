import type { APIRoute } from 'astro'
import { APP_HOST, IS_PRODUCTION, SITE_ORIGIN, SPLIT_HOSTS } from '../lib/urls'

/**
 * Non prérendu : le contenu dépend de l'hôte ET de l'environnement.
 *   - hors production (staging) → tout est interdit, sur tous les hôtes
 *   - hôte du back-office       → tout est interdit
 *   - vitrine de production     → robots normal + sitemap
 */
const DISALLOW_ALL = `User-agent: *\nDisallow: /`

const SITE_ROBOTS = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /api

Sitemap: ${new URL('sitemap-index.xml', SITE_ORIGIN + '/').href}`

export const GET: APIRoute = ({ request, url }) => {
	const host = (request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
		|| request.headers.get('host')
		|| url.host).toLowerCase()

	const onAppHost = SPLIT_HOSTS && host === APP_HOST
	const body = !IS_PRODUCTION || onAppHost ? DISALLOW_ALL : SITE_ROBOTS

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=300'
		}
	})
}
