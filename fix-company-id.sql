-- Script pour corriger les company_id manquants
-- À exécuter dans Supabase SQL Editor

-- 1. Trouver tous les users sans company_id dans user_roles
SELECT
  ur.user_id,
  ur.role,
  ur.company_id,
  au.email
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.company_id IS NULL;

-- 2. Pour chaque user sans company_id, créer une nouvelle entreprise
-- et assigner le company_id
DO $$
DECLARE
  user_record RECORD;
  new_company_id UUID;
BEGIN
  -- Pour chaque utilisateur sans company_id
  FOR user_record IN
    SELECT ur.user_id, ur.role, au.email
    FROM user_roles ur
    JOIN auth.users au ON au.id = ur.user_id
    WHERE ur.company_id IS NULL
  LOOP
    -- Créer une nouvelle entrée dans company_settings
    INSERT INTO company_settings (company_id, company_name, country)
    VALUES (gen_random_uuid(), 'Mon Entreprise', 'FR')
    RETURNING company_id INTO new_company_id;

    -- Mettre à jour user_roles avec le nouveau company_id
    UPDATE user_roles
    SET company_id = new_company_id
    WHERE user_id = user_record.user_id;

    RAISE NOTICE 'Created company % for user % (role: %)',
      new_company_id, user_record.email, user_record.role;
  END LOOP;
END $$;

-- 3. Corriger les membres dans equipe qui ont company_id NULL
-- en leur assignant le company_id de leur user dans user_roles
UPDATE equipe e
SET company_id = ur.company_id
FROM user_roles ur
WHERE e.user_id = ur.user_id
  AND e.company_id IS NULL
  AND ur.company_id IS NOT NULL;

-- 4. Pour les membres dans equipe qui n'ont pas de user_id associé,
-- on ne peut pas les corriger automatiquement - les afficher
SELECT
  id,
  nom,
  email,
  role,
  company_id
FROM equipe
WHERE company_id IS NULL;

-- 5. Vérifier que tout est corrigé
SELECT
  ur.user_id,
  ur.role,
  ur.company_id,
  au.email,
  CASE
    WHEN ur.company_id IS NULL THEN '❌ PROBLÈME: pas de company_id'
    ELSE '✅ OK'
  END as status
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
ORDER BY status, au.email;
