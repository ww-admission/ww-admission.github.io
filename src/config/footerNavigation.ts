// Footer Navigation
// ------------
// Description: The footer navigation data for the website.
export interface Logo {
	src: string
	alt: string
	text: string
}

export interface FooterAbout {
	title: string
	aboutText: string
	logo: Logo
}

export interface SubCategory {
	subCategory: string
	subCategoryLink: string
}

export interface FooterColumn {
	category: string
	subCategories: SubCategory[]
}

export interface SubFooter {
	copywriteText: string
}

export interface FooterData {
	footerAbout: FooterAbout
	footerColumns: FooterColumn[]
	subFooter: SubFooter
}

export const footerNavigationData: FooterData = {
	footerAbout: {
		title: 'World Wise Admission',
		aboutText:
			'WWA - World Wise Admission. Votre partenaire privilégié pour optimiser votre candidature au sein des universités en Chine, au Ghana et dans bien d\'autres pays.',
		logo: {
			src: '/logo.svg',
			alt: 'Site internet WWA - World Wise Admission',
			text: 'WWA'
		}
	},
	footerColumns: [
		{
			category: 'Liens utiles',
			subCategories: [
				// {
				// 	subCategory: 'Services',
				// 	subCategoryLink: '/features'
				// },
				// {
				// 	subCategory: 'FAQ',
				// 	subCategoryLink: '/faq'
				// },
				// {
				// 	subCategory: 'Pricing',
				// 	subCategoryLink: '/pricing'
				// },
				// {
				// 	subCategory: 'process',
				// 	subCategoryLink: '/process'
				// },
				// {
				// 	subCategory: 'Terms',
				// 	subCategoryLink: '/terms'
				// }
			]
		},
		{
			category: 'About us',
			subCategories: [
				{
					subCategory: 'About us',
					subCategoryLink: '/'
				},
				// {
				// 	subCategory: 'News',
				// 	subCategoryLink: '/blog'
				// },
				// {
				// 	subCategory: 'Careers',
				// 	subCategoryLink: '/blog'
				// }
			]
		},
		{
			category: 'Get in touch',
			subCategories: [
				{
					subCategory: 'Contact',
					subCategoryLink: '/contact'
				},
				{
					subCategory: 'Support',
					subCategoryLink: '/contact'
				},
				{
					subCategory: 'Join us',
					subCategoryLink: '/contact'
				}
			]
		}
	],
	subFooter: {
		copywriteText: '© WWA 2025.'
	}
}
