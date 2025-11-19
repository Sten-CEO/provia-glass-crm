-- Simplify user_roles RLS policies to avoid any recursion
DROP POLICY IF EXISTS "users_can_view_own_role" ON user_roles;
DROP POLICY IF EXISTS "admins_can_view_company_roles" ON user_roles;
DROP POLICY IF EXISTS "admins_can_insert_roles" ON user_roles;
DROP POLICY IF EXISTS "admins_can_update_roles" ON user_roles;
DROP POLICY IF EXISTS "admins_can_delete_roles" ON user_roles;

-- Simple, non-recursive policies

-- Policy 1: Users can always view their own role (no function calls)
CREATE POLICY "users_view_own_role"
ON user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Owners can view all roles in their company (no recursion)
CREATE POLICY "owners_view_company_roles"
ON user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM companies
    WHERE companies.id = user_roles.company_id
    AND companies.owner_user_id = auth.uid()
  )
);

-- Policy 3: Owners can insert roles in their company
CREATE POLICY "owners_insert_roles"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM companies
    WHERE companies.id = user_roles.company_id
    AND companies.owner_user_id = auth.uid()
  )
);

-- Policy 4: Owners can update roles in their company
CREATE POLICY "owners_update_roles"
ON user_roles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM companies
    WHERE companies.id = user_roles.company_id
    AND companies.owner_user_id = auth.uid()
  )
);

-- Policy 5: Owners can delete roles in their company (except their own)
CREATE POLICY "owners_delete_roles"
ON user_roles
FOR DELETE
TO authenticated
USING (
  user_id != auth.uid()
  AND EXISTS (
    SELECT 1 FROM companies
    WHERE companies.id = user_roles.company_id
    AND companies.owner_user_id = auth.uid()
  )
);