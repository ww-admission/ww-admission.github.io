// Types partagés du catalogue Universités & Formations

export type BlocType =
  | 'heading_1' | 'heading_2' | 'heading_3'
  | 'paragraph' | 'list_bullets' | 'list_numbered'
  | 'image' | 'gallery' | 'video'
  | 'link' | 'callout' | 'columns' | 'table'
  | 'quote' | 'divider'
  | 'formation_list' | 'contact_card' | 'file'

export interface Bloc {
  type: BlocType
  donnees: Record<string, unknown>
  est_visible: boolean
  largeur?: number
  enfants?: Bloc[]
}

export interface Pays {
  id: number
  nom: string
  slug: string
  drapeau: string
  region: string
  est_actif: boolean
  ordre: number
}

export interface NiveauEtude {
  id: number
  nom: string
  slug: string
  ordre: number
}

export interface Specialite {
  id: number
  nom: string
  slug: string
  categorie: string
}

export interface ContactEntite {
  id: number
  type: 'email' | 'telephone' | 'adresse' | 'referent'
  libelle: string
  valeur: string
  nom_referent?: string
  role_referent?: string
  est_visible: boolean
  ordre: number
}

export interface Universite {
  id: number
  nom: string
  slug: string
  pays: Pays
  ville: string
  adresse?: string
  site_web?: string
  type: 'publique' | 'privee' | 'grande_ecole' | 'autre'
  annee_fondation?: number
  couverture_image_url?: string
  logo_url?: string
  places_disponibles?: number
  description: string
  contenu: Bloc[]
  est_publie: boolean
  est_vedette: boolean
  meta_titre?: string
  meta_description?: string
  formations_count: number
  initiales: string
  couleur_bg: string
  contacts_entite?: ContactEntite[]
}

export interface Formation {
  id: number
  nom: string
  slug: string
  universite: Pick<Universite, 'id' | 'nom' | 'slug' | 'ville' | 'pays' | 'initiales' | 'couleur_bg'>
  niveau_etude: NiveauEtude
  specialite?: Specialite
  description_courte?: string
  duree_mois?: number
  langues_enseignement: string[]
  frais_scolarite?: number
  devise?: string
  places_disponibles?: number
  couverture_image_url?: string
  contenu: Bloc[]
  est_publie: boolean
  est_vedette: boolean
  meta_titre?: string
  meta_description?: string
  contacts_entite?: ContactEntite[]
}
