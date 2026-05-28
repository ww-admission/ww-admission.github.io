// ============================================================
// PROGRAMMES UNIVERSITAIRES — WWA
// Programmes proposés dans les universités partenaires en Chine.
// Modifiable sans toucher au code des composants.
// ============================================================

export interface Programme {
  value: string       // identifiant unique (snake_case, sans accents)
  label: string       // nom affiché dans le dropdown
  domain: string      // catégorie parente (pour le <optgroup>)
  faculties: string[] // facultés disponibles pour ce programme
}

// ─── Liste des programmes ─────────────────────────────────────
// Pour ajouter un programme : ajoutez un objet Programme dans ce tableau.
// Pour modifier les facultés : modifiez le tableau faculties du programme.
export const PROGRAMMES: Programme[] = [

  // ═══ Médecine & Santé ═══
  {
    value: 'medecine_clinique',
    label: 'Médecine Clinique (MBBS)',
    domain: 'Médecine & Santé',
    faculties: [
      'Faculté de Médecine',
      'École de Médecine Clinique',
      'École des Sciences Médicales et de Santé Publique',
    ],
  },
  {
    value: 'medecine_traditionnelle_chinoise',
    label: 'Médecine Traditionnelle Chinoise (MTC)',
    domain: 'Médecine & Santé',
    faculties: [
      'Faculté de Médecine Traditionnelle Chinoise',
      'Institut de Médecine Intégrative',
    ],
  },
  {
    value: 'pharmacie',
    label: 'Pharmacie',
    domain: 'Médecine & Santé',
    faculties: [
      'École de Pharmacie',
      'Faculté des Sciences Pharmaceutiques',
    ],
  },
  {
    value: 'stomatologie',
    label: 'Stomatologie / Chirurgie Dentaire',
    domain: 'Médecine & Santé',
    faculties: [
      'École de Stomatologie',
      'Faculté de Médecine Dentaire',
    ],
  },
  {
    value: 'soins_infirmiers',
    label: 'Soins Infirmiers',
    domain: 'Médecine & Santé',
    faculties: [
      'École des Sciences Infirmières',
      'Faculté des Métiers de la Santé',
    ],
  },
  {
    value: 'sante_publique',
    label: 'Santé Publique & Épidémiologie',
    domain: 'Médecine & Santé',
    faculties: [
      'École de Santé Publique',
      'Faculté de Médecine Préventive',
    ],
  },
  {
    value: 'biologie_medicale',
    label: 'Biologie Médicale & Laboratoire',
    domain: 'Médecine & Santé',
    faculties: [
      'Faculté de Biologie',
      'École des Sciences de la Vie',
    ],
  },

  // ═══ Ingénierie & Sciences ═══
  {
    value: 'genie_civil',
    label: 'Génie Civil & Construction',
    domain: 'Ingénierie & Sciences',
    faculties: [
      'Faculté de Génie Civil',
      'École d\'Ingénierie et d\'Architecture',
      'Institut de Technologie du Bâtiment',
    ],
  },
  {
    value: 'genie_mecanique',
    label: 'Génie Mécanique',
    domain: 'Ingénierie & Sciences',
    faculties: [
      'Faculté de Génie Mécanique',
      'École Polytechnique',
      'Institut d\'Ingénierie Mécanique et Industrielle',
    ],
  },
  {
    value: 'genie_electrique',
    label: 'Génie Électrique & Automatisation',
    domain: 'Ingénierie & Sciences',
    faculties: [
      'Faculté de Génie Électrique',
      'École d\'Ingénierie Électronique et d\'Information',
      'Institut des Technologies de l\'Énergie',
    ],
  },
  {
    value: 'informatique',
    label: 'Informatique & Science des Données',
    domain: 'Ingénierie & Sciences',
    faculties: [
      'École d\'Informatique et de Technologie de l\'Information',
      'Faculté des Sciences et du Génie Informatique',
      'Institut d\'Intelligence Artificielle',
    ],
  },
  {
    value: 'genie_chimique',
    label: 'Génie Chimique & Chimie Industrielle',
    domain: 'Ingénierie & Sciences',
    faculties: [
      'Faculté de Génie Chimique',
      'École des Sciences et du Génie Chimique',
    ],
  },
  {
    value: 'genie_environnemental',
    label: 'Génie Environnemental',
    domain: 'Ingénierie & Sciences',
    faculties: [
      'Faculté d\'Ingénierie Environnementale',
      'École des Sciences de l\'Environnement et de l\'Énergie',
    ],
  },
  {
    value: 'genie_petrolier',
    label: 'Génie Pétrolier & Minier',
    domain: 'Ingénierie & Sciences',
    faculties: [
      'Faculté de Génie Pétrolier',
      'École des Géosciences et des Ressources Naturelles',
    ],
  },
  {
    value: 'architecture',
    label: 'Architecture & Urbanisme',
    domain: 'Ingénierie & Sciences',
    faculties: [
      'Faculté d\'Architecture',
      'École d\'Architecture et d\'Urbanisme',
      'Institut des Arts et du Design Architectural',
    ],
  },
  {
    value: 'mathematiques',
    label: 'Mathématiques & Statistiques',
    domain: 'Ingénierie & Sciences',
    faculties: [
      'Faculté des Sciences',
      'Faculté de Mathématiques et Statistiques',
    ],
  },

  // ═══ Économie & Gestion ═══
  {
    value: 'administration_affaires',
    label: 'Administration des Affaires (MBA / BBA)',
    domain: 'Économie & Gestion',
    faculties: [
      'École de Gestion',
      'École de Commerce International',
      'Institut d\'Administration des Affaires',
    ],
  },
  {
    value: 'commerce_international',
    label: 'Commerce International & Économie',
    domain: 'Économie & Gestion',
    faculties: [
      'École d\'Économie et de Commerce International',
      'Faculté des Sciences Économiques',
    ],
  },
  {
    value: 'finance_comptabilite',
    label: 'Finance & Comptabilité',
    domain: 'Économie & Gestion',
    faculties: [
      'École de Finance et de Comptabilité',
      'Faculté d\'Économie',
      'Institut de Finance et d\'Économie',
    ],
  },
  {
    value: 'marketing_management',
    label: 'Marketing & Management',
    domain: 'Économie & Gestion',
    faculties: [
      'École de Gestion',
      'Institut de Marketing et de Commerce',
    ],
  },
  {
    value: 'logistique',
    label: 'Logistique & Supply Chain Management',
    domain: 'Économie & Gestion',
    faculties: [
      'École de Gestion',
      'Institut de Logistique et de Commerce International',
    ],
  },

  // ═══ Langues & Communication ═══
  {
    value: 'langue_chinoise',
    label: 'Langue et Littérature Chinoises (Mandarin)',
    domain: 'Langues & Communication',
    faculties: [
      'École des Langues Étrangères',
      'Institut de Langue et Culture Chinoises',
      'Faculté de Lettres et Langues Étrangères',
    ],
  },
  {
    value: 'traduction_interpretation',
    label: 'Traduction & Interprétation (Chinois-Français)',
    domain: 'Langues & Communication',
    faculties: [
      'École de Traduction et d\'Interprétation',
      'Faculté des Langues Étrangères',
    ],
  },
  {
    value: 'journalisme_communication',
    label: 'Journalisme & Communication Internationale',
    domain: 'Langues & Communication',
    faculties: [
      'École de Journalisme et de Communication',
      'Faculté des Arts et des Médias',
    ],
  },
  {
    value: 'relations_internationales',
    label: 'Relations Internationales & Diplomatie',
    domain: 'Langues & Communication',
    faculties: [
      'Faculté des Relations Internationales',
      'École des Sciences Politiques et Droit International',
    ],
  },

  // ═══ Arts & Design ═══
  {
    value: 'beaux_arts',
    label: 'Beaux-Arts & Arts Plastiques',
    domain: 'Arts & Design',
    faculties: [
      'Académie des Beaux-Arts',
      'École d\'Art et de Design',
    ],
  },
  {
    value: 'design',
    label: 'Design (Graphique, Produit, Mode)',
    domain: 'Arts & Design',
    faculties: [
      'École d\'Art et de Design',
      'Institut du Design et des Arts Créatifs',
    ],
  },
  {
    value: 'musique',
    label: 'Musique & Arts du Spectacle',
    domain: 'Arts & Design',
    faculties: [
      'Conservatoire / Faculté de Musique',
      'École des Arts du Spectacle',
    ],
  },
  {
    value: 'cinema_medias',
    label: 'Cinéma, Médias & Arts Numériques',
    domain: 'Arts & Design',
    faculties: [
      'Académie des Arts du Film',
      'École de Cinéma et de Médias Numériques',
    ],
  },

  // ═══ Agriculture & Environnement ═══
  {
    value: 'agronomie',
    label: 'Agronomie & Sciences Agricoles',
    domain: 'Agriculture & Environnement',
    faculties: [
      'Faculté d\'Agronomie',
      'École des Sciences Agronomiques et Forestières',
    ],
  },
  {
    value: 'veterinaire',
    label: 'Médecine Vétérinaire & Élevage',
    domain: 'Agriculture & Environnement',
    faculties: [
      'Faculté de Médecine Vétérinaire',
      'École des Sciences Animales',
    ],
  },
  {
    value: 'sciences_environnement',
    label: 'Sciences de l\'Environnement & Développement Durable',
    domain: 'Agriculture & Environnement',
    faculties: [
      'Faculté des Sciences de l\'Environnement',
      'Institut des Ressources Naturelles et de l\'Environnement',
    ],
  },

  // ═══ Tourisme & Hôtellerie ═══
  {
    value: 'tourisme_hotellerie',
    label: 'Tourisme & Hôtellerie Internationale',
    domain: 'Tourisme & Hôtellerie',
    faculties: [
      'École de Tourisme et d\'Hôtellerie',
      'Institut de Gestion des Arts et du Tourisme',
    ],
  },
]

// ─── Utilitaires ─────────────────────────────────────────────

// Retourne les programmes groupés par domaine (pour <optgroup>)
export function getProgrammesByDomain(): Record<string, Programme[]> {
  return PROGRAMMES.reduce((acc, prog) => {
    if (!acc[prog.domain]) acc[prog.domain] = []
    acc[prog.domain].push(prog)
    return acc
  }, {} as Record<string, Programme[]>)
}

// Retourne les facultés d'un programme donné (pour le dropdown conditionnel)
export function getFacultiesByProgramme(value: string): string[] {
  return PROGRAMMES.find(p => p.value === value)?.faculties ?? []
}
