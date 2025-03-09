-- Script pour diagnostiquer les problèmes avec les champs email et siret dans la table companies
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

-- Début du diagnostic
SELECT log_debug('Début du diagnostic des champs email et siret dans la table companies');

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

-- Vérifie la présence et le type des colonnes email et siret
DO $$
DECLARE
    email_exists BOOLEAN;
    siret_exists BOOLEAN;
    email_type TEXT;
    siret_type TEXT;
    email_nullable TEXT;
    siret_nullable TEXT;
BEGIN
    -- Vérifie si la colonne email existe et récupère son type
    SELECT 
        EXISTS(
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'companies'
            AND column_name = 'email'
        ),
        data_type,
        is_nullable
    INTO 
        email_exists,
        email_type,
        email_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'companies'
    AND column_name = 'email';
    
    -- Vérifie si la colonne siret existe et récupère son type
    SELECT 
        EXISTS(
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'companies'
            AND column_name = 'siret'
        ),
        data_type,
        is_nullable
    INTO 
        siret_exists,
        siret_type,
        siret_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'companies'
    AND column_name = 'siret';
    
    -- Enregistre les résultats pour email
    IF email_exists THEN
        PERFORM log_debug('La colonne email existe', 
            jsonb_build_object(
                'data_type', email_type,
                'is_nullable', email_nullable
            )
        );
    ELSE
        PERFORM log_debug('ATTENTION: La colonne email n''existe pas', 
            jsonb_build_object('missing_column', 'email')
        );
    END IF;
    
    -- Enregistre les résultats pour siret
    IF siret_exists THEN
        PERFORM log_debug('La colonne siret existe', 
            jsonb_build_object(
                'data_type', siret_type,
                'is_nullable', siret_nullable
            )
        );
    ELSE
        PERFORM log_debug('ATTENTION: La colonne siret n''existe pas', 
            jsonb_build_object('missing_column', 'siret')
        );
    END IF;
END $$;

-- Analyse les données des colonnes email et siret
DO $$
DECLARE
    total_count INTEGER;
    email_null_count INTEGER;
    email_empty_count INTEGER;
    email_valid_count INTEGER;
    siret_null_count INTEGER;
    siret_empty_count INTEGER;
    siret_valid_count INTEGER;
    email_duplicates INTEGER;
    siret_duplicates INTEGER;
    sample_data JSONB;
BEGIN
    -- Compte le nombre total d'enregistrements
    SELECT COUNT(*) INTO total_count FROM companies;
    
    IF total_count = 0 THEN
        PERFORM log_debug('La table companies est vide');
        RETURN;
    END IF;
    
    PERFORM log_debug('Nombre total d''entreprises', jsonb_build_object('count', total_count));
    
    -- Analyse de la colonne email
    IF EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'companies'
        AND column_name = 'email'
    ) THEN
        -- Compte les emails NULL
        SELECT COUNT(*) INTO email_null_count
        FROM companies
        WHERE email IS NULL;
        
        -- Compte les emails vides
        SELECT COUNT(*) INTO email_empty_count
        FROM companies
        WHERE email = '';
        
        -- Compte les emails valides (non NULL et non vides)
        SELECT COUNT(*) INTO email_valid_count
        FROM companies
        WHERE email IS NOT NULL AND email != '';
        
        -- Compte les emails en double
        SELECT COUNT(*) INTO email_duplicates
        FROM (
            SELECT email, COUNT(*) as count
            FROM companies
            WHERE email IS NOT NULL AND email != ''
            GROUP BY email
            HAVING COUNT(*) > 1
        ) as duplicates;
        
        PERFORM log_debug('Analyse de la colonne email', 
            jsonb_build_object(
                'total', total_count,
                'null_count', email_null_count,
                'empty_count', email_empty_count,
                'valid_count', email_valid_count,
                'null_percentage', ROUND((email_null_count::FLOAT / total_count) * 100, 2),
                'empty_percentage', ROUND((email_empty_count::FLOAT / total_count) * 100, 2),
                'valid_percentage', ROUND((email_valid_count::FLOAT / total_count) * 100, 2),
                'duplicates', email_duplicates
            )
        );
    END IF;
    
    -- Analyse de la colonne siret
    IF EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'companies'
        AND column_name = 'siret'
    ) THEN
        -- Compte les sirets NULL
        SELECT COUNT(*) INTO siret_null_count
        FROM companies
        WHERE siret IS NULL;
        
        -- Compte les sirets vides
        SELECT COUNT(*) INTO siret_empty_count
        FROM companies
        WHERE siret = '';
        
        -- Compte les sirets valides (non NULL et non vides)
        SELECT COUNT(*) INTO siret_valid_count
        FROM companies
        WHERE siret IS NOT NULL AND siret != '';
        
        -- Compte les sirets en double
        SELECT COUNT(*) INTO siret_duplicates
        FROM (
            SELECT siret, COUNT(*) as count
            FROM companies
            WHERE siret IS NOT NULL AND siret != ''
            GROUP BY siret
            HAVING COUNT(*) > 1
        ) as duplicates;
        
        PERFORM log_debug('Analyse de la colonne siret', 
            jsonb_build_object(
                'total', total_count,
                'null_count', siret_null_count,
                'empty_count', siret_empty_count,
                'valid_count', siret_valid_count,
                'null_percentage', ROUND((siret_null_count::FLOAT / total_count) * 100, 2),
                'empty_percentage', ROUND((siret_empty_count::FLOAT / total_count) * 100, 2),
                'valid_percentage', ROUND((siret_valid_count::FLOAT / total_count) * 100, 2),
                'duplicates', siret_duplicates
            )
        );
    END IF;
    
    -- Échantillon des données problématiques
    SELECT jsonb_build_object(
        'missing_both', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name))
            FROM companies
            WHERE (email IS NULL OR email = '') AND (siret IS NULL OR siret = '')
            LIMIT 5
        ),
        'missing_email_only', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'siret', siret))
            FROM companies
            WHERE (email IS NULL OR email = '') AND siret IS NOT NULL AND siret != ''
            LIMIT 5
        ),
        'missing_siret_only', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'email', email))
            FROM companies
            WHERE email IS NOT NULL AND email != '' AND (siret IS NULL OR siret = '')
            LIMIT 5
        )
    ) INTO sample_data;
    
    PERFORM log_debug('Échantillon des données problématiques', sample_data);
