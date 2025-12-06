// Config
// ------------
// Description: The configuration file for the website.

export interface Logo {
	src: string
	alt: string
}

export type Mode = 'light' | 'auto' | 'dark'

export interface Config {
	siteTitle: string
	siteDescription: string
	ogImage: string
	logo: Logo
	canonical: boolean
	noindex: boolean
	mode: Mode
	scrollAnimations: boolean
}

export const configData: Config = {
	siteTitle: 'WWA | World Wise Admission',
	siteDescription:
		"World Wise Admission vous accompagne dans vos démarches pour étudier à l’étranger. Augmentez vos chances d'admission au sein de l'université qui vous convient en Chine, au Ghana, en Russie et dans bien d'autres destinations académiques.",
	ogImage: '/og.jpg',
	logo: {
		src: '/logo.svg',
		alt: 'wwa. logo'
	},
	canonical: true,
	noindex: false,
	mode: 'light',
	scrollAnimations: true
}
