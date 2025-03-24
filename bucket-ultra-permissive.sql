-- Script SQL ultra-permissif pour créer le bucket "organization-seals"
-- Ce script configure des politiques d'accès sans aucune vérification d'authentification
-- À exécuter directement dans l'interface SQL de Supabase

-- Création du bucket s'il n'existe pas
DO $$
BEGIN
  -- Vérifier si le bucket existe déjà
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'organization-seals') THEN
    -- Créer le bucket
    INSERT INTO storage.buckets (id, name, public, created_at)
    VALUES ('organization-seals', 'organization-seals', true, NOW());
    
    RAISE NOTICE 'Bucket "organization-seals" créé avec succès!';
  ELSE
    RAISE NOTICE 'Le bucket "organization-seals" existe déjà!';
  END IF;
  
  -- Supprimer les politiques existantes
  BEGIN
    DROP POLICY IF EXISTS "Tout le monde peut voir les tampons" ON storage.objects;
  EXCEPTION WHEN others THEN
    -- Ignorer les erreurs
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Les utilisateurs peuvent ajouter des tampons" ON storage.objects;
  EXCEPTION WHEN others THEN
    -- Ignorer les erreurs
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs tampons" ON storage.objects;
  EXCEPTION WHEN others THEN
    -- Ignorer les erreurs
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs tampons" ON storage.objects;
  EXCEPTION WHEN others THEN
    -- Ignorer les erreurs
  END;
  
  -- IMPORTANT : Créer des politiques ULTRA-PERMISSIVES sans aucune vérification d'authentification
  -- Ces politiques permettent à TOUT LE MONDE de faire TOUTES LES OPÉRATIONS sur le bucket
  
  -- Politique pour permettre à tout le monde de voir les tampons
  CREATE POLICY "Tout le monde peut voir les tampons"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'organization-seals');
  
  -- Politique pour permettre à tout le monde d'ajouter des tampons
  CREATE POLICY "Les utilisateurs peuvent ajouter des tampons"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'organization-seals');  -- Aucune vérification d'authentification
  
  -- Politique pour permettre à tout le monde de modifier les tampons
  CREATE POLICY "Les utilisateurs peuvent modifier leurs tampons"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'organization-seals');  -- Aucune vérification d'authentification
  
  -- Politique pour permettre à tout le monde de supprimer les tampons
  CREATE POLICY "Les utilisateurs peuvent supprimer leurs tampons"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'organization-seals');  -- Aucune vérification d'authentification
  
  RAISE NOTICE 'Politiques ultra-permissives configurées avec succès!';
  RAISE NOTICE 'ATTENTION: Ces politiques permettent à TOUT LE MONDE de faire TOUTES LES OPÉRATIONS sur le bucket.';
  RAISE NOTICE 'À utiliser uniquement en dernier recours ou pour le débogage.';
END $$;

-- Vérifier que le bucket existe après les opérations
SELECT EXISTS (
  SELECT 1 FROM storage.buckets WHERE name = 'organization-seals'
) AS "Le bucket 'organization-seals' existe";

-- Lister les politiques configurées
SELECT
  pol.policyname AS "Nom de la politique",
  obj.relname AS "Table",
  CASE pol.cmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    ELSE pol.cmd::text
  END AS "Opération",
  pol.qual AS "Condition USING",
  pol.with_check AS "Condition WITH CHECK"
FROM
  pg_catalog.pg_policy pol
  JOIN pg_catalog.pg_class obj ON obj.oid = pol.polrelid
  JOIN pg_catalog.pg_namespace ns ON ns.oid = obj.relnamespace
WHERE
  ns.nspname = 'storage'
  AND obj.relname = 'objects'
  AND pol.policyname LIKE '%tampons%'
ORDER BY
  pol.policyname; 