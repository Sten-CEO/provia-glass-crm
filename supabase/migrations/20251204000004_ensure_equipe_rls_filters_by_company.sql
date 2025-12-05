-- Ensure equipe table RLS policies properly filter by company_id

-- Drop any old permissive policies
DROP POLICY IF EXISTS "Allow public read access on equipe" ON public.equipe;
DROP POLICY IF EXISTS "Allow public insert access on equipe" ON public.equipe;
DROP POLICY IF EXISTS "Allow public update access on equipe" ON public.equipe;
DROP POLICY IF EXISTS "Allow public delete access on equipe" ON public.equipe;

-- Drop and recreate SELECT policy to ensure it filters by company_id
DROP POLICY IF EXISTS "Users can view team members in their company" ON public.equipe;
DROP POLICY IF EXISTS "Users can view their company team members" ON public.equipe;
DROP POLICY IF EXISTS "Employees can view their own profile" ON public.equipe;
DROP POLICY IF EXISTS "Users can view their company team" ON public.equipe;

-- Enable RLS
ALTER TABLE public.equipe ENABLE ROW LEVEL SECURITY;

-- Create the correct SELECT policy that filters by company_id
CREATE POLICY "Users can view team members in their company"
ON public.equipe
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id()
);

-- Ensure UPDATE policy exists and filters by company_id
DROP POLICY IF EXISTS "Admins can update team members" ON public.equipe;
CREATE POLICY "Admins can update team members"
ON public.equipe
FOR UPDATE
TO authenticated
USING (
  company_id = get_user_company_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Ensure DELETE policy exists and filters by company_id
DROP POLICY IF EXISTS "Admins can delete team members" ON public.equipe;
CREATE POLICY "Admins can delete team members"
ON public.equipe
FOR DELETE
TO authenticated
USING (
  company_id = get_user_company_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

COMMENT ON POLICY "Users can view team members in their company" ON public.equipe IS
'Ensures users can only see employees from their own company, enforcing multi-tenancy isolation';
