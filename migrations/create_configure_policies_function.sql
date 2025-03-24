-- Créer une fonction pour configurer les politiques du bucket organization-seals
-- Cette fonction peut être appelée via supabase.rpc('configure_organization_seals_policies')

CREATE OR REPLACE FUNCTION public.configure_organization_seals_policies()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Exécution avec les privilèges du créateur (superuser)
AS $$
DECLARE
  bucket_exists boolean;
BEGIN
  -- Vérifier si le bucket existe
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'organization-seals'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    RAISE EXCEPTION 'Le bucket organization-seals n''existe pas';
    RETURN false;
  END IF;
  
  -- Supprimer les politiques existantes pour éviter les doublons
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
  
  RETURN true;
END;
$$; 