-- Script SQL direct pour ajouter les colonnes à la table settings
-- Version simplifiée pour éviter les erreurs d'exécution

-- Ajouter la colonne organization_seal_path
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS organization_seal_path TEXT DEFAULT NULL;

-- Ajouter la colonne organization_seal_url
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS organization_seal_url TEXT DEFAULT NULL; 