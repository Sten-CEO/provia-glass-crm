-- Tables pour la refonte complète des interventions

-- Table pour les consommables/matériaux utilisés dans une intervention
CREATE TABLE IF NOT EXISTS public.intervention_consumables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  product_ref TEXT,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'unité',
  serial_number TEXT,
  location TEXT,
  unit_price_ht NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 20,
  total_ht NUMERIC GENERATED ALWAYS AS (quantity * unit_price_ht) STORED,
  total_ttc NUMERIC GENERATED ALWAYS AS (quantity * unit_price_ht * (1 + tax_rate / 100)) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les services/prestations effectués dans une intervention
CREATE TABLE IF NOT EXISTS public.intervention_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  service_item_id UUID REFERENCES public.service_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'h',
  unit_price_ht NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 20,
  total_ht NUMERIC GENERATED ALWAYS AS (quantity * unit_price_ht) STORED,
  total_ttc NUMERIC GENERATED ALWAYS AS (quantity * unit_price_ht * (1 + tax_rate / 100)) STORED,
  assigned_to UUID REFERENCES public.equipe(id) ON DELETE SET NULL,
  is_billable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les fichiers/photos attachés aux interventions
CREATE TABLE IF NOT EXISTS public.intervention_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ajouter des colonnes manquantes à la table jobs
ALTER TABLE public.jobs 
  ADD COLUMN IF NOT EXISTS intervention_number TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normale',
  ADD COLUMN IF NOT EXISTS duration_estimated INTEGER,
  ADD COLUMN IF NOT EXISTS duration_actual INTEGER,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS client_notes TEXT,
  ADD COLUMN IF NOT EXISTS signature_image TEXT,
  ADD COLUMN IF NOT EXISTS signature_name TEXT,
  ADD COLUMN IF NOT EXISTS signature_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.factures(id) ON DELETE SET NULL;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_intervention_consumables_intervention ON public.intervention_consumables(intervention_id);
CREATE INDEX IF NOT EXISTS idx_intervention_services_intervention ON public.intervention_services(intervention_id);
CREATE INDEX IF NOT EXISTS idx_intervention_files_intervention ON public.intervention_files(intervention_id);
CREATE INDEX IF NOT EXISTS idx_jobs_intervention_number ON public.jobs(intervention_number);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION public.update_intervention_consumables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_intervention_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_intervention_consumables_updated_at
  BEFORE UPDATE ON public.intervention_consumables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_intervention_consumables_updated_at();

CREATE TRIGGER update_intervention_services_updated_at
  BEFORE UPDATE ON public.intervention_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_intervention_services_updated_at();

-- Fonction pour générer un numéro d'intervention
CREATE OR REPLACE FUNCTION public.generate_intervention_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COUNT(*) + 1 INTO next_num
  FROM jobs
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND intervention_number IS NOT NULL;
  
  result := 'INT-' || year || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE public.intervention_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on intervention_consumables"
  ON public.intervention_consumables FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on intervention_consumables"
  ON public.intervention_consumables FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on intervention_consumables"
  ON public.intervention_consumables FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on intervention_consumables"
  ON public.intervention_consumables FOR DELETE USING (true);

CREATE POLICY "Allow public read access on intervention_services"
  ON public.intervention_services FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on intervention_services"
  ON public.intervention_services FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on intervention_services"
  ON public.intervention_services FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on intervention_services"
  ON public.intervention_services FOR DELETE USING (true);

CREATE POLICY "Allow public read access on intervention_files"
  ON public.intervention_files FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on intervention_files"
  ON public.intervention_files FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on intervention_files"
  ON public.intervention_files FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on intervention_files"
  ON public.intervention_files FOR DELETE USING (true);