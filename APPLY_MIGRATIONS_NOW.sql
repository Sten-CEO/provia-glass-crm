-- =====================================================
-- SCRIPT À EXÉCUTER DANS SUPABASE POUR CORRIGER LES ERREURS RLS
-- =====================================================
-- Instructions :
-- 1. Aller sur https://supabase.com/dashboard
-- 2. Sélectionner votre projet
-- 3. Aller dans "SQL Editor"
-- 4. Copier-coller TOUT ce fichier
-- 5. Cliquer sur "Run"
-- =====================================================

-- Fix 1: Corriger les politiques RLS pour job_signatures
-- Problème : Les politiques ne vérifient pas company_id
-- =====================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Employees can insert their own job_signatures" ON public.job_signatures;
DROP POLICY IF EXISTS "Employees can read their own job_signatures" ON public.job_signatures;
DROP POLICY IF EXISTS "Managers can read all job_signatures" ON public.job_signatures;

-- Créer les nouvelles politiques avec vérification company_id
CREATE POLICY "Employees can insert job_signatures in their company"
ON public.job_signatures
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = get_user_company_id() AND
  employee_id IN (SELECT id FROM public.equipe WHERE user_id = auth.uid())
);

CREATE POLICY "Employees can read job_signatures in their company"
ON public.job_signatures
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id() AND
  employee_id IN (SELECT id FROM public.equipe WHERE user_id = auth.uid())
);

CREATE POLICY "Managers can read all job_signatures in their company"
ON public.job_signatures
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id() AND
  EXISTS (
    SELECT 1 FROM public.equipe e
    WHERE e.user_id = auth.uid()
    AND e.company_id = get_user_company_id()
    AND COALESCE(e.is_manager, false) = true
  )
);

-- Fix 2: Garantir que equipe filtre bien par company_id
-- =====================================================

-- Supprimer toutes les anciennes politiques permissives
DROP POLICY IF EXISTS "Allow public read access on equipe" ON public.equipe;
DROP POLICY IF EXISTS "Allow public insert access on equipe" ON public.equipe;
DROP POLICY IF EXISTS "Allow public update access on equipe" ON public.equipe;
DROP POLICY IF EXISTS "Allow public delete access on equipe" ON public.equipe;
DROP POLICY IF EXISTS "Users can view team members in their company" ON public.equipe;
DROP POLICY IF EXISTS "Users can view their company team members" ON public.equipe;
DROP POLICY IF EXISTS "Employees can view their own profile" ON public.equipe;
DROP POLICY IF EXISTS "Users can view their company team" ON public.equipe;
DROP POLICY IF EXISTS "Admins can update team members" ON public.equipe;
DROP POLICY IF EXISTS "Admins can delete team members" ON public.equipe;

-- S'assurer que RLS est activé
ALTER TABLE public.equipe ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : voir uniquement les employés de sa compagnie
CREATE POLICY "Users can view team members in their company"
ON public.equipe
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id()
);

-- Politique UPDATE : admins peuvent modifier les employés de leur compagnie
CREATE POLICY "Admins can update team members"
ON public.equipe
FOR UPDATE
TO authenticated
USING (
  company_id = get_user_company_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Politique DELETE : admins peuvent supprimer les employés de leur compagnie
CREATE POLICY "Admins can delete team members"
ON public.equipe
FOR DELETE
TO authenticated
USING (
  company_id = get_user_company_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Commentaires pour documentation
COMMENT ON POLICY "Employees can insert job_signatures in their company" ON public.job_signatures IS
'Permet aux employés d''insérer des signatures uniquement pour leur propre compagnie';

COMMENT ON POLICY "Users can view team members in their company" ON public.equipe IS
'Garantit l''isolation multi-tenant : les utilisateurs ne voient que les employés de leur compagnie';

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
-- Si aucune erreur n'apparaît, les politiques RLS sont corrigées !
-- Vous pouvez maintenant tester :
-- 1. Sélection des techniciens dans une intervention (doit montrer uniquement vos techniciens)
-- 2. Enregistrement de signature (ne doit plus avoir d'erreur RLS)
-- =====================================================
