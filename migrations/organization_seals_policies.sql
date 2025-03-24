-- Politiques pour le bucket organization-seals
-- Suivant le même modèle que pour les autres buckets comme logos et signatures

-- Vérifier d'abord si le bucket existe 
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'organization-seals'
  ) THEN
    -- Supprimer toutes les politiques existantes pour éviter les doublons
    DROP POLICY IF EXISTS "Les administrateurs peuvent ajouter des tampons" ON storage.objects;
    DROP POLICY IF EXISTS "Les administrateurs peuvent mettre à jour des tampons" ON storage.objects;
    DROP POLICY IF EXISTS "Les administrateurs peuvent supprimer des tampons" ON storage.objects;
    DROP POLICY IF EXISTS "Les utilisateurs peuvent ajouter des tampons" ON storage.objects;
    DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour leurs tampons" ON storage.objects;
    DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs tampons" ON storage.objects;
    DROP POLICY IF EXISTS "Tout le monde peut voir les tampons" ON storage.objects;
    
    -- Politique pour permettre aux administrateurs d'ajouter des tampons
    CREATE POLICY "Les administrateurs peuvent ajouter des tampons"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'organization-seals'
        AND (auth.role() = 'authenticated' AND EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid() 
          AND auth.users.role = 'admin'
        ))
      );
    
    -- Politique pour permettre aux administrateurs de mettre à jour des tampons
    CREATE POLICY "Les administrateurs peuvent mettre à jour des tampons"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'organization-seals'
        AND (auth.role() = 'authenticated' AND EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid() 
          AND auth.users.role = 'admin'
        ))
      );
    
    -- Politique pour permettre aux administrateurs de supprimer des tampons
    CREATE POLICY "Les administrateurs peuvent supprimer des tampons"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'organization-seals'
        AND (auth.role() = 'authenticated' AND EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid() 
          AND auth.users.role = 'admin'
        ))
      );
    
    -- Politique pour permettre aux utilisateurs authentifiés d'ajouter des tampons
    CREATE POLICY "Les utilisateurs peuvent ajouter des tampons"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'organization-seals'
        AND auth.role() = 'authenticated'
      );
    
    -- Politique pour permettre aux utilisateurs de mettre à jour leurs propres tampons
    CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs tampons"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'organization-seals'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    
    -- Politique pour permettre aux utilisateurs de supprimer leurs propres tampons
    CREATE POLICY "Les utilisateurs peuvent supprimer leurs tampons"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'organization-seals'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    
    -- Politique pour permettre à tout le monde de voir les tampons
    CREATE POLICY "Tout le monde peut voir les tampons"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'organization-seals'
      );
      
    -- Rendre le bucket public
    UPDATE storage.buckets
    SET public = TRUE
    WHERE name = 'organization-seals';
  ELSE
    RAISE NOTICE 'Le bucket organization-seals n''existe pas. Veuillez d''abord créer le bucket.';
  END IF;
END
$$; 