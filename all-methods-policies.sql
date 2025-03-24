
      -- Créer les politiques pour le bucket organization-seals
      -- Politique pour permettre à tout le monde de voir les tampons
      DO $$
      BEGIN
        -- Suppression des politiques existantes si elles existent
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
        
        -- Créer les nouvelles politiques
        CREATE POLICY "Tout le monde peut voir les tampons"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'organization-seals');
        
        CREATE POLICY "Les utilisateurs peuvent ajouter des tampons"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'organization-seals' AND auth.role() = 'authenticated');
        
        CREATE POLICY "Les utilisateurs peuvent modifier leurs tampons"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'organization-seals' AND auth.role() = 'authenticated');
        
        CREATE POLICY "Les utilisateurs peuvent supprimer leurs tampons"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'organization-seals' AND auth.role() = 'authenticated');
      END $$;
    