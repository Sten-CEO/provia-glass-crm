-- Change new user signup to create 'owner' role instead of 'admin'
-- This ensures the first person who signs up for a company is the owner

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
  -- Changed from 'admin' to 'owner' - the person who signs up owns the company
  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (NEW.id, new_company_id, 'owner');

  RETURN NEW;
END;
$$;
