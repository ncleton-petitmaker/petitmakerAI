-- Script pour corriger les problèmes de la table trainings en désactivant RLS
-- Ce script est une solution radicale qui va désactiver complètement RLS sur la table trainings
-- Utilisez ce script uniquement si les autres solutions n'ont pas fonctionné

-- Créer une table de logs pour le diagnostic
CREATE TABLE IF NOT EXISTS debug_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    message TEXT,
    details JSONB
);

-- Nettoyer les logs précédents
TRUNCATE debug_logs;

-- Enregistrer le début de l'exécution
INSERT INTO debug_logs (message) VALUES ('Début de la correction radicale pour la table trainings');

-- 1. Vérifier si RLS est activé sur la table trainings
DO $$
DECLARE
    rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'trainings';
    
    IF rls_enabled THEN
        INSERT INTO debug_logs (message) VALUES ('RLS est actuellement activé sur la table trainings');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('RLS est actuellement désactivé sur la table trainings');
    END IF;
END $$;

-- 2. Supprimer toutes les politiques existantes
DO $$
DECLARE
    policy_record RECORD;
    policies_count INTEGER := 0;
BEGIN
    -- Récupérer et enregistrer toutes les politiques existantes
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'trainings'
    LOOP
        policies_count := policies_count + 1;
        INSERT INTO debug_logs (message) 
        VALUES ('Suppression de la politique: ' || policy_record.policyname);
        
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON trainings';
    END LOOP;
    
    IF policies_count = 0 THEN
        INSERT INTO debug_logs (message) VALUES ('Aucune politique existante trouvée pour la table trainings');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('Nombre total de politiques supprimées: ' || policies_count);
    END IF;
END $$;

-- 3. Désactiver RLS sur la table trainings
ALTER TABLE trainings DISABLE ROW LEVEL SECURITY;
INSERT INTO debug_logs (message) VALUES ('RLS désactivé sur la table trainings');

-- 4. Vérifier que RLS est bien désactivé
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

-- 5. Vérifier les colonnes nécessaires
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Vérifier si la colonne metadata existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainings' AND column_name = 'metadata'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE trainings ADD COLUMN metadata JSONB DEFAULT '{}';
        INSERT INTO debug_logs (message) VALUES ('Colonne metadata ajoutée à la table trainings');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('La colonne metadata existe déjà dans la table trainings');
    END IF;

    -- Vérifier si la colonne periods existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainings' AND column_name = 'periods'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE trainings ADD COLUMN periods JSONB DEFAULT '[]';
        INSERT INTO debug_logs (message) VALUES ('Colonne periods ajoutée à la table trainings');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('La colonne periods existe déjà dans la table trainings');
    END IF;

    -- Vérifier si la colonne time_slots existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainings' AND column_name = 'time_slots'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE trainings ADD COLUMN time_slots JSONB DEFAULT '[]';
        INSERT INTO debug_logs (message) VALUES ('Colonne time_slots ajoutée à la table trainings');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('La colonne time_slots existe déjà dans la table trainings');
    END IF;
END $$;

-- 6. Tester l'insertion d'une formation simple
DO $$
DECLARE
    new_training_id UUID;
    insertion_error TEXT;
BEGIN
    BEGIN
        INSERT INTO trainings (
            title, 
            target_audience, 
            prerequisites, 
            duration, 
            location, 
            min_participants, 
            max_participants, 
            objectives,
            content,
            metadata
        ) VALUES (
            'Formation de test après désactivation RLS', 
            'Public de test', 
            'Aucun prérequis', 
            '1 jour', 
            'En ligne', 
            1, 
            10, 
            ARRAY['Objectif de test'],
            'Contenu de test',
            '{"periods": [], "timeSlots": []}'::JSONB
        ) RETURNING id INTO new_training_id;
        
        INSERT INTO debug_logs (message, details) VALUES (
            'Insertion de test réussie après désactivation RLS',
            jsonb_build_object('new_training_id', new_training_id)
        );
        
        -- Supprimer la formation de test
        DELETE FROM trainings WHERE id = new_training_id;
        INSERT INTO debug_logs (message) VALUES ('Formation de test supprimée');
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS insertion_error = PG_EXCEPTION_CONTEXT;
        INSERT INTO debug_logs (message, details) VALUES (
            'ERREUR lors de l''insertion de test après désactivation RLS',
            jsonb_build_object(
                'error_message', SQLERRM,
                'error_detail', SQLSTATE,
                'error_context', insertion_error
            )
        );
    END;
END $$;

-- 7. Afficher tous les logs pour diagnostic
SELECT id, timestamp, message, details FROM debug_logs ORDER BY id;

-- Fin du script 