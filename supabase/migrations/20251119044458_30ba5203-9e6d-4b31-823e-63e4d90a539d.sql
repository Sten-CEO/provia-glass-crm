-- Corriger les politiques RLS sur equipe pour forcer company_id à l'insertion

-- Supprimer les anciennes politiques INSERT qui ne forcent pas company_id
DROP POLICY IF EXISTS "Admins can insert team members" ON public.equipe;
DROP POLICY IF EXISTS "Users can create team members in their company" ON public.equipe;

-- Recréer une seule politique INSERT qui force company_id = celui de l'admin
CREATE POLICY "Admins can insert team members in their company"
ON public.equipe
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND company_id = get_user_company_id()
);

-- S'assurer que tous les employés existants sans company_id en obtiennent un
-- (basé sur le premier admin de la base, pour éviter les orphelins)
UPDATE public.equipe
SET company_id = (
  SELECT ur.company_id 
  FROM user_roles ur 
  WHERE ur.role = 'admin' 
  LIMIT 1
)
WHERE company_id IS NULL;