// ============================================================
// CONFIGURATION DU FORMULAIRE DE CANDIDATURE — WWA
// Modifiable sans toucher au code des composants.
// Chaque section est commentée pour faciliter les modifications.
// ============================================================

// ─── Niveaux d'étude ─────────────────────────────────────────
// Modifiez cette liste pour ajouter ou supprimer des niveaux.
export const NIVEAUX_ETUDE = [
  { value: 'sans_diplome',  label: 'Sans diplôme' },
  { value: 'cep',           label: 'CEP — Certificat d\'Études Primaires' },
  { value: 'bepc',          label: 'BEPC — Brevet d\'Études du Premier Cycle' },
  { value: 'bac',           label: 'BAC — Baccalauréat' },
  { value: 'bac1',          label: 'BAC+1' },
  { value: 'bac2',          label: 'BAC+2 / BTS — Brevet de Technicien Supérieur' },
  { value: 'bac3',          label: 'BAC+3 / Licence / Bachelor' },
  { value: 'bac4',          label: 'BAC+4 / Maîtrise' },
  { value: 'bac5',          label: 'BAC+5 / Master / DEA / DESS' },
  { value: 'bac6plus',      label: 'BAC+6 et plus / Doctorat / PhD' },
  { value: 'autre',         label: 'Autre' },
] as const

// ─── Spécialités groupées par catégorie ──────────────────────
// Pour ajouter une spécialité : ajoutez-la dans le tableau items de sa catégorie.
// Pour ajouter une catégorie : ajoutez un objet { category, items: [] }.
export const SPECIALITES: { category: string; items: string[] }[] = [
  {
    category: 'Droit & Sciences Juridiques',
    items: [
      'Droit privé', 'Droit public', 'Droit des affaires', 'Droit international',
      'Juriste d\'entreprise', 'Droit notarial', 'Droit pénal', 'Droit fiscal',
      'Droit du travail', 'Droit de la famille',
    ],
  },
  {
    category: 'Management & Commerce',
    items: [
      'Management des unités commerciales', 'Commerce international', 'Marketing',
      'Gestion commerciale', 'Management de projet', 'Entrepreneuriat',
      'Logistique & Supply Chain', 'Commerce électronique', 'Négociation commerciale',
      'Gestion de la relation client',
    ],
  },
  {
    category: 'Économie & Finance',
    items: [
      'Économie générale', 'Finance d\'entreprise', 'Comptabilité & Gestion',
      'Banque & Assurance', 'Audit & Contrôle de gestion', 'Fiscalité',
      'Marchés financiers', 'Gestion de patrimoine', 'Microéconomie', 'Macroéconomie',
    ],
  },
  {
    category: 'Informatique & Numérique',
    items: [
      'Développement web', 'Développement mobile', 'Réseaux & Télécommunications',
      'Cybersécurité', 'Data Science & Big Data', 'Intelligence artificielle',
      'Systèmes embarqués', 'Cloud Computing', 'Génie logiciel',
      'Administration systèmes & réseaux',
    ],
  },
  {
    category: 'Médecine & Santé',
    items: [
      'Médecine générale', 'Pharmacie', 'Chirurgie dentaire / Stomatologie',
      'Soins infirmiers', 'Sage-femme', 'Kinésithérapie', 'Biologie médicale',
      'Santé publique', 'Nutrition & Diététique', 'Médecine traditionnelle',
    ],
  },
  {
    category: 'Ingénierie & Sciences',
    items: [
      'Génie civil', 'Génie mécanique', 'Génie électrique', 'Architecture', 'Chimie',
      'Physique', 'Mathématiques', 'Génie industriel', 'Génie pétrolier & minier',
      'Sciences de la Terre', 'Génie des matériaux', 'Génie environnemental',
    ],
  },
  {
    category: 'Sciences Humaines & Sociales',
    items: [
      'Psychologie', 'Sociologie', 'Histoire-Géographie', 'Philosophie',
      'Sciences de l\'éducation', 'Anthropologie', 'Science politique',
      'Relations internationales',
    ],
  },
  {
    category: 'Langues & Communication',
    items: [
      'Lettres modernes', 'Langues étrangères appliquées', 'Communication & Journalisme',
      'Relations publiques', 'Traduction & Interprétation', 'Chinois (Mandarin)',
      'Anglais', 'Espagnol',
    ],
  },
  {
    category: 'Agriculture & Environnement',
    items: [
      'Agronomie', 'Sciences de l\'environnement', 'Foresterie', 'Élevage & Vétérinaire',
      'Aquaculture & Pêche', 'Génie rural', 'Développement rural',
    ],
  },
  {
    category: 'Arts & Culture',
    items: [
      'Arts plastiques', 'Musique', 'Cinéma & Audiovisuel', 'Design graphique',
      'Mode & Textile', 'Architecture d\'intérieur', 'Animation & Multimédia',
    ],
  },
  {
    category: 'Tourisme & Hôtellerie',
    items: [
      'Management hôtelier', 'Tourisme international', 'Restauration & Cuisine',
      'Événementiel',
    ],
  },
]

