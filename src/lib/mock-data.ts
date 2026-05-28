// Données de démonstration — remplacées par l'API Laravel quand elle est prête

export type CandidatureStatus = 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'on_hold'

export interface AdminComment {
  id: string
  authorName: string
  content: string
  createdAt: string
}

export interface Document {
  name: string
  originalName: string
  type: string
}

export interface Candidature {
  id: string
  candidateId: string
  candidateName: string
  candidateEmail: string
  candidatePhone: string
  destination: string
  programme: string
  niveauVise: string
  status: CandidatureStatus
  submittedAt: string
  updatedAt: string
  documents: Document[]
  personalInfo: {
    dateNaissance: string
    nationalite: string
    ville: string
    pays: string
    situationFamiliale: string
  }
  academicInfo: {
    niveauActuel: string
    etablissement: string
    specialite: string
    anneeDiplome: string
    moyenne: string
    langues: string[]
  }
  comments: AdminComment[]
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderRole: 'admin' | 'candidate'
  content: string
  createdAt: string
  read: boolean
}

export interface Conversation {
  id: string
  candidateId: string
  candidateName: string
  candidateEmail: string
  candidatureId?: string
  unreadCount: number
  lastMessage?: Pick<Message, 'content' | 'createdAt' | 'senderRole'>
}

export interface LogEntry {
  id: string
  action: string
  description: string
  actorName: string
  actorRole: 'admin' | 'candidate' | 'system'
  targetId?: string
  targetType?: string
  createdAt: string
  meta?: Record<string, string>
}

// ─── Candidatures ────────────────────────────────────────────────────────────

export const MOCK_CANDIDATURES: Candidature[] = [
  {
    id: 'cand-001',
    candidateId: 'user-002',
    candidateName: 'Jean-Baptiste Ondo',
    candidateEmail: 'jb.ondo@gmail.com',
    candidatePhone: '+241 06 12 34 567',
    destination: 'Chine',
    programme: 'Médecine générale',
    niveauVise: 'BAC+5 / Master',
    status: 'reviewing',
    submittedAt: '2026-05-20T10:30:00Z',
    updatedAt: '2026-05-22T14:00:00Z',
    documents: [
      { name: 'passeport.pdf', originalName: 'Passeport', type: 'passeport' },
      { name: 'releves.pdf', originalName: 'Relevés de notes', type: 'releves_notes' },
      { name: 'bac.pdf', originalName: 'Diplôme BAC', type: 'diplome' },
    ],
    personalInfo: {
      dateNaissance: '2001-03-15',
      nationalite: 'Gabonaise',
      ville: 'Libreville',
      pays: 'Gabon',
      situationFamiliale: 'Célibataire',
    },
    academicInfo: {
      niveauActuel: 'BAC',
      etablissement: 'Lycée Léon Mba',
      specialite: 'Sciences Expérimentales',
      anneeDiplome: '2025',
      moyenne: '14.5',
      langues: ['Français', 'Anglais (B1)'],
    },
    comments: [
      {
        id: 'com-001',
        authorName: 'Admin WWA',
        content: 'Dossier complet. Documents à vérifier avec l\'université partenaire.',
        createdAt: '2026-05-22T14:00:00Z',
      },
    ],
  },
  {
    id: 'cand-002',
    candidateId: 'user-003',
    candidateName: 'Prisca Moussavou',
    candidateEmail: 'prisca.moussavou@yahoo.fr',
    candidatePhone: '+241 077 654 321',
    destination: 'Chine',
    programme: 'Informatique / Computer Science',
    niveauVise: 'BAC+3 / Licence',
    status: 'pending',
    submittedAt: '2026-05-25T08:15:00Z',
    updatedAt: '2026-05-25T08:15:00Z',
    documents: [
      { name: 'passeport.pdf', originalName: 'Passeport', type: 'passeport' },
      { name: 'releves.pdf', originalName: 'Relevés de notes', type: 'releves_notes' },
    ],
    personalInfo: {
      dateNaissance: '2003-07-22',
      nationalite: 'Gabonaise',
      ville: 'Port-Gentil',
      pays: 'Gabon',
      situationFamiliale: 'Célibataire',
    },
    academicInfo: {
      niveauActuel: 'BAC',
      etablissement: 'Lycée Technique National',
      specialite: 'Sciences Mathématiques',
      anneeDiplome: '2025',
      moyenne: '16.2',
      langues: ['Français', 'Anglais (B2)', 'Mandarin (débutant)'],
    },
    comments: [],
  },
  {
    id: 'cand-003',
    candidateId: 'user-004',
    candidateName: 'Rodrigue Nzamba',
    candidateEmail: 'r.nzamba@outlook.com',
    candidatePhone: '+241 062 111 222',
    destination: 'Chine',
    programme: 'Génie Civil',
    niveauVise: 'BAC+5 / Master',
    status: 'accepted',
    submittedAt: '2026-04-10T11:00:00Z',
    updatedAt: '2026-05-15T09:30:00Z',
    documents: [
      { name: 'passeport.pdf', originalName: 'Passeport', type: 'passeport' },
      { name: 'releves.pdf', originalName: 'Relevés de notes', type: 'releves_notes' },
      { name: 'licence.pdf', originalName: 'Diplôme Licence', type: 'diplome' },
      { name: 'lettre.pdf', originalName: 'Lettre de motivation', type: 'lettre_motivation' },
    ],
    personalInfo: {
      dateNaissance: '1999-11-08',
      nationalite: 'Gabonaise',
      ville: 'Franceville',
      pays: 'Gabon',
      situationFamiliale: 'Marié',
    },
    academicInfo: {
      niveauActuel: 'Licence',
      etablissement: 'Université Omar Bongo',
      specialite: 'Génie Civil',
      anneeDiplome: '2024',
      moyenne: '13.8',
      langues: ['Français', 'Anglais (B1)'],
    },
    comments: [
      {
        id: 'com-002',
        authorName: 'Admin WWA',
        content: 'Accepté par l\'Université de Tongji. Lettre d\'admission envoyée par email.',
        createdAt: '2026-05-15T09:30:00Z',
      },
    ],
  },
]

