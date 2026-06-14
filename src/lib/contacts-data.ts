// ──────────────────────────────────────────────────────────────────────────────
// Contacts & Accounts — données de démonstration (remplacées par l'API Laravel)
// ──────────────────────────────────────────────────────────────────────────────

export type ContactType = 'wwa_team' | 'referent' | 'school' | 'company' | 'advisor' | 'personal'
export type ContactStatus = 'active' | 'inactive' | 'pending'
export type AccountRole = 'super_admin' | 'admin' | 'candidate' | 'advisor' | 'school'
export type AccountStatus = 'active' | 'suspended' | 'pending_verification'

export interface Contact {
  id: string
  type: ContactType
  name: string
  firstName?: string
  lastName?: string
  role: string
  email: string
  phone?: string
  location?: string
  bio?: string
  website?: string
  avatarUrl?: string
  initials: string
  avatarColor: string
  languages?: string[]
  availability?: string
  specializations?: string[]
  linkedinUrl?: string
  status: ContactStatus
  isDefault: boolean
  conversationId?: number | null
  candidatureCount?: number
  memberSince?: string
  tags?: string[]
}

export interface Account {
  id: string
  name: string
  email: string
  role: AccountRole
  status: AccountStatus
  lastActiveAt: string
  createdAt: string
  avatarUrl?: string
  initials: string
  avatarColor: string
  phone?: string
  location?: string
  candidatureCount?: number
  conversationCount?: number
  linkedContactId?: string
  permissions: string[]
  notes?: string
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export const MOCK_CONTACTS: Contact[] = [
  {
    id: 'wwa-main',
    type: 'wwa_team',
    name: 'WorldWise Admission',
    role: "Équipe d'accompagnement",
    email: 'info@worldwise-admission.com',
    phone: '+241 07 12 34 56',
    location: 'Libreville, Gabon',
    bio: "L'équipe WorldWise Admission accompagne les étudiants africains dans toutes les étapes de leur projet de mobilité internationale : choix de la destination, constitution du dossier, démarches visa et installation.",
    website: 'https://worldwise-admission.com',
    initials: 'W',
    avatarColor: 'bg-primary-500',
    languages: ['Français', 'Anglais'],
    availability: 'Lun–Ven · 8h–18h (GMT+1)',
    specializations: ['Chine', 'Ghana', 'Russie', 'Accompagnement global'],
    status: 'active',
    isDefault: true,
    conversationId: null,
    memberSince: '2022-01-01',
    tags: ['Officiel', 'Support'],
  },
  {
    id: 'ref-001',
    type: 'referent',
    name: 'Michel Obame',
    firstName: 'Michel',
    lastName: 'Obame',
    role: 'Référent WWA — Destination Chine',
    email: 'michel.obame@worldwise-admission.com',
    phone: '+241 06 78 90 12',
    location: 'Libreville, Gabon',
    bio: 'Ancien étudiant en médecine à l\'Université de Pékin, Michel guide les candidats vers les universités chinoises depuis 5 ans. Spécialisé dans les dossiers médecine, ingénierie et sciences.',
    initials: 'MO',
    avatarColor: 'bg-neutral-600',
    languages: ['Français', 'Mandarin', 'Anglais'],
    availability: 'Lun–Jeu · 9h–17h',
    specializations: ['Médecine', 'Ingénierie', 'Sciences naturelles'],
    linkedinUrl: '#',
    status: 'active',
    isDefault: false,
    conversationId: null,
    memberSince: '2022-03-15',
    tags: ['Référent', 'Chine'],
  },
  {
    id: 'ref-002',
    type: 'referent',
    name: 'Aminata Diallo',
    firstName: 'Aminata',
    lastName: 'Diallo',
    role: 'Référente WWA — Destination Ghana & Russie',
    email: 'aminata.diallo@worldwise-admission.com',
    phone: '+241 04 56 78 90',
    location: 'Libreville, Gabon',
    bio: 'Diplômée de l\'Université du Ghana, Aminata accompagne les candidats vers l\'Afrique de l\'Ouest et la Russie. Experte en bourses d\'excellence et programmes francophones.',
    initials: 'AD',
    avatarColor: 'bg-gold-600',
    languages: ['Français', 'Anglais', 'Russe (notions)'],
    availability: 'Mar–Ven · 10h–17h',
    specializations: ['Économie', 'Droit', 'Sciences humaines', 'Bourses'],
    status: 'active',
    isDefault: false,
    conversationId: null,
    memberSince: '2023-06-01',
    tags: ['Référente', 'Ghana', 'Russie'],
  },
  {
    id: 'school-001',
    type: 'school',
    name: 'Université de Pékin (PKU)',
    role: 'Université partenaire — Chine',
    email: 'admissions@pku.edu.cn',
    phone: '+86 10 6275 1234',
    location: 'Pékin, Chine',
    bio: 'Fondée en 1898, l\'Université de Pékin est l\'une des meilleures universités de Chine. Partenaire officiel de WorldWise Admission pour les admissions directes dans 12 facultés.',
    website: 'https://www.pku.edu.cn',
    initials: 'PKU',
    avatarColor: 'bg-primary-700',
    languages: ['Mandarin', 'Anglais'],
    availability: 'Lun–Ven · Bureau des admissions',
    specializations: ['Sciences', 'Médecine', 'Ingénierie', 'Humanités', 'Économie'],
    status: 'active',
    isDefault: false,
    conversationId: null,
    memberSince: '2023-09-01',
    tags: ['Université', 'Chine', 'Partenaire officiel'],
  },
  {
    id: 'school-002',
    type: 'school',
    name: 'Université du Ghana',
    role: 'Université partenaire — Ghana',
    email: 'international@ug.edu.gh',
    phone: '+233 30 2500 381',
    location: 'Accra, Ghana',
    bio: 'La principale université publique du Ghana, créée en 1948. Accueil de plus de 40 000 étudiants dont une forte proportion d\'étudiants africains francophones.',
    website: 'https://www.ug.edu.gh',
    initials: 'UG',
    avatarColor: 'bg-neutral-700',
    languages: ['Anglais', 'Français (services internationaux)'],
    availability: 'Lun–Ven · 8h–17h (GMT)',
    specializations: ['Business', 'Droit', 'Sciences sociales', 'Médecine'],
    status: 'active',
    isDefault: false,
    conversationId: null,
    memberSince: '2023-11-01',
    tags: ['Université', 'Ghana', 'Partenaire officiel'],
  },
  {
    id: 'advisor-001',
    type: 'advisor',
    name: 'Dr. Sophie Laurent',
    firstName: 'Sophie',
    lastName: 'Laurent',
    role: 'Conseillère d\'orientation — Europe & Asie',
    email: 'sophie.laurent@orientpro.fr',
    phone: '+33 6 12 34 56 78',
    location: 'Paris, France',
    bio: 'Docteure en Sciences de l\'Éducation, Sophie conseille les étudiants africains en mobilité internationale depuis 12 ans. Auteure de "Réussir ses études à l\'étranger".',
    website: 'https://orientpro.fr',
    initials: 'SL',
    avatarColor: 'bg-neutral-600',
    languages: ['Français', 'Anglais', 'Espagnol'],
    availability: 'Sur RDV — Mer & Ven',
    specializations: ['Orientation académique', 'Bourses européennes', 'Préparation aux entretiens'],
    linkedinUrl: '#',
    status: 'active',
    isDefault: false,
    conversationId: null,
    memberSince: '2024-02-01',
    tags: ['Conseillère', 'Orientation', 'Pro'],
  },
  {
    id: 'company-001',
    type: 'company',
    name: 'Futures Études Consulting',
    role: 'Cabinet de conseil en mobilité académique',
    email: 'contact@futures-etudes.com',
    phone: '+241 01 23 45 67',
    location: 'Libreville, Gabon',
    bio: 'Cabinet spécialisé dans l\'accompagnement des étudiants gabonais et africains vers les meilleures universités mondiales. Partenaire de confiance depuis 2018.',
    website: 'https://futures-etudes.com',
    initials: 'FE',
    avatarColor: 'bg-neutral-500',
    languages: ['Français', 'Anglais'],
    availability: 'Lun–Sam · 8h–19h',
    specializations: ['Conseils stratégiques', 'Visa', 'Logement étudiant', 'Financement'],
    status: 'active',
    isDefault: false,
    conversationId: null,
    memberSince: '2024-04-01',
    tags: ['Cabinet', 'Partenaire', 'Pro'],
  },
]

// ── Comptes / Accounts ────────────────────────────────────────────────────────

export const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'acc-001',
    name: 'Steeve Mokoko',
    email: 'info@worldwise-admission.com',
    role: 'super_admin',
    status: 'active',
    lastActiveAt: new Date().toISOString(),
    createdAt: '2022-01-01T08:00:00Z',
    initials: 'SM',
    avatarColor: 'bg-primary-500',
    phone: '+241 07 00 00 01',
    location: 'Libreville, Gabon',
    candidatureCount: 0,
    conversationCount: 12,
    permissions: ['all'],
    notes: 'Fondateur et super administrateur.',
  },
  {
    id: 'acc-002',
    name: 'Eunice Ntsame',
    email: 'eunice.ntsame@worldwise-admission.com',
    role: 'admin',
    status: 'active',
    lastActiveAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    createdAt: '2022-06-15T10:00:00Z',
    initials: 'EN',
    avatarColor: 'bg-primary-500',
    phone: '+241 07 00 00 02',
    location: 'Libreville, Gabon',
    candidatureCount: 0,
    conversationCount: 34,
    permissions: ['candidatures:read', 'candidatures:write', 'messages:all', 'logs:read'],
    notes: 'Responsable opérationnelle.',
  },
  {
    id: 'acc-003',
    name: 'Jean-Pierre Mba',
    email: 'jpmba@gmail.com',
    role: 'candidate',
    status: 'active',
    lastActiveAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    createdAt: '2024-03-10T14:23:00Z',
    initials: 'JM',
    avatarColor: 'bg-gold-600',
    phone: '+241 06 11 22 33',
    location: 'Port-Gentil, Gabon',
    candidatureCount: 1,
    conversationCount: 3,
    linkedContactId: undefined,
    permissions: ['own_candidature:read', 'messages:own'],
    notes: 'Candidature en cours — Chine (Médecine).',
  },
  {
    id: 'acc-004',
    name: 'Ornella Biyoghe',
    email: 'ornella.b@yahoo.fr',
    role: 'candidate',
    status: 'active',
    lastActiveAt: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
    createdAt: '2024-04-22T09:10:00Z',
    initials: 'OB',
    avatarColor: 'bg-neutral-600',
    phone: '+241 06 44 55 66',
    location: 'Libreville, Gabon',
    candidatureCount: 1,
    conversationCount: 1,
    permissions: ['own_candidature:read', 'messages:own'],
    notes: '',
  },
  {
    id: 'acc-005',
    name: 'Dr. Sophie Laurent',
    email: 'sophie.laurent@orientpro.fr',
    role: 'advisor',
    status: 'active',
    lastActiveAt: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    createdAt: '2024-02-01T11:00:00Z',
    initials: 'SL',
    avatarColor: 'bg-neutral-600',
    phone: '+33 6 12 34 56 78',
    location: 'Paris, France',
    candidatureCount: 0,
    conversationCount: 8,
    linkedContactId: 'advisor-001',
    permissions: ['assigned_candidatures:read', 'messages:assigned'],
    notes: 'Compte pro — conseillère partenaire.',
  },
  {
    id: 'acc-006',
    name: 'Université de Pékin (PKU)',
    email: 'admissions@pku.edu.cn',
    role: 'school',
    status: 'active',
    lastActiveAt: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    createdAt: '2023-09-01T00:00:00Z',
    initials: 'PKU',
    avatarColor: 'bg-primary-700',
    phone: '+86 10 6275 1234',
    location: 'Pékin, Chine',
    candidatureCount: 0,
    conversationCount: 15,
    linkedContactId: 'school-001',
    permissions: ['assigned_candidatures:read', 'own_profile:write'],
    notes: 'Compte institutionnel partenaire.',
  },
  {
    id: 'acc-007',
    name: 'Patrick Essono',
    email: 'p.essono@gmail.com',
    role: 'candidate',
    status: 'pending_verification',
    lastActiveAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    createdAt: '2025-05-28T17:45:00Z',
    initials: 'PE',
    avatarColor: 'bg-neutral-400',
    candidatureCount: 0,
    conversationCount: 0,
    permissions: ['own_candidature:read'],
    notes: 'En attente de vérification email.',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  wwa_team: 'Équipe WWA',
  referent:  'Référent',
  school:    'École / Université',
  company:   'Cabinet / Entreprise',
  advisor:   'Conseiller',
  personal:  'Contact personnel',
}

