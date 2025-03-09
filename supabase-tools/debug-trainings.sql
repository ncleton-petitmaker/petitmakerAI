-- Script de diagnostic pour identifier les problèmes d'insertion dans la table trainings
-- Ce script va :
-- 1. Créer une table de logs pour le diagnostic
-- 2. Tester l'insertion d'une formation simple
-- 3. Vérifier les politiques RLS actuelles
-- 4. Vérifier les permissions de l'utilisateur actuel

-- 1. Créer une table de logs pour le diagnostic
CREATE TABLE IF NOT EXISTS debug_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    message TEXT,
    details JSONB
);

-- Nettoyer les logs précédents
TRUNCATE debug_logs;

-- Enregistrer le début de l'exécution
INSERT INTO debug_logs (message) VALUES ('Début du diagnostic pour la table trainings');

-- 2. Vérifier la structure de la table trainings
DO $$
BEGIN
    INSERT INTO debug_logs (message, details) 
    SELECT 
        'Structure de la table trainings', 
        jsonb_agg(jsonb_build_object('column_name', column_name, 'data_type', data_type, 'is_nullable', is_nullable))
    FROM 
        information_schema.columns 
    WHERE 
        table_name = 'trainings';
END $$;

-- 3. Vérifier les politiques RLS actuelles
DO $$
DECLARE
    policy_record RECORD;
    policies_count INTEGER := 0;
BEGIN
    -- Récupérer et enregistrer toutes les politiques existantes
    FOR policy_record IN 
        SELECT policyname, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'trainings'
    LOOP
        policies_count := policies_count + 1;
        INSERT INTO debug_logs (message, details) 
        VALUES (
            'Politique existante: ' || policy_record.policyname,
            jsonb_build_object(
                'cmd', policy_record.cmd,
                'qual', policy_record.qual,
                'with_check', policy_record.with_check
            )
        );
    END LOOP;
    
    IF policies_count = 0 THEN
        INSERT INTO debug_logs (message) VALUES ('ATTENTION: Aucune politique RLS trouvée pour la table trainings');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('Nombre total de politiques trouvées: ' || policies_count);
    END IF;
END $$;

-- 4. Vérifier si RLS est activé sur la table trainings
DO $$
DECLARE
    rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'trainings';
    
    IF rls_enabled THEN
        INSERT INTO debug_logs (message) VALUES ('RLS est activé sur la table trainings');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('ATTENTION: RLS n''est PAS activé sur la table trainings');
    END IF;
END $$;

-- 5. Vérifier les permissions de l'utilisateur actuel
DO $$
BEGIN
    INSERT INTO debug_logs (message, details) VALUES (
        'Informations sur l''utilisateur actuel',
        jsonb_build_object(
            'current_user', current_user,
            'session_user', session_user,
            'current_role', current_role,
            'auth.uid()', auth.uid()
        )
    );
    
    -- Vérifier si l'utilisateur est admin
    IF EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND is_admin = true
    ) THEN
        INSERT INTO debug_logs (message) VALUES ('L''utilisateur actuel est un administrateur');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('L''utilisateur actuel n''est PAS un administrateur');
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
            'Formation de test diagnostic', 
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
            'Insertion de test réussie',
            jsonb_build_object('new_training_id', new_training_id)
        );
        
        -- Supprimer la formation de test
        DELETE FROM trainings WHERE id = new_training_id;
        INSERT INTO debug_logs (message) VALUES ('Formation de test supprimée');
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS insertion_error = PG_EXCEPTION_CONTEXT;
        INSERT INTO debug_logs (message, details) VALUES (
            'ERREUR lors de l''insertion de test',
            jsonb_build_object(
                'error_message', SQLERRM,
                'error_detail', SQLSTATE,
                'error_context', insertion_error
            )
        );
    END;
END $$;

-- 7. Vérifier les contraintes sur la table trainings
DO $$
BEGIN
    INSERT INTO debug_logs (message, details) 
    SELECT 
        'Contraintes sur la table trainings', 
        jsonb_agg(jsonb_build_object(
            'constraint_name', constraint_name,
            'constraint_type', constraint_type,
            'table_name', table_name
        ))
    FROM 
        information_schema.table_constraints 
    WHERE 
        table_name = 'trainings';
END $$;

-- 8. Vérifier les déclencheurs sur la table trainings
DO $$
BEGIN
    INSERT INTO debug_logs (message, details) 
    SELECT 
        'Déclencheurs sur la table trainings', 
        jsonb_agg(jsonb_build_object(
            'trigger_name', trigger_name,
            'event_manipulation', event_manipulation,
            'action_statement', action_statement
        ))
    FROM 
        information_schema.triggers 
    WHERE 
        event_object_table = 'trainings';
END $$;

-- 9. Afficher tous les logs pour diagnostic
SELECT id, timestamp, message, details FROM debug_logs ORDER BY id;

-- Fin du script de diagnostic 