// ─── Établissements gabonais de référence ─────────────────────
// Liste initiale pour les suggestions d'autocomplétion.
// Ajoutez des établissements ici pour enrichir les suggestions.
export const ETABLISSEMENTS_GABON: string[] = [
  // Universités publiques
  'Université Omar Bongo (UOB) — Libreville',
  'Université des Sciences de la Santé (USS) — Libreville',
  'Université des Sciences et Techniques de Masuku (USTM) — Franceville',
  'Université de l\'École Normale Supérieure (ENS) — Libreville',
  // Grandes écoles & instituts publics
  'École Nationale Supérieure Polytechnique (ENSP) — Libreville',
  'Institut National des Sciences de Gestion (INSG) — Libreville',
  'Institut Supérieur de Technologie du Gabon (ISTG) — Libreville',
  'École Nationale d\'Administration (ENA) — Libreville',
  'Institut National de la Poste et des TIC (INPTIC) — Libreville',
  'École Nationale des Eaux et Forêts (ENEF) — Cap-Esterias',
  'École Supérieure de la Magistrature — Libreville',
  'Institut Africain d\'Informatique (IAI) — Libreville',
  // Établissements privés supérieurs
  'Institut Supérieur de Management (ISM) — Libreville',
  'École Supérieure de Gestion et de Technologie (ESGT) — Libreville',
  'PIGIER Gabon — Libreville',
  'HEC Gabon — Libreville',
  'INTEC Gabon — Libreville',
  'Institut Supérieur de Technologie Avancée (ISTA) — Libreville',
  'École des Formations des Emplois de Banque (EFEB) — Libreville',
  'Pôle Numérique Libreville',
  'Centre Universitaire des Sciences de la Santé (CUSS) — Libreville',
  // Lycées d'enseignement général
  'Lycée National Léon Mba — Libreville',
  'Lycée Paul Indjendjet Gondjout — Libreville',
  'Lycée de l\'ESDE — Libreville',
  'Lycée Technique National Omar Bongo — Libreville',
  'Lycée Joseph Ambourouet Avaro — Libreville',
  'Lycée Bessieux — Libreville',
  'Lycée André Gustave Anguile — Port-Gentil',
  'Lycée Technique de Port-Gentil',
  'Lycée Léon Mba — Oyem',
  // Établissements catholiques & privés
  'Collège Immaculée Conception — Libreville',
  'Lycée Notre-Dame des Trois-Épis — Libreville',
  'Lycée Saint-Exupéry — Libreville',
  'Collège La Salle — Libreville',
]

// ─── Documents à joindre à la candidature ────────────────────
// required: true = document obligatoire (bloque la soumission si absent).
// Modifiez accept et maxMo pour changer les restrictions de fichier.
export const DOCUMENTS_REQUIS = [
  {
    id: 'diplome',
    label: 'Copie du diplôme précédent',
    description: 'Baccalauréat ou dernier diplôme obtenu',
    accept: '.pdf,.jpg,.jpeg,.png',
    maxMo: 5,
    required: true,
  },
  {
    id: 'releve_notes',
    label: 'Relevé de notes',
    description: 'Relevé de la dernière année d\'études',
    accept: '.pdf,.jpg,.jpeg,.png',
    maxMo: 5,
    required: true,
  },
  {
    id: 'piece_identite',
    label: 'Pièce d\'identité nationale',
    description: 'CNI, passeport ou titre de séjour en cours de validité',
    accept: '.pdf,.jpg,.jpeg,.png',
    maxMo: 5,
    required: true,
  },
  {
    id: 'photo_identite',
    label: 'Photo d\'identité',
    description: 'Format portrait, fond uni, moins de 6 mois',
    accept: '.jpg,.jpeg,.png',
    maxMo: 2,
    required: true,
  },
  {
    id: 'lettre_motivation',
    label: 'Lettre de motivation',
    description: 'Décrivez votre projet d\'études (optionnel)',
    accept: '.pdf,.docx',
    maxMo: 5,
    required: false,
  },
] as const

