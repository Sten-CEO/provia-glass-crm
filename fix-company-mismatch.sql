-- Script pour corriger le mismatch entre user_roles.company_id et company_settings
-- Cas où user_roles a un company_id qui n'existe pas dans company_settings

-- 1. Vérifier tous les company_id dans user_roles
SELECT
  ur.user_id,
  ur.company_id as user_role_company_id,
  au.email,
  CASE
    WHEN cs.company_id IS NULL THEN '❌ MANQUANT dans company_settings'
    ELSE '✅ OK'
  END as status
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
LEFT JOIN company_settings cs ON cs.company_id = ur.company_id
ORDER BY status;

-- 2. Créer les entrées manquantes dans company_settings
-- pour tous les company_id qui existent dans user_roles mais pas dans company_settings
INSERT INTO company_settings (company_id, company_name, country)
SELECT DISTINCT
  ur.company_id,
  'Mon Entreprise',
  'FR'
FROM user_roles ur
LEFT JOIN company_settings cs ON cs.company_id = ur.company_id
WHERE cs.company_id IS NULL
  AND ur.company_id IS NOT NULL;

-- 3. Vérifier que tout est maintenant OK
SELECT
  ur.user_id,
  ur.company_id,
  au.email,
  cs.company_name,
  CASE
    WHEN cs.company_id IS NULL THEN '❌ PROBLÈME'
    ELSE '✅ OK'
  END as status
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
LEFT JOIN company_settings cs ON cs.company_id = ur.company_id
ORDER BY status, au.email;
