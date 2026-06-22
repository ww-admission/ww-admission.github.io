-- ============================================================
-- MIGRATION 003 - Table candidature_documents
-- Stockage des métadonnées des fichiers joints aux candidatures.
-- Les fichiers eux-mêmes sont stockés dans un service externe
-- (ex: Supabase Storage, Cloudinary, S3).
-- ============================================================

CREATE TABLE IF NOT EXISTS candidature_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidature_id  UUID NOT NULL REFERENCES candidatures (id) ON DELETE CASCADE,
  type_document   TEXT NOT NULL
                  CHECK (type_document IN (
                    'diplome',
                    'releve_notes',
                    'piece_identite',
                    'photo_identite',
                    'lettre_motivation'
                  )),
  nom_fichier     TEXT NOT NULL,
  url             TEXT NOT NULL,   -- URL publique ou signée selon le service de stockage
  taille_octets   INTEGER,
  mime_type       TEXT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un candidat ne peut avoir qu'un document de chaque type
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidature_docs_unique
  ON candidature_documents (candidature_id, type_document);

-- Index pour récupérer les documents d'une candidature
CREATE INDEX IF NOT EXISTS idx_candidature_docs_candidature
  ON candidature_documents (candidature_id);
