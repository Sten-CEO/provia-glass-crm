-- POINT 8: Improve handle_new_user function
-- Ensure it correctly handles employee accounts and creates company_settings

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
  company_name_val TEXT;
BEGIN
  -- ✅ Skip trigger for employee accounts created via edge function
  -- Employee accounts have is_employee = true in raw_user_meta_data
  IF (NEW.raw_user_meta_data->>'is_employee')::boolean IS TRUE THEN
    -- This is an employee account created by the edge function
    -- Do NOT create a company or role - the edge function handles this
    RETURN NEW;
  END IF;

  -- For regular company signup (NOT employees):
  -- Determine company name from metadata or email
  company_name_val := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    NEW.email || '''s Company'
  );

  -- Create a new company for the user
  INSERT INTO public.companies (name, owner_user_id)
  VALUES (company_name_val, NEW.id)
  RETURNING id INTO new_company_id;

  -- Create user_role entry linking user to company as owner
  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (NEW.id, new_company_id, 'owner');

  -- ✅ IMPROVEMENT: Create default company_settings entry
  -- This ensures every company has a settings record
  INSERT INTO public.company_settings (company_id, company_name, country)
  VALUES (new_company_id, company_name_val, 'FR')
  ON CONFLICT (company_id) DO NOTHING;

  -- ✅ IMPROVEMENT: Create default document numbering sequences
  INSERT INTO public.document_numbering (company_id, doc_type, prefix, next_number)
  VALUES
    (new_company_id, 'devis', 'DEV', 1),
    (new_company_id, 'facture', 'FAC', 1),
    (new_company_id, 'intervention', 'INT', 1)
  ON CONFLICT (company_id, doc_type) DO NOTHING;

  -- ✅ IMPROVEMENT: Create default dashboard preferences
  INSERT INTO public.dashboard_prefs (company_id, user_id)
  VALUES (new_company_id, NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Verify the trigger exists and is attached
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
