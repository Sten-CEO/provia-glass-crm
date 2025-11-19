-- Créer un trigger pour setter automatiquement company_id lors de l'insertion d'un employé

CREATE OR REPLACE FUNCTION public.set_employee_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si company_id n'est pas fourni, le récupérer depuis user_roles
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger BEFORE INSERT sur equipe
DROP TRIGGER IF EXISTS set_employee_company_id_trigger ON public.equipe;
CREATE TRIGGER set_employee_company_id_trigger
  BEFORE INSERT ON public.equipe
  FOR EACH ROW
  EXECUTE FUNCTION public.set_employee_company_id();