export const CONTACT_TYPE_COLORS: Record<ContactType, string> = {
  wwa_team:  'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-950 dark:text-primary-300 dark:border-primary-900',
  referent:  'bg-gold-100 text-gold-800 border-gold-200 dark:bg-gold-900/40 dark:text-gold-300 dark:border-gold-800',
  school:    'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
  company:   'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
  advisor:   'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
  personal:  'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
}

export const ROLE_LABELS: Record<AccountRole, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  candidate:   'Candidat',
  advisor:     'Conseiller',
  school:      'École / Institution',
}

export const ROLE_COLORS: Record<AccountRole, string> = {
  super_admin: 'bg-primary-100 text-primary-700 border border-primary-200 dark:bg-primary-950 dark:text-primary-300 dark:border-primary-900',
  admin:       'bg-primary-50 text-primary-600 border border-primary-100 dark:bg-primary-950 dark:text-primary-400 dark:border-primary-900',
  candidate:   'bg-gold-100 text-gold-800 border border-gold-200 dark:bg-gold-900/40 dark:text-gold-300 dark:border-gold-800',
  advisor:     'bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
  school:      'bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
}

export const STATUS_COLORS_ACCOUNT: Record<AccountStatus, string> = {
  active:               'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  suspended:            'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
  pending_verification: 'bg-gold-100 text-gold-800 dark:bg-gold-900/40 dark:text-gold-300',
}

