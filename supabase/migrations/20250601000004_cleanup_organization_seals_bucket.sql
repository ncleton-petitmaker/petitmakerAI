-- Cette migration nettoie les anciennes références au bucket "organization-seals" 
-- qui n'est plus utilisé, car les tampons d'organisation sont désormais stockés
-- dans le sous-dossier "seals/" du bucket "signatures"

-- Supprimer les fonctions RPC liées à organization-seals
DROP FUNCTION IF EXISTS public.create_bucket_organization_seals();
DROP FUNCTION IF EXISTS public.configure_organization_seals_policies();

-- Supprimer les politiques d'accès explicites pour le bucket organization-seals (s'il existe)
DO $$
BEGIN
    -- Vérifier si le bucket existe et supprimer ses politiques
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'organization-seals') THEN
        -- Supprimer toutes les politiques liées au bucket
        DELETE FROM storage.policies 
        WHERE bucket_id = 'organization-seals';
        
        -- Supprimer le bucket lui-même
        DELETE FROM storage.buckets 
        WHERE name = 'organization-seals';
        
        RAISE NOTICE 'Le bucket "organization-seals" et ses politiques ont été supprimés.';
    ELSE
        RAISE NOTICE 'Le bucket "organization-seals" n''existe pas, aucune action nécessaire.';
    END IF;
END $$; 