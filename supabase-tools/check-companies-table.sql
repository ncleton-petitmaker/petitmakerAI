-- Script pour vérifier la structure de la table companies et diagnostiquer les problèmes
-- Crée une table temporaire pour les logs de débogage

-- Supprime la table de logs si elle existe déjà
DROP TABLE IF EXISTS debug_logs;

-- Crée la table de logs
CREATE TABLE debug_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    message TEXT,
    details JSONB
);

-- Fonction pour enregistrer les messages de débogage
CREATE OR REPLACE FUNCTION log_debug(msg TEXT, details JSONB DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO debug_logs (message, details) VALUES (msg, details);
END;
$$ LANGUAGE plpgsql;

-- Début de la vérification
SELECT log_debug('Début de la vérification de la table companies');

-- Vérifie si la table companies existe
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'companies'
    ) INTO table_exists;
    
    IF table_exists THEN
        PERFORM log_debug('La table companies existe');
    ELSE
        PERFORM log_debug('ERREUR: La table companies n''existe pas', jsonb_build_object('error', 'table_not_found'));
        RETURN;
    END IF;
END $$;

-- Vérifie la structure de la table companies
DO $$
DECLARE
    email_exists BOOLEAN;
    siret_exists BOOLEAN;
    column_info RECORD;
    columns_json JSONB := '[]';
BEGIN
    -- Vérifie si la colonne email existe
    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'companies'
        AND column_name = 'email'
    ) INTO email_exists;
    
    -- Vérifie si la colonne siret existe
    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'companies'
        AND column_name = 'siret'
    ) INTO siret_exists;
    
    -- Récupère toutes les colonnes de la table
    FOR column_info IN
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'companies'
        ORDER BY ordinal_position
    LOOP
        columns_json := columns_json || jsonb_build_object(
            'column_name', column_info.column_name,
            'data_type', column_info.data_type,
            'is_nullable', column_info.is_nullable
        );
    END LOOP;
    
    -- Enregistre les informations sur les colonnes
    PERFORM log_debug('Structure de la table companies', columns_json);
    
    -- Vérifie spécifiquement les colonnes email et siret
    IF email_exists THEN
        PERFORM log_debug('La colonne email existe dans la table companies');
    ELSE
        PERFORM log_debug('ATTENTION: La colonne email n''existe pas dans la table companies', 
                         jsonb_build_object('missing_column', 'email'));
    END IF;
    
    IF siret_exists THEN
        PERFORM log_debug('La colonne siret existe dans la table companies');
    ELSE
        PERFORM log_debug('ATTENTION: La colonne siret n''existe pas dans la table companies', 
                         jsonb_build_object('missing_column', 'siret'));
    END IF;
END $$;

-- Échantillonne quelques données pour vérifier
DO $$
DECLARE
    sample_data JSONB;
    email_count INTEGER;
    siret_count INTEGER;
    total_count INTEGER;
BEGIN
    -- Compte le nombre total d'enregistrements
    SELECT COUNT(*) INTO total_count FROM companies;
    PERFORM log_debug('Nombre total d''entreprises', jsonb_build_object('count', total_count));
    
    -- Compte les enregistrements avec email non null
    SELECT COUNT(*) INTO email_count FROM companies WHERE email IS NOT NULL;
    
    -- Compte les enregistrements avec siret non null
    SELECT COUNT(*) INTO siret_count FROM companies WHERE siret IS NOT NULL;
    
    -- Enregistre les statistiques
    PERFORM log_debug('Statistiques des champs', jsonb_build_object(
        'total_companies', total_count,
        'companies_with_email', email_count,
        'companies_with_siret', siret_count,
        'email_percentage', CASE WHEN total_count > 0 THEN ROUND((email_count::FLOAT / total_count) * 100, 2) ELSE 0 END,
        'siret_percentage', CASE WHEN total_count > 0 THEN ROUND((siret_count::FLOAT / total_count) * 100, 2) ELSE 0 END
    ));
    
    -- Échantillonne quelques données
    IF total_count > 0 THEN
        SELECT jsonb_agg(companies)
        INTO sample_data
        FROM (
            SELECT id, name, email, siret
            FROM companies
            ORDER BY created_at DESC
            LIMIT 5
        ) companies;
        
        PERFORM log_debug('Échantillon des 5 dernières entreprises', sample_data);
    END IF;
END $$;

-- Vérifie les contraintes sur les colonnes email et siret
DO $$
DECLARE
    constraint_info JSONB := '[]';
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT conname, contype, pg_get_constraintdef(c.oid) as constraint_def
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE t.relname = 'companies'
        AND n.nspname = 'public'
    LOOP
        constraint_info := constraint_info || jsonb_build_object(
            'name', constraint_record.conname,
            'type', CASE 
                WHEN constraint_record.contype = 'p' THEN 'PRIMARY KEY'
                WHEN constraint_record.contype = 'u' THEN 'UNIQUE'
                WHEN constraint_record.contype = 'f' THEN 'FOREIGN KEY'
                WHEN constraint_record.contype = 'c' THEN 'CHECK'
                ELSE constraint_record.contype::text
            END,
            'definition', constraint_record.constraint_def
        );
    END LOOP;
    
    PERFORM log_debug('Contraintes sur la table companies', constraint_info);
END $$;

-- Vérifie les politiques RLS sur la table companies
DO $$
DECLARE
    policy_info JSONB := '[]';
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as expression
        FROM pg_policy
        WHERE polrelid = 'companies'::regclass
    LOOP
        policy_info := policy_info || jsonb_build_object(
            'name', policy_record.polname,
            'command', policy_record.polcmd,
            'expression', policy_record.expression
        );
    END LOOP;
    
    PERFORM log_debug('Politiques RLS sur la table companies', policy_info);
END $$;

-- Affiche tous les logs pour analyse
SELECT * FROM debug_logs ORDER BY id; 