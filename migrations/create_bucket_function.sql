-- Création d'une fonction RPC pour créer le bucket organization-seals
-- Cette fonction est conçue pour être aussi simple que possible

CREATE OR REPLACE FUNCTION public.create_bucket_organization_seals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Exécution avec les privilèges du créateur (superuser)
AS $$
DECLARE
  bucket_exists boolean;
  result jsonb;
BEGIN
  -- Vérifier si le bucket existe déjà
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'organization-seals'
  ) INTO bucket_exists;
  
  IF bucket_exists THEN
    -- Le bucket existe déjà
    result := json_build_object(
      'success', true,
      'message', 'Le bucket organization-seals existe déjà',
      'created', false
    );
    RETURN result;
  END IF;
  
  -- Créer le bucket
  BEGIN
    INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public, file_size_limit)
    VALUES ('organization-seals', 'organization-seals', NULL, now(), now(), TRUE, 5242880)
    ON CONFLICT (id) DO NOTHING;
    
    result := json_build_object(
      'success', true,
      'message', 'Le bucket organization-seals a été créé avec succès',
      'created', true
    );
  EXCEPTION WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'message', 'Erreur lors de la création du bucket: ' || SQLERRM,
      'created', false,
      'error', SQLERRM,
      'errcode', SQLSTATE
    );
  END;
  
  -- Tenter d'ajouter les politiques basiques
  BEGIN
    -- Politique pour permettre à tout le monde de voir les fichiers
    EXECUTE 'CREATE POLICY "Tout le monde peut voir les tampons" ON storage.objects FOR SELECT USING (bucket_id = ''organization-seals'');';
  EXCEPTION WHEN OTHERS THEN
    -- Ignorer les erreurs de politique
    result := result || jsonb_build_object('select_policy_error', SQLERRM);
  END;
  
  BEGIN
    -- Politique pour permettre aux utilisateurs authentifiés d'ajouter des fichiers
    EXECUTE 'CREATE POLICY "Les utilisateurs peuvent ajouter des tampons" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''organization-seals'' AND auth.role() = ''authenticated'');';
  EXCEPTION WHEN OTHERS THEN
    -- Ignorer les erreurs de politique
    result := result || jsonb_build_object('insert_policy_error', SQLERRM);
  END;
  
  RETURN result;
END;
$$; 