export type DocumentId = typeof DOCUMENTS_REQUIS[number]['id']

// ─── Destinations ────────────────────────────────────────────
// available: false → affiche "prochainement" et bloque la validation
export const DESTINATIONS = [
  { value: 'chine',  label: 'Chine',          flag: '🇨🇳', available: true  },
  { value: 'ghana',  label: 'Ghana',           flag: '🇬🇭', available: false },
  { value: 'russie', label: 'Russie',          flag: '🇷🇺', available: false },
  { value: 'autre',  label: 'Autre destination', flag: '🌍', available: false },
] as const

// ─── Sexe ─────────────────────────────────────────────────────
export const SEXES = [
  { value: 'masculin', label: 'Masculin' },
  { value: 'feminin',  label: 'Féminin'  },
] as const

// ─── Situations matrimoniales ─────────────────────────────────
export const SITUATIONS_MATRIMONIALES = [
  { value: 'celibataire', label: 'Célibataire'   },
  { value: 'marie',       label: 'Marié(e)'      },
  { value: 'divorce',     label: 'Divorcé(e)'    },
  { value: 'veuf',        label: 'Veuf / Veuve'  },
] as const

// ─── Sources de financement ───────────────────────────────────
export const SOURCES_FINANCEMENT = [
  { value: 'bourse_gouvernementale', label: 'Bourse gouvernementale' },
  { value: 'bourse_universitaire',   label: 'Bourse universitaire'   },
  { value: 'fonds_personnels',       label: 'Fonds personnels'       },
  { value: 'famille',                label: 'Famille'                },
  { value: 'autre',                  label: 'Autre (préciser)'       },
] as const

// ─── Liens de parenté (contact urgence) ──────────────────────
export const LIENS_PARENTE = [
  { value: 'pere',         label: 'Père'             },
  { value: 'mere',         label: 'Mère'             },
  { value: 'frere_soeur',  label: 'Frère / Sœur'    },
  { value: 'epoux_epouse', label: 'Époux / Épouse'  },
  { value: 'oncle_tante',  label: 'Oncle / Tante'   },
  { value: 'ami',          label: 'Ami(e)'           },
  { value: 'autre',        label: 'Autre'            },
] as const

// ─── Documents dynamiques par niveau visé ─────────────────────
// Chaque niveau inclut tous les niveaux inférieurs.
export const RELEVÉS_PAR_NIVEAU: Record<string, string[]> = {
  bac:     ['Baccalauréat / Diplôme de fin d\'études secondaires'],
  bac1:    ['Baccalauréat', 'Relevé de notes — BAC+1'],
  bac2:    ['Baccalauréat', 'Relevé de notes — BAC+1', 'Relevé de notes — BAC+2'],
  bac3:    ['Baccalauréat', 'Relevé de notes — BAC+1', 'Relevé de notes — BAC+2', 'Relevé de notes — BAC+3 / Licence'],
  bac4:    ['Baccalauréat', 'Relevé de notes — BAC+1', 'Relevé de notes — BAC+2', 'Relevé de notes — BAC+3', 'Relevé de notes — BAC+4 / Maîtrise'],
  bac5:    ['Baccalauréat', 'Relevé de notes — BAC+1', 'Relevé de notes — BAC+2', 'Relevé de notes — BAC+3', 'Relevé de notes — BAC+4', 'Relevé de notes — BAC+5 / Master'],
  bac6plus:['Baccalauréat', 'Relevé de notes — BAC+1', 'Relevé de notes — BAC+2', 'Relevé de notes — BAC+3', 'Relevé de notes — BAC+4', 'Relevé de notes — BAC+5', 'Relevé de notes — BAC+6 / Doctorat'],
}

// ─── Constantes de validation ─────────────────────────────────
export const VALIDATION = {
  noteMin: 0,
  noteMax: 20,
  // URL FormBold — remplacez par votre ID FormBold
  // Créez un formulaire sur https://formbold.com
  formboldEndpoint: 'https://formbold.com/s/98yQN',
  // Adresse email de notification WWA (backup si FormBold indisponible)
  adminEmail: 'info@worldwise-admission.com',
} as const
