-- POINT 2: Add company_id to quote_events and quote_signatures tables
-- CRITICAL: Quote tracking and legal signatures must be isolated per company

-- ========================================
-- 1. QUOTE_EVENTS TABLE
-- ========================================

-- Add company_id column
ALTER TABLE public.quote_events
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill company_id from related devis
UPDATE public.quote_events qe
SET company_id = d.company_id
FROM public.devis d
WHERE qe.quote_id = d.id
  AND qe.company_id IS NULL;

-- Make company_id NOT NULL after backfill
ALTER TABLE public.quote_events
  ALTER COLUMN company_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_quote_events_company_id ON public.quote_events(company_id);

-- Enable RLS
ALTER TABLE public.quote_events ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their company quote events" ON public.quote_events;
DROP POLICY IF EXISTS "Users can manage their company quote events" ON public.quote_events;

-- Create company-scoped RLS policies
CREATE POLICY "Users can view their company quote events"
  ON public.quote_events FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company quote events"
  ON public.quote_events FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Add trigger to auto-set company_id on INSERT
CREATE OR REPLACE FUNCTION set_quote_events_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.devis
    WHERE id = NEW.quote_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_quote_events_company_id ON public.quote_events;
CREATE TRIGGER trigger_set_quote_events_company_id
  BEFORE INSERT ON public.quote_events
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_events_company_id();

-- ========================================
-- 2. QUOTE_SIGNATURES TABLE
-- ========================================

-- Add company_id column
ALTER TABLE public.quote_signatures
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill company_id from related devis
UPDATE public.quote_signatures qs
SET company_id = d.company_id
FROM public.devis d
WHERE qs.quote_id = d.id
  AND qs.company_id IS NULL;

-- Make company_id NOT NULL after backfill
ALTER TABLE public.quote_signatures
  ALTER COLUMN company_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_quote_signatures_company_id ON public.quote_signatures(company_id);

-- Enable RLS
ALTER TABLE public.quote_signatures ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their company quote signatures" ON public.quote_signatures;
DROP POLICY IF EXISTS "Users can manage their company quote signatures" ON public.quote_signatures;

-- Create company-scoped RLS policies
CREATE POLICY "Users can view their company quote signatures"
  ON public.quote_signatures FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company quote signatures"
  ON public.quote_signatures FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Add trigger to auto-set company_id on INSERT
CREATE OR REPLACE FUNCTION set_quote_signatures_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.devis
    WHERE id = NEW.quote_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_quote_signatures_company_id ON public.quote_signatures;
CREATE TRIGGER trigger_set_quote_signatures_company_id
  BEFORE INSERT ON public.quote_signatures
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_signatures_company_id();
