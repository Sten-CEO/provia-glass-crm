-- Phase 1: DEVIS - Tables et colonnes pour tracking, signatures et envoi

-- Table pour tracker les événements liés aux devis (envoi, ouverture, acceptation, etc.)
CREATE TABLE IF NOT EXISTS quote_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'opened', 'clicked', 'accepted', 'declined', 'expired')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_quote_events_quote_id ON quote_events(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_events_type ON quote_events(event_type);
CREATE INDEX IF NOT EXISTS idx_quote_events_occurred_at ON quote_events(occurred_at);

-- Table pour stocker les signatures électroniques des devis
CREATE TABLE IF NOT EXISTS quote_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signature_image_url TEXT NOT NULL,
  pdf_hash TEXT NOT NULL, -- SHA-256 du PDF signé
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_terms BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_quote_signatures_quote_id ON quote_signatures(quote_id);

-- Ajouter les colonnes manquantes sur la table devis
ALTER TABLE devis 
  ADD COLUMN IF NOT EXISTS token TEXT UNIQUE, -- Token JWT pour accès public sécurisé
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_signed_url TEXT;

-- Phase 2: FACTURATION - Colonnes pour PDF conforme et Factur-X

ALTER TABLE factures
  ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Paiement à 30 jours',
  ADD COLUMN IF NOT EXISTS notes_legal TEXT,
  ADD COLUMN IF NOT EXISTS tva_breakdown JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS facturx_profile TEXT DEFAULT 'BASIC_WL' CHECK (facturx_profile IN ('MINIMUM', 'BASIC_WL', 'EN16931')),
  ADD COLUMN IF NOT EXISTS facturx_xml_url TEXT,
  ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS due_date DATE;

-- Ajouter colonnes d'entreprise pour mentions légales (table de configuration)
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  siret TEXT,
  siren TEXT,
  tva_intracom TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'France',
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  legal_mentions TEXT,
  payment_conditions TEXT DEFAULT 'Paiement à réception',
  late_payment_penalty TEXT DEFAULT 'Pénalités de retard : 3 fois le taux d''intérêt légal',
  discount_conditions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fonction pour générer un numéro de facture séquentiel
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Compter les factures de l'année en cours
  SELECT COUNT(*) + 1 INTO next_num
  FROM factures
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  result := 'FAC-' || year || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer un numéro de devis séquentiel
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COUNT(*) + 1 INTO next_num
  FROM devis
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  result := 'DEV-' || year || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies pour quote_events
ALTER TABLE quote_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on quote_events"
  ON quote_events FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access on quote_events"
  ON quote_events FOR INSERT
  WITH CHECK (true);

-- RLS Policies pour quote_signatures
ALTER TABLE quote_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on quote_signatures"
  ON quote_signatures FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access on quote_signatures"
  ON quote_signatures FOR INSERT
  WITH CHECK (true);

-- RLS Policies pour company_settings
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on company_settings"
  ON company_settings FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access on company_settings"
  ON company_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access on company_settings"
  ON company_settings FOR UPDATE
  USING (true);

-- Insérer une ligne de configuration par défaut si elle n'existe pas
INSERT INTO company_settings (
  company_name,
  siret,
  address,
  city,
  postal_code,
  email,
  phone,
  legal_mentions
) VALUES (
  'Votre Entreprise',
  '123 456 789 00012',
  '123 Rue Example',
  'Paris',
  '75001',
  'contact@votreentreprise.fr',
  '01 23 45 67 89',
  'SAS au capital de 10 000€ - RCS Paris 123 456 789'
) ON CONFLICT DO NOTHING;