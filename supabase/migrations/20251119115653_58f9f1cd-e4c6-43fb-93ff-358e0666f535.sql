-- SUPPRIMER ABSOLUMENT TOUTES LES POLICIES EXISTANTES sur user_roles
DROP POLICY IF EXISTS "Admins can manage their company roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view roles in their company" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "users_can_view_own_role" ON user_roles;
DROP POLICY IF EXISTS "admins_can_view_company_roles" ON user_roles;
DROP POLICY IF EXISTS "admins_can_insert_roles" ON user_roles;
DROP POLICY IF EXISTS "admins_can_update_roles" ON user_roles;
DROP POLICY IF EXISTS "admins_can_delete_roles" ON user_roles;
DROP POLICY IF EXISTS "users_view_own_role" ON user_roles;
DROP POLICY IF EXISTS "owners_view_company_roles" ON user_roles;
DROP POLICY IF EXISTS "owners_insert_roles" ON user_roles;
DROP POLICY IF EXISTS "owners_update_roles" ON user_roles;
DROP POLICY IF EXISTS "owners_delete_roles" ON user_roles;
DROP POLICY IF EXISTS "user_view_own" ON user_roles;
DROP POLICY IF EXISTS "authenticated_view_all" ON user_roles;
DROP POLICY IF EXISTS "authenticated_insert" ON user_roles;
DROP POLICY IF EXISTS "authenticated_update" ON user_roles;
DROP POLICY IF EXISTS "service_role_all" ON user_roles;

-- Maintenant créer UNIQUEMENT les policies simples sans AUCUNE récursion

-- 1. Chaque utilisateur peut voir son propre rôle (AUCUNE sous-requête)
CREATE POLICY "simple_user_view_own"
ON user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. Service role a tous les droits (pour les opérations backend)
CREATE POLICY "simple_service_role"
ON user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Pour le moment, permettre aux authenticated de tout voir (on restreindra plus tard)
CREATE POLICY "simple_authenticated_view"
ON user_roles
FOR SELECT
TO authenticated
USING (true);

-- 4. Permettre l'insertion par authenticated (on restreindra plus tard)
CREATE POLICY "simple_authenticated_insert"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Permettre la mise à jour par authenticated (on restreindra plus tard)
CREATE POLICY "simple_authenticated_update"
ON user_roles
FOR UPDATE
TO authenticated
USING (true);