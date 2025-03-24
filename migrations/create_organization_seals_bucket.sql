-- Script pour créer le bucket "organization-seals" dans Supabase Storage

-- Vérifier si le bucket existe déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'organization-seals'
  ) THEN
    -- Créer le bucket pour les tampons d'organisation
    INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public)
    VALUES ('organization-seals', 'organization-seals', NULL, now(), now(), TRUE);
    
    RAISE NOTICE 'Le bucket "organization-seals" a été créé avec succès.';
  ELSE
    RAISE NOTICE 'Le bucket "organization-seals" existe déjà.';
  END IF;
END
$$;

-- Ajouter les politiques d'accès pour le bucket
DO $$
BEGIN
  -- Suppression des politiques existantes pour éviter les doublons
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
    
  RAISE NOTICE 'Les politiques pour le bucket "organization-seals" ont été créées avec succès.';
END
$$; 