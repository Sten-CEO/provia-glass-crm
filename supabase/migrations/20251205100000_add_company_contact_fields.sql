-- Ajout des champs de contact et email d'expédition pour les sociétés
-- Ces champs sont utilisés pour l'envoi d'emails (devis, factures) et les informations de contact

-- Ajouter les champs de contact s'ils n'existent pas déjà
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS telephone TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS adresse TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS ville TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS code_postal TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS siret TEXT;

-- Ajouter le champ email_from pour l'envoi de documents
-- Ce champ sera utilisé comme "reply-to" dans les emails de devis/factures
-- Si non défini, on utilisera le champ "email" par défaut
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email_from TEXT;

-- Ajouter un commentaire pour documenter l'usage
COMMENT ON COLUMN public.companies.email IS 'Email principal de la société (affiché sur les documents)';
COMMENT ON COLUMN public.companies.email_from IS 'Email d''expédition pour les documents (devis, factures). Utilisé comme reply-to dans les emails';
COMMENT ON COLUMN public.companies.telephone IS 'Numéro de téléphone principal';
COMMENT ON COLUMN public.companies.adresse IS 'Adresse complète de la société';
COMMENT ON COLUMN public.companies.ville IS 'Ville';
COMMENT ON COLUMN public.companies.code_postal IS 'Code postal';
COMMENT ON COLUMN public.companies.siret IS 'Numéro SIRET';

-- Créer un index pour les recherches par email
CREATE INDEX IF NOT EXISTS idx_companies_email ON public.companies(email);
