-- Script pour ajouter la colonne need_stamp à la table documents
-- Cette colonne indique si un document nécessite un tampon (true) ou non (false)

-- Vérifier d'abord si la colonne existe déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'documents'
      AND column_name = 'need_stamp'
  ) THEN
    -- Ajouter la colonne need_stamp avec une valeur par défaut de false
    ALTER TABLE public.documents ADD COLUMN need_stamp BOOLEAN DEFAULT false;
    
    -- Ajouter un commentaire explicatif sur la colonne
    COMMENT ON COLUMN public.documents.need_stamp IS 'Indique si le document nécessite un tampon (true) ou non (false)';
    
    -- Mettre à jour les documents de type "convention" pour qu'ils nécessitent un tampon par défaut
    UPDATE public.documents SET need_stamp = true WHERE type = 'convention';
    
    RAISE NOTICE 'Colonne need_stamp ajoutée avec succès à la table documents';
  ELSE
    RAISE NOTICE 'La colonne need_stamp existe déjà dans la table documents';
  END IF;
END
$$; 