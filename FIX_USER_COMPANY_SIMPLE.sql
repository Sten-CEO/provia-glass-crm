-- ================================================================
-- VERSION SIMPLIFIÉE - EXÉCUTEZ CHAQUE BLOC SÉPARÉMENT
-- ================================================================

-- ========================================
-- BLOC 1: Exécutez d'abord pour voir votre user_id
-- ========================================
SELECT auth.uid() as mon_user_id;

-- ========================================
-- BLOC 2: Voir toutes les companies existantes
-- ========================================
SELECT id, name FROM companies;

-- ========================================
-- BLOC 3: CRÉER UNE COMPANY (si aucune n'existe)
-- Exécutez UNIQUEMENT si BLOC 2 ne retourne rien
-- ========================================
INSERT INTO companies (name, owner_user_id)
VALUES ('Provia Glass', auth.uid());

-- ========================================
-- BLOC 4: LIER VOTRE UTILISATEUR À LA COMPANY
-- Remplacez 'VOTRE_COMPANY_ID' par l'ID de la company du BLOC 2
-- ========================================

-- Option A: Si vous connaissez l'ID de votre company
-- INSERT INTO user_roles (user_id, role, company_id)
-- VALUES (auth.uid(), 'admin', 'VOTRE_COMPANY_ID')
-- ON CONFLICT (user_id, role) DO UPDATE SET company_id = EXCLUDED.company_id;

-- Option B: Utilise automatiquement la première company trouvée
INSERT INTO user_roles (user_id, role, company_id)
SELECT auth.uid(), 'admin', (SELECT id FROM companies LIMIT 1)
ON CONFLICT (user_id, role)
DO UPDATE SET company_id = EXCLUDED.company_id;

-- ========================================
-- BLOC 5: VÉRIFICATION - Exécutez pour confirmer
-- ========================================
SELECT
  get_user_company_id() as company_id,
  CASE
    WHEN get_user_company_id() IS NOT NULL THEN 'SUCCÈS!'
    ELSE 'ÉCHEC'
  END as statut;
