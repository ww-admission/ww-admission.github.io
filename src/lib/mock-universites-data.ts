import type { Pays, NiveauEtude, Specialite, Universite } from './catalogue-types'

export const MOCK_PAYS: Pays[] = [
  { id: 1, nom: 'Chine', slug: 'chine', drapeau: '🇨🇳', region: 'Asie', est_actif: true, ordre: 1 },
  { id: 2, nom: 'Ghana', slug: 'ghana', drapeau: '🇬🇭', region: "Afrique de l'Ouest", est_actif: true, ordre: 2 },
  { id: 3, nom: 'Russie', slug: 'russie', drapeau: '🇷🇺', region: "Europe de l'Est", est_actif: true, ordre: 3 },
]

export const MOCK_NIVEAUX_ETUDE: NiveauEtude[] = [
  { id: 1, nom: 'Licence / Bachelor', slug: 'licence', ordre: 3 },
  { id: 2, nom: 'Master', slug: 'master', ordre: 5 },
  { id: 3, nom: 'Doctorat', slug: 'doctorat', ordre: 6 },
]

export const MOCK_SPECIALITES: Specialite[] = [
  { id: 1, nom: 'Médecine générale', slug: 'medecine-generale', categorie: 'Médecine & Santé' },
  { id: 2, nom: 'Médecine dentaire', slug: 'medecine-dentaire', categorie: 'Médecine & Santé' },
  { id: 3, nom: 'Pharmacie', slug: 'pharmacie', categorie: 'Médecine & Santé' },
  { id: 4, nom: 'Génie civil', slug: 'genie-civil', categorie: 'Ingénierie & Sciences' },
  { id: 5, nom: 'Architecture', slug: 'architecture', categorie: 'Ingénierie & Sciences' },
  { id: 6, nom: 'Informatique / IA', slug: 'informatique-ia', categorie: 'Informatique & Numérique' },
  { id: 7, nom: 'Économie internationale', slug: 'economie-internationale', categorie: 'Économie & Finance' },
  { id: 8, nom: 'Management / MBA', slug: 'mba', categorie: 'Management & Commerce' },
  { id: 9, nom: 'Droit international', slug: 'droit-international', categorie: 'Droit & Sciences Juridiques' },
  { id: 10, nom: 'Psychologie', slug: 'psychologie', categorie: 'Sciences Humaines & Sociales' },
  { id: 11, nom: 'Linguistique & Traduction', slug: 'linguistique-traduction', categorie: 'Lettres & Langues' },
]

const CHINE = MOCK_PAYS[0]!
const GHANA = MOCK_PAYS[1]!
const RUSSIE = MOCK_PAYS[2]!

export const MOCK_UNIVERSITES: Universite[] = [
  {
    id: 1,
    nom: "Université de Pékin",
    slug: 'universite-pekin-pku',
    pays: CHINE,
    ville: 'Pékin',
    adresse: '5 Yiheyuan Rd, Haidian, Pékin 100871',
    site_web: 'https://www.pku.edu.cn',
    type: 'publique',
    annee_fondation: 1898,
    couverture_image_url: 'https://picsum.photos/seed/pku-beijing/900/450',
    places_disponibles: 30,
    description:
      "Fondée en 1898, l'Université de Pékin (PKU) est l'une des plus prestigieuses universités de Chine. Elle offre des programmes reconnus mondialement en médecine, sciences, droit et sciences humaines.",
    contenu: [],
    est_publie: true,
    est_vedette: true,
    formations_count: 3,
    initiales: 'PKU',
    couleur_bg: 'bg-primary-600',
  },
  {
    id: 2,
    nom: "Université Tongji",
    slug: 'universite-tongji',
    pays: CHINE,
    ville: 'Shanghai',
    adresse: '1239 Siping Rd, Yangpu, Shanghai 200092',
    site_web: 'https://www.tongji.edu.cn',
    type: 'publique',
    annee_fondation: 1907,
    couverture_image_url: 'https://picsum.photos/seed/tongji-shanghai/900/450',
    places_disponibles: 25,
    description:
      "L'Université Tongji, fondée en 1907, est mondialement reconnue pour ses formations en architecture, génie civil et ingénierie. Elle est classée parmi les meilleures universités chinoises et entretient des liens étroits avec l'industrie.",
    contenu: [],
    est_publie: true,
    est_vedette: true,
    formations_count: 2,
    initiales: 'TJU',
    couleur_bg: 'bg-primary-700',
  },
  {
    id: 3,
    nom: "Université Fudan",
    slug: 'universite-fudan',
    pays: CHINE,
    ville: 'Shanghai',
    adresse: '220 Handan Rd, Yangpu, Shanghai 200433',
    site_web: 'https://www.fudan.edu.cn',
    type: 'publique',
    annee_fondation: 1905,
    couverture_image_url: 'https://picsum.photos/seed/fudan-univ/900/450',
    places_disponibles: 20,
    description:
      "Fondée en 1905, l'Université Fudan est l'une des universités de recherche les plus réputées en Chine. Réputée en médecine et sciences fondamentales, elle figure régulièrement dans les classements mondiaux.",
    contenu: [],
    est_publie: true,
    est_vedette: false,
    formations_count: 2,
    initiales: 'FDU',
    couleur_bg: 'bg-neutral-700',
  },
  {
    id: 4,
    nom: "Université RUDN",
    slug: 'universite-rudn',
    pays: RUSSIE,
    ville: 'Moscou',
    adresse: '6 Miklukho-Maklaya St, Moscou 117198',
    site_web: 'https://www.rudn.ru',
    type: 'publique',
    annee_fondation: 1960,
    couverture_image_url: 'https://picsum.photos/seed/rudn-moscow/900/450',
    places_disponibles: 15,
    description:
      "L'Université RUDN (Université de l'Amitié des Peuples de Russie) accueille des étudiants de plus de 160 pays. Ses programmes en médecine, ingénierie et sciences humaines sont particulièrement prisés par les étudiants africains.",
    contenu: [],
    est_publie: true,
    est_vedette: false,
    formations_count: 2,
    initiales: 'RUDN',
    couleur_bg: 'bg-blue-700',
  },
  {
    id: 5,
    nom: "Université du Ghana",
    slug: 'universite-ghana',
    pays: GHANA,
    ville: 'Accra',
    adresse: 'University of Ghana, Legon, Accra',
    site_web: 'https://www.ug.edu.gh',
    type: 'publique',
    annee_fondation: 1948,
    couverture_image_url: 'https://picsum.photos/seed/ughana-accra/900/450',
    places_disponibles: 20,
    description:
      "L'Université du Ghana, fondée en 1948, est la plus grande et la plus ancienne université du pays. Elle propose des programmes en management, sciences sociales, droit et ingénierie entièrement en anglais.",
    contenu: [],
    est_publie: true,
    est_vedette: false,
    formations_count: 2,
    initiales: 'UG',
    couleur_bg: 'bg-amber-600',
  },
]
