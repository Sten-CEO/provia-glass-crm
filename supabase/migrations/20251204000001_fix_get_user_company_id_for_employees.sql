-- Fix get_user_company_id() to support both admin/managers (user_roles) and employees (equipe)

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- First try to get company_id from user_roles (for admins/managers)
  SELECT company_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1

  UNION ALL

  -- If not found, try to get company_id from equipe (for employees)
  SELECT company_id
  FROM public.equipe
  WHERE user_id = auth.uid()
  LIMIT 1

  -- Return the first result found
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_company_id() IS
'Returns the company_id for the current authenticated user.
Looks in user_roles first (for admins/managers), then in equipe table (for employees).';
