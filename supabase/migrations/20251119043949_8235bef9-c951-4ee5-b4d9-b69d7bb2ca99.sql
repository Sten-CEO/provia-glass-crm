-- Corriger la fonction handle_new_user pour NE PAS créer de company pour les employés
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
  
  -- IMPORTANT: Si c'est un employé créé par admin (flag is_employee dans metadata),
  -- ne PAS créer de company ni de user_role
  -- L'edge function s'occupe déjà de lier l'employé à la company de l'admin
  IF NEW.raw_user_meta_data->>'is_employee' = 'true' THEN
    RETURN NEW;
  END IF;
  
  -- Pour les vrais CEO/owners qui s'inscrivent normalement :
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