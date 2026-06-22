-- ============================================================
-- MIGRATION 002 - Table etablissements_references
-- Système d'apprentissage des établissements saisis par les candidats.
-- Un établissement inconnu ayant 5+ occurrences intègre les suggestions.
-- ============================================================

CREATE TABLE IF NOT EXISTS etablissements_references (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom                   TEXT NOT NULL UNIQUE,
  occurrences           INTEGER NOT NULL DEFAULT 1,
  valide_manuellement   BOOLEAN NOT NULL DEFAULT false,
  -- Valide automatiquement si occurrences >= 5 (calculé à la lecture)
  pays                  TEXT DEFAULT 'GA',  -- 'GA' = Gabon par défaut
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vue pour les établissements qui apparaissent dans les suggestions
-- (validés manuellement OU ayant atteint le seuil d'occurrences)
CREATE OR REPLACE VIEW etablissements_suggestions AS
  SELECT nom, occurrences, pays
  FROM etablissements_references
  WHERE valide_manuellement = true OR occurrences >= 5
  ORDER BY occurrences DESC, nom ASC;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_etablissements_updated_at
BEFORE UPDATE ON etablissements_references
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS idx_etablissements_occurrences ON etablissements_references (occurrences DESC);
CREATE INDEX IF NOT EXISTS idx_etablissements_nom_trgm    ON etablissements_references USING gin (nom gin_trgm_ops);
-- Note: l'extension pg_trgm doit être activée pour le dernier index :
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