export const STATUS_LABELS_ACCOUNT: Record<AccountStatus, string> = {
  active:               'Actif',
  suspended:            'Suspendu',
  pending_verification: 'En attente',
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'À l\'instant'
  if (mins < 60) return `Il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `Il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `Il y a ${days}j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

// ── Community / Découvrir ──────────────────────────────────────────────────────

export type MemberStatus = 'candidature' | 'studying' | 'alumni'

export interface CommunityMember {
  id: string
  name: string
  initials: string
  avatarColor: string
  nationality: string
  status: MemberStatus
  destination: string           // 'Chine' | 'Ghana' | 'Russie'
  destinationFlag: string       // emoji flag
  city?: string
  university?: string
  domain: string
  programme?: string
  studyYear?: string            // 'L1', 'M2', 'Doctorat', etc.
  graduationYear?: string
  bio?: string
  languages?: string[]
  lookingFor?: string[]         // 'Camarades d\'étude', 'Infos logement', etc.
  isVerified: boolean
  joinedAt: string
  linkedinUrl?: string
  isPublic: boolean             // profile visible to community
}

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  candidature: 'En candidature',
  studying:    'En études',
  alumni:      'Diplômé(e)',
}

export const MEMBER_STATUS_COLORS: Record<MemberStatus, string> = {
  candidature: 'bg-gold-100 text-gold-800 border-gold-200 dark:bg-gold-900/40 dark:text-gold-300 dark:border-gold-800',
  studying:    'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-950 dark:text-primary-300 dark:border-primary-900',
  alumni:      'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
}

export const DESTINATION_FLAGS: Record<string, string> = {
  'Chine':  '🇨🇳',
  'Ghana':  '🇬🇭',
  'Russie': '🇷🇺',
}

export const MOCK_COMMUNITY: CommunityMember[] = [
  {
    id: 'cm-001',
    name: 'Jean-Baptiste Moussavou',
    initials: 'JM',
    avatarColor: 'bg-primary-500',
    nationality: 'Gabonais',
    status: 'studying',
    destination: 'Chine',
    destinationFlag: '🇨🇳',
    city: 'Pékin',
    university: 'Université de Pékin (PKU)',
    domain: 'Médecine',
    programme: 'Médecine générale',
    studyYear: '3ème année',
    bio: 'Étudiant en médecine à PKU depuis 2022. Passionné de recherche biomédicale. Toujours disponible pour aider les nouveaux arrivants à s\'adapter !',
    languages: ['Français', 'Mandarin (intermédiaire)', 'Anglais'],
    lookingFor: ['Entraide académique', 'Sorties & découverte'],
    isVerified: true,
    joinedAt: '2022-09-01',
    linkedinUrl: '#',
    isPublic: true,
  },
  {
    id: 'cm-002',
    name: 'Ornella Biyoghe',
    initials: 'OB',
    avatarColor: 'bg-primary-500',
    nationality: 'Gabonaise',
    status: 'studying',
    destination: 'Chine',
    destinationFlag: '🇨🇳',
    city: 'Pékin',
    university: 'Université de Pékin (PKU)',
    domain: 'Ingénierie',
    programme: 'Génie civil',
    studyYear: '2ème année',
    bio: 'Future ingénieure en génie civil. Je partage mon quotidien d\'étudiante africaine en Chine et donne des conseils pratiques pour s\'installer à Pékin.',
    languages: ['Français', 'Mandarin (débutant)', 'Anglais'],
    lookingFor: ['Camarades d\'étude', 'Réseautage professionnel'],
    isVerified: true,
    joinedAt: '2023-09-10',
    isPublic: true,
  },
  {
    id: 'cm-003',
    name: 'Patrick Essono',
    initials: 'PE',
    avatarColor: 'bg-neutral-500',
    nationality: 'Gabonais',
    status: 'candidature',
    destination: 'Ghana',
    destinationFlag: '🇬🇭',
    city: 'Accra',
    university: 'Université du Ghana',
    domain: 'Droit',
    programme: 'Droit international',
    bio: 'En cours de candidature pour l\'Université du Ghana. Je cherche des étudiants qui ont fait cette démarche pour avoir des retours d\'expérience.',
    languages: ['Français', 'Anglais (intermédiaire)'],
    lookingFor: ['Infos & conseils', 'Camarades de promotion'],
    isVerified: false,
    joinedAt: '2025-05-28',
    isPublic: true,
  },
  {
    id: 'cm-004',
    name: 'Larissa Nkoghe',
    initials: 'LN',
    avatarColor: 'bg-neutral-700',
    nationality: 'Gabonaise',
    status: 'alumni',
    destination: 'Russie',
    destinationFlag: '🇷🇺',
    city: 'Moscou',
    university: 'Université RUDN',
    domain: 'Économie',
    programme: 'Économie internationale',
    graduationYear: '2023',
    bio: 'Diplômée de RUDN en 2023. Actuellement en poste à Libreville dans une entreprise d\'import-export. Je peux vous aider sur tout ce qui concerne la vie étudiante à Moscou.',
    languages: ['Français', 'Russe (courant)', 'Anglais'],
    lookingFor: ['Réseautage professionnel', 'Mentorat'],
    isVerified: true,
    joinedAt: '2020-09-01',
    linkedinUrl: '#',
    isPublic: true,
  },
  {
    id: 'cm-005',
    name: 'Ibrahim Diallo',
    initials: 'ID',
    avatarColor: 'bg-neutral-600',
    nationality: 'Sénégalais',
    status: 'studying',
    destination: 'Ghana',
    destinationFlag: '🇬🇭',
    city: 'Accra',
    university: 'Université du Ghana',
    domain: 'Business',
    programme: 'Administration des affaires (MBA)',
    studyYear: '1ère année',
    bio: 'MBA à l\'Université du Ghana. Entrepreneur dans l\'âme, je cherche à développer mon réseau panafricain. Le Ghana est une excellente base pour les affaires en Afrique de l\'Ouest.',
    languages: ['Français', 'Anglais (courant)', 'Wolof'],
    lookingFor: ['Réseautage professionnel', 'Partenariats business'],
    isVerified: true,
    joinedAt: '2024-09-05',
    linkedinUrl: '#',
    isPublic: true,
  },
  {
    id: 'cm-006',
    name: 'Christelle Boukoulou',
    initials: 'CB',
    avatarColor: 'bg-primary-700',
    nationality: 'Congolaise',
    status: 'alumni',
    destination: 'Chine',
    destinationFlag: '🇨🇳',
    city: 'Pékin',
    university: 'Université de Pékin (PKU)',
    domain: 'Médecine',
    programme: 'Médecine générale',
    graduationYear: '2022',
    bio: 'Médecin diplômée de PKU, maintenant en résidence à Brazzaville. J\'ai vécu 6 ans en Chine et je suis ravie d\'aider les candidats à se préparer pour cette aventure extraordinaire.',
    languages: ['Français', 'Mandarin (courant)', 'Anglais', 'Lingala'],
    lookingFor: ['Mentorat', 'Réseautage médical'],
    isVerified: true,
    joinedAt: '2016-09-01',
    linkedinUrl: '#',
    isPublic: true,
  },
  {
    id: 'cm-007',
    name: 'Maxime Nguema',
    initials: 'MN',
    avatarColor: 'bg-neutral-500',
    nationality: 'Gabonais',
    status: 'studying',
    destination: 'Chine',
    destinationFlag: '🇨🇳',
    city: 'Shanghai',
    university: 'Université Tongji',
    domain: 'Architecture',
    programme: 'Architecture & Urbanisme',
    studyYear: 'Master 1',
    bio: 'Architecte en formation à Tongji, l\'une des meilleures universités de design en Asie. Je documente mon parcours sur Instagram et partage les projets urbains inspirants de Shanghai.',
    languages: ['Français', 'Mandarin (intermédiaire)', 'Anglais'],
    lookingFor: ['Créatifs & designers', 'Sorties culturelles'],
    isVerified: true,
    joinedAt: '2023-09-15',
    isPublic: true,
  },
  {
    id: 'cm-008',
    name: 'Fatou Sow',
    initials: 'FS',
    avatarColor: 'bg-gold-600',
    nationality: 'Sénégalaise',
    status: 'candidature',
    destination: 'Russie',
    destinationFlag: '🇷🇺',
    city: 'Moscou',
    university: 'RUDN',
    domain: 'Sciences',
    programme: 'Biologie moléculaire',
    bio: 'Titulaire d\'un bac scientifique avec mention très bien. Je prépare mon dossier pour RUDN et cherche des conseils de candidats qui ont déjà franchi ce cap.',
    languages: ['Français', 'Anglais', 'Wolof'],
    lookingFor: ['Infos & conseils', 'Groupes de préparation'],
    isVerified: false,
    joinedAt: '2025-04-15',
    isPublic: true,
  },
  {
    id: 'cm-009',
    name: 'Boris Mba Nguema',
    initials: 'BM',
    avatarColor: 'bg-neutral-700',
    nationality: 'Gabonais',
    status: 'alumni',
    destination: 'Chine',
    destinationFlag: '🇨🇳',
    city: 'Pékin',
    university: 'Université de Pékin (PKU)',
    domain: 'Informatique',
    programme: 'Intelligence artificielle',
    graduationYear: '2024',
    bio: 'Ingénieur IA fraîchement diplômé de PKU. Actuellement en recherche d\'emploi entre le Gabon, la France et la Chine. Expert Python, ML et traitement du langage naturel.',
    languages: ['Français', 'Mandarin', 'Anglais'],
    lookingFor: ['Opportunités pro', 'Startups tech africaines'],
    isVerified: true,
    joinedAt: '2020-09-01',
    linkedinUrl: '#',
    isPublic: true,
  },
  {
    id: 'cm-010',
    name: 'Sandra Obame',
    initials: 'SO',
    avatarColor: 'bg-neutral-600',
    nationality: 'Gabonaise',
    status: 'studying',
    destination: 'Ghana',
    destinationFlag: '🇬🇭',
    city: 'Accra',
    university: 'Université du Ghana',
    domain: 'Sciences sociales',
    programme: 'Sociologie & Développement',
    studyYear: 'Licence 3',
    bio: 'Étudiante en sociologie à Accra. Passionnée par les questions de développement durable en Afrique et la jeunesse africaine. Le Ghana est un pays extraordinaire pour étudier les dynamiques sociales du continent.',
    languages: ['Français', 'Anglais (courant)', 'Fang'],
    lookingFor: ['Débats & intellectuels', 'Engagement associatif'],
    isVerified: true,
    joinedAt: '2023-01-20',
    isPublic: true,
  },
  {
    id: 'cm-011',
    name: 'Kevin Ondo',
    initials: 'KO',
    avatarColor: 'bg-neutral-700',
    nationality: 'Gabonais',
    status: 'studying',
    destination: 'Chine',
    destinationFlag: '🇨🇳',
    city: 'Shanghai',
    university: 'Université Fudan',
    domain: 'Médecine',
    programme: 'Médecine dentaire',
    studyYear: '4ème année',
    bio: 'Futur chirurgien-dentiste formé à Fudan, l\'une des meilleures universités médicales de Chine. J\'organise des sessions d\'étude en groupe chaque semaine.',
    languages: ['Français', 'Mandarin (courant)', 'Anglais'],
    lookingFor: ['Camarades d\'étude', 'Étudiants en santé'],
    isVerified: true,
    joinedAt: '2021-09-01',
    isPublic: true,
  },
  {
    id: 'cm-012',
    name: 'Aurore Ntsame',
    initials: 'AN',
    avatarColor: 'bg-primary-500',
    nationality: 'Gabonaise',
    status: 'alumni',
    destination: 'Russie',
    destinationFlag: '🇷🇺',
    city: 'Moscou',
    university: 'RUDN',
    domain: 'Langues',
    programme: 'Linguistique & Traduction',
    graduationYear: '2021',
    bio: 'Traductrice FR/EN/RU freelance. Diplômée de RUDN, je suis revenue au Gabon pour monter mon cabinet de traduction. Je donne aussi des cours de russe pour les futurs étudiants.',
    languages: ['Français', 'Russe (bilingue)', 'Anglais', 'Espagnol'],
    lookingFor: ['Traduction & langues', 'Réseau alumni Russie'],
    isVerified: true,
    joinedAt: '2018-09-01',
    linkedinUrl: '#',
    isPublic: true,
  },
]
