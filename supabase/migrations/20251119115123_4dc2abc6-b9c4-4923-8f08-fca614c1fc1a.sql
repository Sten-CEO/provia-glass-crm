-- Fix user_roles RLS policies to prevent infinite recursion
-- Drop all existing policies
DROP POLICY IF EXISTS "users_select_own_role" ON user_roles;
DROP POLICY IF EXISTS "admins_select_company_roles" ON user_roles;
DROP POLICY IF EXISTS "admins_insert_roles" ON user_roles;
DROP POLICY IF EXISTS "admins_update_roles" ON user_roles;
DROP POLICY IF EXISTS "admins_delete_roles" ON user_roles;

-- Create a security definer function to check user role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- Simple policy: users can always view their own role
CREATE POLICY "users_can_view_own_role"
ON user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all roles in their company
CREATE POLICY "admins_can_view_company_roles"
ON user_roles
FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'admin'
  AND company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
  )
);

-- Admins can insert roles in their company
CREATE POLICY "admins_can_insert_roles"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'admin'
  AND company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
  )
);

-- Admins can update roles in their company
CREATE POLICY "admins_can_update_roles"
ON user_roles
FOR UPDATE
TO authenticated
USING (
  get_user_role(auth.uid()) = 'admin'
  AND company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
  )
);

-- Admins can delete roles in their company
CREATE POLICY "admins_can_delete_roles"
ON user_roles
FOR DELETE
TO authenticated
USING (
  get_user_role(auth.uid()) = 'admin'
  AND company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
  )
);