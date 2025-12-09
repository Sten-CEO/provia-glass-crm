-- POINT 1: Add company_id to paiements table for multi-tenant data isolation
-- CRITICAL: Financial data must be isolated per company

-- Add company_id column
ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill company_id from related factures
UPDATE public.paiements p
SET company_id = f.company_id
FROM public.factures f
WHERE p.facture_id = f.id
  AND p.company_id IS NULL;

-- Make company_id NOT NULL after backfill
ALTER TABLE public.paiements
  ALTER COLUMN company_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_paiements_company_id ON public.paiements(company_id);

-- Enable RLS
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their company payments" ON public.paiements;
DROP POLICY IF EXISTS "Users can insert payments in their company" ON public.paiements;
DROP POLICY IF EXISTS "Users can update their company payments" ON public.paiements;
DROP POLICY IF EXISTS "Users can delete their company payments" ON public.paiements;

-- Create company-scoped RLS policies
CREATE POLICY "Users can view their company payments"
  ON public.paiements FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert payments in their company"
  ON public.paiements FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company payments"
  ON public.paiements FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company payments"
  ON public.paiements FOR DELETE
  USING (company_id = get_user_company_id());

-- Add trigger to auto-set company_id on INSERT
CREATE OR REPLACE FUNCTION set_paiements_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_paiements_company_id ON public.paiements;
CREATE TRIGGER trigger_set_paiements_company_id
  BEFORE INSERT ON public.paiements
  FOR EACH ROW
  EXECUTE FUNCTION set_paiements_company_id();
