-- =====================================================
-- CORRIGER LES POLITIQUES RLS DU BUCKET STORAGE "signatures"
-- =====================================================
-- Problème : Les employés ne peuvent pas uploader de signatures
-- Solution : Ajouter des politiques pour permettre l'upload et la lecture
-- =====================================================

-- 1. Supprimer les anciennes politiques du bucket signatures
DROP POLICY IF EXISTS "Authenticated users can upload signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload signatures to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Employees can upload signatures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read signatures" ON storage.objects;

-- 2. Politique pour permettre l'UPLOAD de signatures
-- Les employés authentifiés peuvent uploader dans le bucket "signatures"
CREATE POLICY "Employees can upload signatures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
);

-- 3. Politique pour permettre la LECTURE de signatures
-- Tous les utilisateurs authentifiés peuvent lire les signatures
CREATE POLICY "Authenticated users can read signatures"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'signatures'
);

-- 4. Politique pour permettre la MISE À JOUR de signatures
CREATE POLICY "Employees can update their signatures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'signatures'
);

-- 5. Politique pour permettre la SUPPRESSION de signatures (optionnel)
CREATE POLICY "Employees can delete their signatures"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'signatures'
);

-- 6. S'assurer que le bucket existe et est configuré correctement
-- Note: Si le bucket n'existe pas, il faut le créer via l'interface Supabase Storage
-- ou avec cette commande :
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', false)
ON CONFLICT (id) DO UPDATE SET
  public = false;

-- =====================================================
-- INSTRUCTIONS :
-- 1. Copier tout ce script
-- 2. Aller dans SQL Editor de Supabase
-- 3. Coller et exécuter
-- 4. Tester l'enregistrement d'une signature
-- =====================================================
