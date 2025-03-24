-- Migration pour ajouter la colonne need_stamp à la table documents
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
    -- Ajouter la colonne need_stamp avec une valeur par défaut de true (modifié)
    ALTER TABLE public.documents ADD COLUMN need_stamp BOOLEAN DEFAULT true;
    
    -- Ajouter un commentaire explicatif sur la colonne
    COMMENT ON COLUMN public.documents.need_stamp IS 'Indique si le document nécessite un tampon (true) ou non (false). Par défaut true pour les conventions.';
    
    -- Mettre à jour tous les documents existants qui ne sont pas des conventions pour mettre need_stamp à false
    UPDATE public.documents SET need_stamp = false WHERE type != 'convention';
    
    -- S'assurer que tous les documents de type "convention" ont bien need_stamp à true
    UPDATE public.documents SET need_stamp = true WHERE type = 'convention';
    
    RAISE NOTICE 'Colonne need_stamp ajoutée avec succès à la table documents avec valeur par défaut TRUE';
  ELSE
    RAISE NOTICE 'La colonne need_stamp existe déjà dans la table documents';
    
    -- Mettre à jour tous les documents de type convention existants pour avoir need_stamp à true
    UPDATE public.documents SET need_stamp = true WHERE type = 'convention' AND (need_stamp IS NULL OR need_stamp = false);
    
    RAISE NOTICE 'Tous les documents de type convention ont été mis à jour pour avoir need_stamp = true';
  END IF;
END
$$; 