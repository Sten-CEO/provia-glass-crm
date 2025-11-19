-- Add company_id to user_roles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_roles' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.user_roles 
    ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    
    CREATE INDEX idx_user_roles_company_id ON public.user_roles(company_id);
  END IF;
END $$;

-- Recreate the get_user_company_id function
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select company_id 
  from public.user_roles 
  where user_id = auth.uid() 
  limit 1;
$$;