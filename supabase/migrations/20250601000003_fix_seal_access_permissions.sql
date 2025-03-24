-- Fix pour permettre l'accès public en lecture aux tampons dans le sous-dossier 'seals/'
-- Complément à la migration précédente qui gérait uniquement l'upload

BEGIN;

-- Supprimer les politiques existantes qui pourraient interférer
DROP POLICY IF EXISTS "Public Seal Access" ON storage.objects;

-- Créer une politique spécifique pour l'accès public en lecture aux tampons
CREATE POLICY "Public Seal Access"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'signatures' 
  AND name LIKE 'seals/%'
);

-- Vérifier et mettre à jour la politique générale si nécessaire
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

-- Accorder des droits d'UPDATE pour permettre aussi l'écrasement des fichiers
DROP POLICY IF EXISTS "Authenticated Seal Update" ON storage.objects;
CREATE POLICY "Authenticated Seal Update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'signatures' 
  AND name LIKE 'seals/%'
  AND auth.role() = 'authenticated'
);

-- Assurer à nouveau que le bucket est bien public
UPDATE storage.buckets
SET public = true
WHERE id = 'signatures';

-- Création manuelle du dossier seals s'il n'existe pas
-- Cette opération n'est généralement pas nécessaire, mais peut aider dans certains cas
DO $$
DECLARE 
  v_count integer;
BEGIN
  -- Vérifier si le dossier existe déjà
  SELECT COUNT(*) INTO v_count 
  FROM storage.objects 
  WHERE bucket_id = 'signatures' AND name = 'seals/.emptydir';
  
  -- Si le dossier n'existe pas, créer un fichier vide pour le matérialiser
  IF v_count = 0 THEN
    -- Cette approche dépend de l'API PostgreSQL mais peut ne pas fonctionner dans tous les cas
    -- Pour une solution plus robuste, utilisez l'API REST de Supabase ou l'interface utilisateur
    RAISE NOTICE 'Le dossier seals/ n''existe pas. Créez-le manuellement dans l''interface Supabase.';
  END IF;
END
$$;

COMMIT; 