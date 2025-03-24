-- Fix pour permettre aux utilisateurs authentifiés d'uploader des tampons dans le bucket signatures
-- Cette migration crée une politique explicite pour le sous-dossier 'seals/' du bucket 'signatures'

BEGIN;

-- Supprimer les politiques existantes qui pourraient interférer
DROP POLICY IF EXISTS "Authenticated Seal Upload" ON storage.objects;

-- Créer une politique spécifique pour l'upload de tampons
CREATE POLICY "Authenticated Seal Upload"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'signatures' 
  AND name LIKE 'seals/%'
  AND auth.role() = 'authenticated'
);

-- Vérifier que la politique pour les vues est bien présente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Public Signature Access'
  ) THEN
    CREATE POLICY "Public Signature Access"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'signatures');
  END IF;
END
$$;

-- Assurer que le bucket est bien public (accessible en lecture)
UPDATE storage.buckets
SET public = true
WHERE id = 'signatures';

-- Confirmer l'existence du bucket (créer si nécessaire)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'signatures') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('signatures', 'signatures', true);
  END IF;
END
$$;

COMMIT; 