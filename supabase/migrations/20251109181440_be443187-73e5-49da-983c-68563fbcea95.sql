-- Table pour gérer les taux de TVA
CREATE TABLE IF NOT EXISTS public.taxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rate NUMERIC NOT NULL CHECK (rate >= 0),
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_taxes_active ON public.taxes(is_active);
CREATE INDEX IF NOT EXISTS idx_taxes_default ON public.taxes(is_default);

-- RLS Policies pour taxes
ALTER TABLE public.taxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on taxes"
  ON public.taxes FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access on taxes"
  ON public.taxes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access on taxes"
  ON public.taxes FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access on taxes"
  ON public.taxes FOR DELETE
  USING (true);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_taxes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_taxes_updated_at
  BEFORE UPDATE ON public.taxes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_taxes_updated_at();

-- Table pour la numérotation automatique
CREATE TABLE IF NOT EXISTS public.document_numbering (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL UNIQUE CHECK (type IN ('quote', 'invoice', 'credit_note')),
  prefix TEXT NOT NULL DEFAULT '',
  pattern TEXT NOT NULL DEFAULT '{YYYY}-{####}',
  next_number INTEGER NOT NULL DEFAULT 1,
  reset_each_year BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS Policies pour document_numbering
ALTER TABLE public.document_numbering ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on document_numbering"
  ON public.document_numbering FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access on document_numbering"
  ON public.document_numbering FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access on document_numbering"
  ON public.document_numbering FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access on document_numbering"
  ON public.document_numbering FOR DELETE
  USING (true);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_document_numbering_updated_at
  BEFORE UPDATE ON public.document_numbering
  FOR EACH ROW
  EXECUTE FUNCTION public.update_taxes_updated_at();

-- Insérer les données par défaut pour les taux de TVA
INSERT INTO public.taxes (name, rate, is_default, is_active, description) VALUES
  ('TVA standard', 20, true, true, 'Taux de TVA normal applicable en France'),
  ('TVA réduite', 10, false, true, 'Taux réduit pour certains produits et services'),
  ('TVA export', 0, false, true, 'Exonération de TVA pour les exports')
ON CONFLICT DO NOTHING;

-- Insérer les configurations par défaut pour la numérotation
INSERT INTO public.document_numbering (type, prefix, pattern, next_number, reset_each_year) VALUES
  ('quote', 'DEV-', '{YYYY}-{####}', 1, true),
  ('invoice', 'FAC-', '{YYYY}-{####}', 1, true),
  ('credit_note', 'AVO-', '{YYYY}-{####}', 1, false)
ON CONFLICT (type) DO NOTHING;