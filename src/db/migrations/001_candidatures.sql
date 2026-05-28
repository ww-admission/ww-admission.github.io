-- ============================================================
-- MIGRATION 001 — Table candidatures
-- À exécuter dans votre base de données (ex: Supabase SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS candidatures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Step 1 : Informations personnelles
  nom             TEXT NOT NULL,
  prenom          TEXT NOT NULL,
  date_naissance  DATE NOT NULL,
  lieu_naissance  TEXT NOT NULL,
  nationalites    TEXT[] NOT NULL DEFAULT '{}',  -- tableau de nationalités
  adresse         TEXT,
  ville           TEXT,
  pays            TEXT,
  indicatif       TEXT,
  telephone       TEXT NOT NULL,
  email           TEXT NOT NULL,

  -- Step 2 : Informations académiques
  niveau_etude    TEXT NOT NULL,
  etablissement   TEXT NOT NULL,
  specialite      TEXT NOT NULL,
  moyenne         NUMERIC(4, 2) CHECK (moyenne >= 0 AND moyenne <= 20),

  -- Step 3 : Choix de programme
  programme       TEXT NOT NULL,
  faculte         TEXT NOT NULL,
  niveau_vise     TEXT NOT NULL,

  -- Statut du dossier
  statut          TEXT NOT NULL DEFAULT 'recu'
                  CHECK (statut IN ('recu', 'en_cours', 'accepte', 'refuse', 'en_attente')),

  -- Source de soumission
  source          TEXT DEFAULT 'formulaire_web'
);

-- Index pour les recherches courantes
CREATE INDEX IF NOT EXISTS idx_candidatures_email    ON candidatures (email);
CREATE INDEX IF NOT EXISTS idx_candidatures_statut   ON candidatures (statut);
CREATE INDEX IF NOT EXISTS idx_candidatures_created  ON candidatures (created_at DESC);
