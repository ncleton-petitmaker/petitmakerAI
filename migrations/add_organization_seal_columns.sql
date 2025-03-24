-- Script pour ajouter les colonnes de tampon d'organisation à la table settings
-- À exécuter dans l'interface SQL de Supabase

-- Vérifier si les colonnes existent déjà pour éviter les erreurs
DO $$
BEGIN
    -- Vérifier si la colonne organization_seal_path existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'settings' 
        AND column_name = 'organization_seal_path'
    ) THEN
        -- Ajouter la colonne organization_seal_path
        ALTER TABLE public.settings 
        ADD COLUMN organization_seal_path TEXT DEFAULT NULL;
        
        RAISE NOTICE 'Colonne organization_seal_path ajoutée avec succès.';
    ELSE
        RAISE NOTICE 'La colonne organization_seal_path existe déjà.';
    END IF;

    -- Vérifier si la colonne organization_seal_url existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'settings' 
        AND column_name = 'organization_seal_url'
    ) THEN
        -- Ajouter la colonne organization_seal_url
        ALTER TABLE public.settings 
        ADD COLUMN organization_seal_url TEXT DEFAULT NULL;
        
        RAISE NOTICE 'Colonne organization_seal_url ajoutée avec succès.';
    ELSE
        RAISE NOTICE 'La colonne organization_seal_url existe déjà.';
    END IF;
    
    -- Mettre à jour les commentaires de la table
    COMMENT ON COLUMN public.settings.organization_seal_path IS 'Chemin du fichier du tampon de l''organisme dans le bucket organization-seals';
    COMMENT ON COLUMN public.settings.organization_seal_url IS 'URL publique du tampon de l''organisme';
END$$;

-- Vérifier que les colonnes ont bien été ajoutées
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'settings'
    AND column_name IN ('organization_seal_path', 'organization_seal_url')
ORDER BY 
    ordinal_position; 