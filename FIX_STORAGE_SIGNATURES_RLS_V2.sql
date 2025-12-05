-- =====================================================
-- CORRIGER LES POLITIQUES RLS DU BUCKET STORAGE "signatures"
-- VERSION IDEMPOTENTE (peut être exécutée plusieurs fois)
-- =====================================================

-- Supprimer TOUTES les politiques existantes pour le bucket signatures
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname LIKE '%signature%'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Créer les nouvelles politiques
CREATE POLICY "Employees can upload signatures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
);

CREATE POLICY "Authenticated users can read signatures"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'signatures'
);

CREATE POLICY "Employees can update their signatures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'signatures'
);

CREATE POLICY "Employees can delete their signatures"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'signatures'
);

-- S'assurer que le bucket existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', false)
ON CONFLICT (id) DO UPDATE SET
  public = false;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Politiques RLS du bucket signatures configurées avec succès !';
END $$;