END $$;

-- Vérifie les contraintes et triggers sur les colonnes email et siret
DO $$
DECLARE
    trigger_exists BOOLEAN;
BEGIN
    -- Vérifie si le trigger de préservation existe
    SELECT EXISTS (
        SELECT FROM pg_trigger
        WHERE tgname = 'ensure_companies_fields_preserved'
        AND tgrelid = 'companies'::regclass
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        PERFORM log_debug('Le trigger de préservation des champs existe');
    ELSE
        PERFORM log_debug('ATTENTION: Le trigger de préservation des champs n''existe pas');
    END IF;
    
    -- Vérifie les contraintes sur email et siret
    PERFORM log_debug('Contraintes sur les colonnes email et siret', (
        SELECT jsonb_agg(jsonb_build_object(
            'constraint_name', tc.constraint_name,
            'constraint_type', tc.constraint_type,
            'column_name', kcu.column_name
        ))
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
        AND tc.table_name = 'companies'
        AND kcu.column_name IN ('email', 'siret')
    ));
END $$;

-- Vérifie les politiques RLS sur la table companies
DO $$
DECLARE
    rls_enabled BOOLEAN;
BEGIN
    -- Vérifie si RLS est activé
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'companies'
    AND relnamespace = 'public'::regnamespace;
    
    IF rls_enabled THEN
        PERFORM log_debug('RLS est activé sur la table companies');
        
        -- Liste les politiques
        PERFORM log_debug('Politiques RLS sur la table companies', (
            SELECT jsonb_agg(jsonb_build_object(
                'policy_name', polname,
                'command', polcmd,
                'roles', polroles,
                'using_expr', pg_get_expr(polqual, polrelid),
                'with_check_expr', pg_get_expr(polwithcheck, polrelid)
            ))
            FROM pg_policy
            WHERE polrelid = 'companies'::regclass
        ));
    ELSE
        PERFORM log_debug('RLS n''est pas activé sur la table companies');
    END IF;
END $$;

-- Recommandations
DO $$
DECLARE
    email_exists BOOLEAN;
    siret_exists BOOLEAN;
    trigger_exists BOOLEAN;
    recommendations JSONB := '[]';
BEGIN
    -- Vérifie si les colonnes existent
    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'companies'
        AND column_name = 'email'
    ) INTO email_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'companies'
        AND column_name = 'siret'
    ) INTO siret_exists;
    
    -- Vérifie si le trigger existe
    SELECT EXISTS (
        SELECT FROM pg_trigger
        WHERE tgname = 'ensure_companies_fields_preserved'
        AND tgrelid = 'companies'::regclass
    ) INTO trigger_exists;
    
    -- Génère des recommandations
    IF NOT email_exists THEN
        recommendations := recommendations || jsonb_build_object(
            'type', 'critical',
            'message', 'Ajouter la colonne email à la table companies',
            'sql', 'ALTER TABLE companies ADD COLUMN email TEXT;'
        );
    END IF;
    
    IF NOT siret_exists THEN
        recommendations := recommendations || jsonb_build_object(
            'type', 'critical',
            'message', 'Ajouter la colonne siret à la table companies',
            'sql', 'ALTER TABLE companies ADD COLUMN siret TEXT;'
        );
    END IF;
    
    IF NOT trigger_exists AND (email_exists OR siret_exists) THEN
        recommendations := recommendations || jsonb_build_object(
            'type', 'important',
            'message', 'Créer un trigger pour préserver les valeurs des champs email et siret lors des mises à jour',
            'sql', 'CREATE TRIGGER ensure_companies_fields_preserved
                    BEFORE UPDATE ON companies
                    FOR EACH ROW
                    EXECUTE FUNCTION preserve_companies_fields();'
        );
    END IF;
    
    PERFORM log_debug('Recommandations', recommendations);
END $$;

-- Affiche tous les logs pour analyse
SELECT * FROM debug_logs ORDER BY id; 