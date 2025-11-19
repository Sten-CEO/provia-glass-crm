
-- ===============================================
-- MIGRATION: Architecture multi-tenant Company/User/Roles
-- ===============================================

-- 1. Ajouter company_id à user_roles si pas déjà présent
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Créer index sur company_id pour performance
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON public.user_roles(company_id);

-- 3. Fonction pour créer une company lors du signup d'un CEO/owner
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
  user_email TEXT;
BEGIN
  -- Récupérer l'email de l'utilisateur
  user_email := NEW.email;
  
  -- Créer une nouvelle company pour ce user
  INSERT INTO public.companies (name, owner_user_id, created_at)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', user_email || '''s Company'),
    NEW.id,
    NOW()
  )
  RETURNING id INTO new_company_id;
  
  -- Créer le rôle admin pour ce user avec company_id
  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (NEW.id, new_company_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Créer company_settings avec le company_id
  INSERT INTO public.company_settings (company_id, company_name, created_at, updated_at)
  VALUES (new_company_id, COALESCE(NEW.raw_user_meta_data->>'company_name', user_email || '''s Company'), NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 4. Créer trigger sur auth.users (si pas déjà existant)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Fonction helper pour obtenir le company_id de l'utilisateur actuel
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 6. Fonction helper pour obtenir le rôle de l'utilisateur actuel
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 7. RLS sur user_roles: users peuvent voir leurs propres rôles et ceux de leur company
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR company_id = get_user_company_id()
  );

-- 8. RLS sur user_roles: seuls admins peuvent insérer des rôles pour leur company
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND has_role(auth.uid(), 'admin')
  );

-- 9. Nettoyer les données orphelines: assigner company_id aux user_roles existants
UPDATE public.user_roles ur
SET company_id = (
  SELECT c.id 
  FROM public.companies c
  WHERE c.owner_user_id = ur.user_id
  LIMIT 1
)
WHERE ur.company_id IS NULL;

-- 10. Nettoyer les équipes sans company_id: les assigner au company de leur propriétaire
UPDATE public.equipe e
SET company_id = (
  SELECT ur.company_id
  FROM public.user_roles ur
  WHERE ur.user_id = e.user_id
  LIMIT 1
)
WHERE e.company_id IS NULL AND e.user_id IS NOT NULL;

-- 11. Rendre company_id NOT NULL après cleanup (optionnel, pour forcer l'intégrité)
-- ALTER TABLE public.user_roles ALTER COLUMN company_id SET NOT NULL;
