-- Fix infinite recursion in user_roles RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can view their company role" ON user_roles;

-- Create simple, non-recursive RLS policy
CREATE POLICY "Users can view their own role"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);