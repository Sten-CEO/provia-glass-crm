-- ================================================================
-- SCRIPT POUR LIER VOTRE UTILISATEUR À UNE COMPANY
-- Exécutez ce script dans Supabase Dashboard > SQL Editor
-- ================================================================

-- ========================================
-- ÉTAPE 1: DIAGNOSTIC - Affiche l'état actuel
-- ========================================

-- Afficher votre user_id actuel
SELECT
  auth.uid() as mon_user_id,
  auth.email() as mon_email;

-- Vérifier si vous êtes dans user_roles
SELECT 'user_roles' as table_name, * FROM user_roles WHERE user_id = auth.uid();

-- Vérifier si vous êtes dans equipe
SELECT 'equipe' as table_name, id, nom, prenom, email, user_id, company_id FROM equipe WHERE user_id = auth.uid();

-- Lister toutes les companies existantes
SELECT 'companies existantes' as info, id, name, owner_user_id FROM companies;

-- ========================================
-- ÉTAPE 2: CRÉER UNE COMPANY SI AUCUNE N'EXISTE
-- ========================================

-- Cette requête crée une company uniquement s'il n'en existe pas
INSERT INTO companies (name, owner_user_id)
SELECT 'Provia Glass', auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM companies LIMIT 1);

-- ========================================
-- ÉTAPE 3: LIER L'UTILISATEUR À LA COMPANY
-- ========================================

-- Récupérer l'ID de la company (la première trouvée)
DO $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
BEGIN
  -- Récupérer l'user_id actuel
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'ERREUR: Vous devez être connecté pour exécuter ce script!';
    RETURN;
  END IF;

  -- Récupérer la company_id
  SELECT id INTO v_company_id FROM companies LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE NOTICE 'ERREUR: Aucune company trouvée!';
    RETURN;
  END IF;

  RAISE NOTICE 'User ID: %, Company ID: %', v_user_id, v_company_id;

  -- Insérer dans user_roles si pas déjà présent
  INSERT INTO user_roles (user_id, role, company_id)
  VALUES (v_user_id, 'admin', v_company_id)
  ON CONFLICT (user_id, role)
  DO UPDATE SET company_id = EXCLUDED.company_id;

  RAISE NOTICE 'Utilisateur lié à la company avec succès!';
END $$;

-- ========================================
-- ÉTAPE 4: VÉRIFICATION FINALE
-- ========================================

-- Vérifier que get_user_company_id() retourne maintenant une valeur
SELECT
  get_user_company_id() as company_id_apres_fix,
  CASE
    WHEN get_user_company_id() IS NOT NULL THEN '✅ SUCCÈS - Vous pouvez maintenant créer des interventions!'
    ELSE '❌ ÉCHEC - Le problème persiste'
  END as statut;

-- Afficher votre rôle maintenant
SELECT
  ur.user_id,
  ur.role,
  ur.company_id,
  c.name as company_name
FROM user_roles ur
JOIN companies c ON c.id = ur.company_id
WHERE ur.user_id = auth.uid();
