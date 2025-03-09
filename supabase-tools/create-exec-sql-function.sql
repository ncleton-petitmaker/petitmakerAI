-- Script pour créer une fonction RPC permettant d'exécuter des requêtes SQL arbitraires
-- ATTENTION: Cette fonction doit être utilisée avec précaution car elle permet d'exécuter n'importe quelle requête SQL

-- Création de la fonction exec_sql
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Exécute la requête SQL et récupère le résultat sous forme de JSONB
    EXECUTE sql_query INTO result;
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    -- En cas d'erreur, retourne les détails de l'erreur
    RETURN jsonb_build_object(
        'error', SQLERRM,
        'detail', SQLSTATE,
        'query', sql_query
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorde les privilèges d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;

-- Commentaire sur la fonction
COMMENT ON FUNCTION exec_sql(TEXT) IS 'Exécute une requête SQL arbitraire et retourne le résultat sous forme de JSONB. À utiliser avec précaution.';

-- Création d'une fonction plus sécurisée pour exécuter des requêtes SQL spécifiques
CREATE OR REPLACE FUNCTION check_companies_structure()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Vérifie si la table companies existe
    SELECT jsonb_build_object(
        'table_exists', EXISTS (
            SELECT FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename = 'companies'
        )
    ) INTO result;
    
    -- Si la table existe, récupère sa structure
    IF (result->>'table_exists')::BOOLEAN THEN
        result := result || jsonb_build_object(
            'columns', (
                SELECT jsonb_agg(jsonb_build_object(
                    'column_name', column_name,
                    'data_type', data_type,
                    'is_nullable', is_nullable
                ))
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = 'companies'
                ORDER BY ordinal_position
            )
        );
        
        -- Vérifie spécifiquement les colonnes email et siret
        result := result || jsonb_build_object(
            'email_exists', EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = 'companies'
                AND column_name = 'email'
            ),
            'siret_exists', EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = 'companies'
                AND column_name = 'siret'
            )
        );
        
        -- Récupère des statistiques sur les données
        IF (result->>'email_exists')::BOOLEAN THEN
            result := result || jsonb_build_object(
                'email_stats', (
                    SELECT jsonb_build_object(
                        'total', COUNT(*),
                        'not_null', COUNT(*) FILTER (WHERE email IS NOT NULL),
                        'empty', COUNT(*) FILTER (WHERE email = '')
                    )
                    FROM companies
                )
            );
        END IF;
        
        IF (result->>'siret_exists')::BOOLEAN THEN
            result := result || jsonb_build_object(
                'siret_stats', (
                    SELECT jsonb_build_object(
                        'total', COUNT(*),
                        'not_null', COUNT(*) FILTER (WHERE siret IS NOT NULL),
                        'empty', COUNT(*) FILTER (WHERE siret = '')
                    )
                    FROM companies
                )
            );
        END IF;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorde les privilèges d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION check_companies_structure() TO authenticated;

-- Commentaire sur la fonction
COMMENT ON FUNCTION check_companies_structure() IS 'Vérifie la structure de la table companies et retourne des informations sur les colonnes email et siret.';

-- Création d'une fonction pour ajouter les colonnes email et siret si elles n'existent pas
CREATE OR REPLACE FUNCTION fix_companies_structure()
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}'::JSONB;
    email_exists BOOLEAN;
    siret_exists BOOLEAN;
    trigger_exists BOOLEAN;
BEGIN
    -- Vérifie si la table companies existe
    IF NOT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'companies'
    ) THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'La table companies n''existe pas'
        );
    END IF;
    
    -- Vérifie si les colonnes existent
    SELECT 
        EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'companies'
            AND column_name = 'email'
        ),
        EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'companies'
            AND column_name = 'siret'
        )
    INTO email_exists, siret_exists;
    
    -- Ajoute la colonne email si elle n'existe pas
    IF NOT email_exists THEN
        ALTER TABLE companies ADD COLUMN email TEXT;
        result := result || jsonb_build_object('email_added', TRUE);
    ELSE
        result := result || jsonb_build_object('email_added', FALSE);
    END IF;
    
    -- Ajoute la colonne siret si elle n'existe pas
    IF NOT siret_exists THEN
        ALTER TABLE companies ADD COLUMN siret TEXT;
        result := result || jsonb_build_object('siret_added', TRUE);
    ELSE
        result := result || jsonb_build_object('siret_added', FALSE);
    END IF;
    
    -- Vérifie si le trigger de préservation existe
    SELECT EXISTS (
        SELECT FROM pg_trigger
        WHERE tgname = 'ensure_companies_fields_preserved'
        AND tgrelid = 'companies'::regclass
    ) INTO trigger_exists;
    
    -- Crée la fonction et le trigger de préservation s'ils n'existent pas
    IF NOT trigger_exists THEN
        -- Crée la fonction pour préserver les valeurs
        CREATE OR REPLACE FUNCTION preserve_companies_fields()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Préserve la valeur de email si elle est définie dans l'ancien enregistrement
            -- mais pas dans le nouveau (ou si elle est NULL dans le nouveau)
            IF OLD.email IS NOT NULL AND (NEW.email IS NULL OR NEW.email = '') THEN
                NEW.email := OLD.email;
            END IF;
            
            -- Préserve la valeur de siret si elle est définie dans l'ancien enregistrement
            -- mais pas dans le nouveau (ou si elle est NULL dans le nouveau)
            IF OLD.siret IS NOT NULL AND (NEW.siret IS NULL OR NEW.siret = '') THEN
                NEW.siret := OLD.siret;
            END IF;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        -- Crée le trigger
        DROP TRIGGER IF EXISTS ensure_companies_fields_preserved ON companies;
        CREATE TRIGGER ensure_companies_fields_preserved
            BEFORE UPDATE ON companies
            FOR EACH ROW
            EXECUTE FUNCTION preserve_companies_fields();
            
        result := result || jsonb_build_object('trigger_created', TRUE);
    ELSE
        result := result || jsonb_build_object('trigger_created', FALSE);
    END IF;
    
    -- Vérifie que RLS est activé et que les politiques appropriées existent
    IF NOT EXISTS (
        SELECT FROM pg_policy
        WHERE polrelid = 'companies'::regclass
        AND polname = 'companies_email_siret_policy'
    ) THEN
        -- Assure-toi que RLS est activé sur la table
        ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
        
        -- Crée une politique pour permettre aux utilisateurs authentifiés de voir les champs email et siret
        CREATE POLICY companies_email_siret_policy ON companies
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
            
        result := result || jsonb_build_object('policy_created', TRUE);
    ELSE
        result := result || jsonb_build_object('policy_created', FALSE);
    END IF;
    
    result := result || jsonb_build_object('success', TRUE);
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorde les privilèges d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION fix_companies_structure() TO authenticated;

-- Commentaire sur la fonction
COMMENT ON FUNCTION fix_companies_structure() IS 'Ajoute les colonnes email et siret à la table companies si elles n''existent pas, et crée un trigger pour préserver leurs valeurs lors des mises à jour.'; 