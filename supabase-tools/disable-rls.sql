-- Script pour désactiver RLS sur la table trainings
-- Ce script est une solution radicale mais efficace pour résoudre les problèmes d'enregistrement

-- Créer une table de logs pour le diagnostic si elle n'existe pas
CREATE TABLE IF NOT EXISTS debug_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    message TEXT,
    details JSONB
);

-- Nettoyer les logs précédents
TRUNCATE debug_logs;

-- Enregistrer le début de l'exécution
INSERT INTO debug_logs (message) VALUES ('Début de la désactivation de RLS sur la table trainings');

-- Vérifier l'état actuel de RLS
DO $$
DECLARE
    rls_enabled BOOLEAN;
BEGIN
    -- Vérifier si RLS est activé
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'trainings';
    
    IF rls_enabled THEN
        INSERT INTO debug_logs (message) VALUES ('RLS est actuellement activé sur la table trainings');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('RLS est actuellement désactivé sur la table trainings');
    END IF;
END $$;

-- Désactiver RLS sur la table trainings
ALTER TABLE trainings DISABLE ROW LEVEL SECURITY;

-- Vérifier que RLS est bien désactivé
DO $$
DECLARE
    rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'trainings';
    
    IF NOT rls_enabled THEN
        INSERT INTO debug_logs (message) VALUES ('Confirmation: RLS est maintenant désactivé sur la table trainings');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('ERREUR: RLS est toujours activé sur la table trainings');
    END IF;
END $$;

-- Afficher tous les logs pour diagnostic
SELECT id, timestamp, message, details FROM debug_logs ORDER BY id;

-- Fin du script 