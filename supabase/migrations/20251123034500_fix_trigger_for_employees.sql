-- Fix handle_new_user trigger to NOT execute for employees created via edge function
-- This prevents the trigger from creating a company and overwriting roles
-- for employee accounts created through create-employee-account edge function

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- ✅ NEW: Skip trigger for employee accounts created via edge function
  -- Employee accounts have is_employee = true in raw_user_meta_data
  IF (NEW.raw_user_meta_data->>'is_employee')::boolean IS TRUE THEN
    -- This is an employee account created by the edge function
    -- Do NOT create a company or role - the edge function handles this
    RETURN NEW;
  END IF;

  -- For regular company signup (NOT employees):
  -- Create a new company for the user
  INSERT INTO public.companies (name, owner_user_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.email || '''s Company'),
    NEW.id
  )
  RETURNING id INTO new_company_id;

  -- Create user_role entry linking user to company as owner
  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (NEW.id, new_company_id, 'owner');

  RETURN NEW;
END;
$$;

-- The trigger already exists, no need to recreate it
-- It will automatically use the updated function
