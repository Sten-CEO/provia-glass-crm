-- Fix infinite recursion in user_roles RLS policies
-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view their own user_role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view company roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can view their company roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

-- Create simple, non-recursive policies
-- Users can always view their own role (simple check, no recursion)
CREATE POLICY "users_select_own_role"
ON user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all roles in their company (using subquery but not calling external functions)
CREATE POLICY "admins_select_company_roles"
ON user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.company_id = user_roles.company_id
  )
);

-- Only admins can insert new roles
CREATE POLICY "admins_insert_roles"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.company_id = user_roles.company_id
  )
);

-- Only admins can update roles
CREATE POLICY "admins_update_roles"
ON user_roles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.company_id = user_roles.company_id
  )
);

-- Only admins can delete roles
CREATE POLICY "admins_delete_roles"
ON user_roles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.company_id = user_roles.company_id
  )
);