// ─── Conversations & Messages ─────────────────────────────────────────────────

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-001',
    candidateId: 'user-002',
    candidateName: 'Jean-Baptiste Ondo',
    candidateEmail: 'jb.ondo@gmail.com',
    candidatureId: 'cand-001',
    unreadCount: 1,
    lastMessage: {
      content: 'Bonjour, quand est-ce que mon dossier sera traité ?',
      createdAt: '2026-05-27T16:45:00Z',
      senderRole: 'candidate',
    },
  },
  {
    id: 'conv-002',
    candidateId: 'user-003',
    candidateName: 'Prisca Moussavou',
    candidateEmail: 'prisca.moussavou@yahoo.fr',
    candidatureId: 'cand-002',
    unreadCount: 0,
    lastMessage: {
      content: 'Merci pour votre réponse ! Je vais préparer les documents manquants.',
      createdAt: '2026-05-26T10:00:00Z',
      senderRole: 'candidate',
    },
  },
  {
    id: 'conv-003',
    candidateId: 'user-004',
    candidateName: 'Rodrigue Nzamba',
    candidateEmail: 'r.nzamba@outlook.com',
    candidatureId: 'cand-003',
    unreadCount: 0,
    lastMessage: {
      content: 'Félicitations ! Votre candidature a été acceptée par l\'Université de Tongji.',
      createdAt: '2026-05-15T09:35:00Z',
      senderRole: 'admin',
    },
  },
]

