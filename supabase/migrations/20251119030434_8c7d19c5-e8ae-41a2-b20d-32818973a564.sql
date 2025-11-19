-- Function to handle new user signup and company creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create a new company for the user
  INSERT INTO public.companies (name, owner_user_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.email || '''s Company'),
    NEW.id
  )
  RETURNING id INTO new_company_id;

  -- Create user_role entry linking user to company
  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (NEW.id, new_company_id, 'admin');

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users for new signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to auto-populate company_id on INSERT
CREATE OR REPLACE FUNCTION public.set_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set company_id if not already set
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Add triggers to auto-populate company_id on main tables
DROP TRIGGER IF EXISTS set_company_id_trigger ON public.clients;
CREATE TRIGGER set_company_id_trigger
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_company_id();

DROP TRIGGER IF EXISTS set_company_id_trigger ON public.devis;
CREATE TRIGGER set_company_id_trigger
  BEFORE INSERT ON public.devis
  FOR EACH ROW
  EXECUTE FUNCTION public.set_company_id();

DROP TRIGGER IF EXISTS set_company_id_trigger ON public.factures;
CREATE TRIGGER set_company_id_trigger
  BEFORE INSERT ON public.factures
  FOR EACH ROW
  EXECUTE FUNCTION public.set_company_id();

DROP TRIGGER IF EXISTS set_company_id_trigger ON public.jobs;
CREATE TRIGGER set_company_id_trigger
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_company_id();

DROP TRIGGER IF EXISTS set_company_id_trigger ON public.inventory_items;
CREATE TRIGGER set_company_id_trigger
  BEFORE INSERT ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_company_id();

DROP TRIGGER IF EXISTS set_company_id_trigger ON public.agenda_events;
CREATE TRIGGER set_company_id_trigger
  BEFORE INSERT ON public.agenda_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_company_id();

DROP TRIGGER IF EXISTS set_company_id_trigger ON public.notifications;
CREATE TRIGGER set_company_id_trigger
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_company_id();