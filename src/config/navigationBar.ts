// Navigation Bar
// ------------
// Description: The navigation bar data for the website.
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
		alt: 'The tailwind astro theme',
		text: 'WWA'
	},
	navItems: [
		{ name: 'Acceuil', link: '/' },
		// { name: 'Tarifs', link: '/pricing' },
		{ name: 'Notre service', link: '/features' },
		{
			name: 'Resources',
			link: '#',
			submenu: [
				// { name: 'Blog', link: '/blog' },
				{ name: 'Process', link: '/process' },
				// { name: 'FAQ', link: '/faq' },
				// { name: 'Terms', link: '/terms' }
			]
		},
		{ name: 'Contact', link: '/contact' }
	],
	navActions: [{ name: 'Se connecter', link: '/', style: 'primary', size: 'lg' }]
}
