// Navigation Bar
// ------------
// Description: The navigation bar data for the website.
import { appLink } from '../lib/urls'

export interface Logo {
	src: string
	alt: string
	text: string
}

export interface NavSubItem {
	name: string
	link: string
}

export interface NavItem {
	name: string
	link: string
	submenu?: NavSubItem[]
	megamenu?: boolean
}

export interface NavAction {
	name: string
	link: string
	style: string
	size: string
}

export interface NavData {
	logo: Logo
	navItems: NavItem[]
	navActions: NavAction[]
}

export const navigationBarData: NavData = {
	logo: {
		src: '/logo.svg',
		alt: 'WorldWise Admission',
		text: 'WWA'
	},
	navItems: [
		{ name: 'Accueil', link: '/' },
		{ name: 'Ressources', link: '#', megamenu: true },
		{ name: 'Contact', link: '/contact' }
	],
	navActions: [
		// Le back-office vit sur app.domaine.com → lien absolu en prod, '/login' en local
		{ name: 'Se connecter', link: appLink('/login'), style: 'primary', size: 'lg' },
	]
}