export const MOCK_MESSAGES: Record<string, Message[]> = {
  'conv-001': [
    {
      id: 'msg-001',
      conversationId: 'conv-001',
      senderId: 'admin',
      senderName: 'Admin WWA',
      senderRole: 'admin',
      content: 'Bonjour Jean-Baptiste, nous avons bien reçu votre dossier. Il est en cours d\'examen par notre équipe.',
      createdAt: '2026-05-22T14:05:00Z',
      read: true,
    },
    {
      id: 'msg-002',
      conversationId: 'conv-001',
      senderId: 'user-002',
      senderName: 'Jean-Baptiste Ondo',
      senderRole: 'candidate',
      content: 'Bonjour, quand est-ce que mon dossier sera traité ?',
      createdAt: '2026-05-27T16:45:00Z',
      read: false,
    },
  ],
  'conv-002': [
    {
      id: 'msg-003',
      conversationId: 'conv-002',
      senderId: 'admin',
      senderName: 'Admin WWA',
      senderRole: 'admin',
      content: 'Bonjour Prisca, il manque votre diplôme de BAC dans votre dossier. Pouvez-vous nous l\'envoyer ?',
      createdAt: '2026-05-25T15:00:00Z',
      read: true,
    },
    {
      id: 'msg-004',
      conversationId: 'conv-002',
      senderId: 'user-003',
      senderName: 'Prisca Moussavou',
      senderRole: 'candidate',
      content: 'Merci pour votre réponse ! Je vais préparer les documents manquants.',
      createdAt: '2026-05-26T10:00:00Z',
      read: true,
    },
  ],
  'conv-003': [
    {
      id: 'msg-005',
      conversationId: 'conv-003',
      senderId: 'admin',
      senderName: 'Admin WWA',
      senderRole: 'admin',
      content: 'Félicitations Rodrigue ! Votre candidature a été acceptée par l\'Université de Tongji. Nous vous envoyons la lettre d\'admission par email.',
      createdAt: '2026-05-15T09:35:00Z',
      read: true,
    },
    {
      id: 'msg-006',
      conversationId: 'conv-003',
      senderId: 'user-004',
      senderName: 'Rodrigue Nzamba',
      senderRole: 'candidate',
      content: 'Merci beaucoup à toute l\'équipe WWA ! Je suis tellement heureux.',
      createdAt: '2026-05-15T12:10:00Z',
      read: true,
    },
  ],
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export const MOCK_LOGS: LogEntry[] = [
  {
    id: 'log-001',
    action: 'candidature.submitted',
    description: 'Nouvelle candidature soumise',
    actorName: 'Prisca Moussavou',
    actorRole: 'candidate',
    targetId: 'cand-002',
    targetType: 'candidature',
    createdAt: '2026-05-25T08:15:00Z',
  },
  {
    id: 'log-002',
    action: 'message.sent',
    description: 'Message envoyé à Prisca Moussavou',
    actorName: 'Admin WWA',
    actorRole: 'admin',
    targetId: 'conv-002',
    targetType: 'conversation',
    createdAt: '2026-05-25T15:00:00Z',
  },
  {
    id: 'log-003',
    action: 'candidature.status_changed',
    description: 'Statut changé : pending → reviewing',
    actorName: 'Admin WWA',
    actorRole: 'admin',
    targetId: 'cand-001',
    targetType: 'candidature',
    createdAt: '2026-05-22T14:00:00Z',
    meta: { from: 'pending', to: 'reviewing' },
  },
  {
    id: 'log-004',
    action: 'candidature.comment_added',
    description: 'Commentaire ajouté sur la candidature de Jean-Baptiste Ondo',
    actorName: 'Admin WWA',
    actorRole: 'admin',
    targetId: 'cand-001',
    targetType: 'candidature',
    createdAt: '2026-05-22T14:00:00Z',
  },
  {
    id: 'log-005',
    action: 'candidature.submitted',
    description: 'Nouvelle candidature soumise',
    actorName: 'Jean-Baptiste Ondo',
    actorRole: 'candidate',
    targetId: 'cand-001',
    targetType: 'candidature',
    createdAt: '2026-05-20T10:30:00Z',
  },
  {
    id: 'log-006',
    action: 'candidature.status_changed',
    description: 'Statut changé : reviewing → accepted',
    actorName: 'Admin WWA',
    actorRole: 'admin',
    targetId: 'cand-003',
    targetType: 'candidature',
    createdAt: '2026-05-15T09:30:00Z',
    meta: { from: 'reviewing', to: 'accepted' },
  },
  {
    id: 'log-007',
    action: 'user.login',
    description: 'Connexion réussie',
    actorName: 'Admin WWA',
    actorRole: 'admin',
    createdAt: '2026-05-28T09:00:00Z',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<CandidatureStatus, string> = {
  pending: 'En attente',
  reviewing: 'En cours d\'examen',
  accepted: 'Acceptée',
  rejected: 'Refusée',
  on_hold: 'En suspens',
}

export const STATUS_COLORS: Record<CandidatureStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  reviewing: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  on_hold: 'bg-neutral-100 text-neutral-600',
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
