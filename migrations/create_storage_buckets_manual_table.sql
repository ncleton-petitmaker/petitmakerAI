-- Création d'une table pour la création manuelle de buckets
-- Cette approche contourne les restrictions d'accès direct à storage.buckets

-- 1. Créer une table intermédiaire accessible via l'API Supabase
CREATE TABLE IF NOT EXISTS public.storage_buckets_manual (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  owner UUID,
  public BOOLEAN DEFAULT true,
  file_size_limit INTEGER DEFAULT 5242880, -- 5MB en octets
  created_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false
);

-- 2. Permettre l'accès à cette table via l'API REST
ALTER TABLE public.storage_buckets_manual ENABLE ROW LEVEL SECURITY;

-- 3. Politique pour permettre aux utilisateurs authentifiés d'insérer
CREATE POLICY "Les utilisateurs authentifiés peuvent insérer des buckets manuels"
ON public.storage_buckets_manual
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Fonction trigger pour créer le bucket réel dans storage.buckets
CREATE OR REPLACE FUNCTION public.create_storage_bucket_from_manual()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Exécution avec les privilèges du créateur (superuser)
AS $$
DECLARE
  bucket_exists boolean;
BEGIN
  -- Vérifier si le bucket existe déjà
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = NEW.name
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    -- Créer le bucket
    INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public, file_size_limit)
    VALUES (NEW.name, NEW.name, NEW.owner, now(), now(), NEW.public, NEW.file_size_limit)
    ON CONFLICT (id) DO NOTHING;
    
    -- Essayer de créer des politiques basiques pour le nouveau bucket
    BEGIN
      -- Politique pour permettre à tout le monde de voir les fichiers
      EXECUTE format('CREATE POLICY "Tout le monde peut voir les fichiers de %s" ON storage.objects FOR SELECT USING (bucket_id = %L);', NEW.name, NEW.name);
      
      -- Politique pour permettre aux utilisateurs authentifiés d'ajouter des fichiers
      EXECUTE format('CREATE POLICY "Les utilisateurs peuvent ajouter des fichiers à %s" ON storage.objects FOR INSERT WITH CHECK (bucket_id = %L AND auth.role() = ''authenticated'');', NEW.name, NEW.name);
    EXCEPTION WHEN OTHERS THEN
      -- Ignorer les erreurs de politique
      RAISE NOTICE 'Erreur lors de la création des politiques: %', SQLERRM;
    END;
  END IF;
  
  -- Marquer comme traité
  UPDATE public.storage_buckets_manual
  SET processed = true
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- 5. Créer le trigger sur la table
DROP TRIGGER IF EXISTS storage_buckets_manual_trigger ON public.storage_buckets_manual;
CREATE TRIGGER storage_buckets_manual_trigger
AFTER INSERT ON public.storage_buckets_manual
FOR EACH ROW
EXECUTE FUNCTION public.create_storage_bucket_from_manual(); 