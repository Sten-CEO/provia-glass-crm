-- Add company_id to main business tables
DO $$ 
BEGIN
  -- Add company_id columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'company_id') THEN
    ALTER TABLE public.clients ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_clients_company_id ON public.clients(company_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devis' AND column_name = 'company_id') THEN
    ALTER TABLE public.devis ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_devis_company_id ON public.devis(company_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'factures' AND column_name = 'company_id') THEN
    ALTER TABLE public.factures ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_factures_company_id ON public.factures(company_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'company_id') THEN
    ALTER TABLE public.jobs ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_jobs_company_id ON public.jobs(company_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipe' AND column_name = 'company_id') THEN
    ALTER TABLE public.equipe ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_equipe_company_id ON public.equipe(company_id);
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their company clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create clients in their company" ON public.clients;
DROP POLICY IF EXISTS "Users can update their company clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their company clients" ON public.clients;

DROP POLICY IF EXISTS "Users can view their company quotes" ON public.devis;
DROP POLICY IF EXISTS "Users can create quotes in their company" ON public.devis;
DROP POLICY IF EXISTS "Users can update their company quotes" ON public.devis;
DROP POLICY IF EXISTS "Users can delete their company quotes" ON public.devis;

DROP POLICY IF EXISTS "Users can view their company invoices" ON public.factures;
DROP POLICY IF EXISTS "Users can create invoices in their company" ON public.factures;
DROP POLICY IF EXISTS "Users can update their company invoices" ON public.factures;
DROP POLICY IF EXISTS "Users can delete their company invoices" ON public.factures;

-- Create new RLS policies scoped by company_id
CREATE POLICY "Users can view their company clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can create clients in their company"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can view their company quotes"
  ON public.devis FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can create quotes in their company"
  ON public.devis FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company quotes"
  ON public.devis FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company quotes"
  ON public.devis FOR DELETE
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can view their company invoices"
  ON public.factures FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can create invoices in their company"
  ON public.factures FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company invoices"
  ON public.factures FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company invoices"
  ON public.factures FOR DELETE
  TO authenticated
  USING (company_id = get_user_company_id());