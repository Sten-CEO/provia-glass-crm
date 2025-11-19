-- Fix RLS policies for equipe table to allow admins to insert employees with company_id

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view team members in their company" ON public.equipe;
DROP POLICY IF EXISTS "Admins can manage team members" ON public.equipe;
DROP POLICY IF EXISTS "Users can insert team members" ON public.equipe;
DROP POLICY IF EXISTS "Users can update team members" ON public.equipe;
DROP POLICY IF EXISTS "Users can delete team members" ON public.equipe;

-- Enable RLS
ALTER TABLE public.equipe ENABLE ROW LEVEL SECURITY;

-- Allow users to view team members in their company
CREATE POLICY "Users can view team members in their company"
ON public.equipe
FOR SELECT
USING (
  company_id = public.get_user_company_id()
);

-- Allow admins to insert team members
CREATE POLICY "Admins can insert team members"
ON public.equipe
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update team members in their company
CREATE POLICY "Admins can update team members"
ON public.equipe
FOR UPDATE
USING (
  company_id = public.get_user_company_id()
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete team members in their company
CREATE POLICY "Admins can delete team members"
ON public.equipe
FOR DELETE
USING (
  company_id = public.get_user_company_id()
  AND public.has_role(auth.uid(), 'admin'::app_role)
);