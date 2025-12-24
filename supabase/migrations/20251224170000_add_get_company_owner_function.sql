-- Function to get the owner user_id for a company
-- This function uses SECURITY DEFINER to bypass RLS and allow members to find their company owner
-- for billing subscription checks

CREATE OR REPLACE FUNCTION get_company_owner_user_id(p_company_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_user_company_id uuid;
BEGIN
  -- Security check: only allow users to query their own company
  SELECT company_id INTO v_user_company_id
  FROM user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_user_company_id IS NULL OR v_user_company_id != p_company_id THEN
    RAISE EXCEPTION 'Not authorized to access this company';
  END IF;

  -- First try to get owner from user_roles
  SELECT user_id INTO v_owner_id
  FROM user_roles
  WHERE company_id = p_company_id
    AND role = 'owner'
  LIMIT 1;

  -- If not found, try companies.owner_id
  IF v_owner_id IS NULL THEN
    SELECT owner_id INTO v_owner_id
    FROM companies
    WHERE id = p_company_id;
  END IF;

  RETURN v_owner_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_company_owner_user_id(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_company_owner_user_id(uuid) IS
  'Get the owner user_id for a company. Used for billing subscription checks.
   Only returns data if the calling user belongs to the requested company.';
