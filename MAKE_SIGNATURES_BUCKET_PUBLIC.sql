-- =====================================================
-- RENDRE LE BUCKET SIGNATURES PUBLIC
-- =====================================================
-- Cela permet d'afficher les images de signature sans problème
-- =====================================================

-- Rendre le bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'signatures';

-- Vérifier que c'est bien public maintenant
SELECT id, name, public FROM storage.buckets WHERE id = 'signatures';

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Le bucket signatures est maintenant PUBLIC. Les images de signature seront visibles !';
END $$;
