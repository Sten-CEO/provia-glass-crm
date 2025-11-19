
-- Fix equipe RLS policies - combiner filtrage company avec checks de rôle
DROP POLICY IF EXISTS "Employees can view their own profile" ON public.equipe;
DROP POLICY IF EXISTS "Users can view their company team" ON public.equipe;

-- Policy unifiée pour SELECT qui combine company_id ET rôles
CREATE POLICY "Users can view their company team members"
ON public.equipe FOR SELECT TO public
USING (
  company_id = get_user_company_id() 
  AND (
    auth.uid() = user_id -- L'employé peut voir son propre profil
    OR has_role(auth.uid(), 'admin'::app_role) -- Les admins voient tous les membres de LEUR company
    OR has_role(auth.uid(), 'manager'::app_role) -- Les managers voient tous les membres de LEUR company
  )
);

-- Vérifier les autres tables pour le même problème
-- Jobs table
DROP POLICY IF EXISTS "Employees can view assigned interventions" ON public.jobs;
DROP POLICY IF EXISTS "Users can view their company interventions" ON public.jobs;

CREATE POLICY "Users can view their company interventions"
ON public.jobs FOR SELECT TO authenticated
USING (company_id = get_user_company_id());
