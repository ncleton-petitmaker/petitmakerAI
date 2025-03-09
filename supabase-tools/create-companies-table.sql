-- Script pour créer la table companies avec les champs email et siret

-- Fonction pour créer la table companies si elle n'existe pas
CREATE OR REPLACE FUNCTION create_companies_table_if_not_exists()
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}'::JSONB;
BEGIN
    -- Vérifie si la table companies existe
    IF NOT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'companies'
    ) THEN
        -- Crée la table companies
        CREATE TABLE companies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            industry TEXT,
            size TEXT,
            address TEXT,
            city TEXT,
            postal_code TEXT,
            country TEXT,
            phone TEXT,
            website TEXT,
            email TEXT,
            siret TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        -- Active RLS sur la table
        ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
        
        -- Crée une politique pour permettre aux utilisateurs authentifiés de voir les entreprises
        CREATE POLICY "Users can view companies" ON companies
            FOR SELECT
            TO authenticated
            USING (true);
        
        -- Crée une politique pour permettre aux administrateurs de gérer les entreprises
        CREATE POLICY "Admins can manage companies" ON companies
            FOR ALL
            TO authenticated
            USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'))
            WITH CHECK (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));
        
        -- Crée un trigger pour mettre à jour le champ updated_at
        CREATE TRIGGER set_companies_updated_at
            BEFORE UPDATE ON companies
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
        
        -- Crée un trigger pour préserver les valeurs des champs email et siret
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
        
        CREATE TRIGGER ensure_companies_fields_preserved
            BEFORE UPDATE ON companies
            FOR EACH ROW
            EXECUTE FUNCTION preserve_companies_fields();
        
        result := result || jsonb_build_object('table_created', TRUE);
    ELSE
        result := result || jsonb_build_object('table_created', FALSE);
    END IF;
    
    -- Vérifie si les colonnes email et siret existent
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'companies'
        AND column_name = 'email'
    ) THEN
        ALTER TABLE companies ADD COLUMN email TEXT;
        result := result || jsonb_build_object('email_added', TRUE);
    ELSE
        result := result || jsonb_build_object('email_added', FALSE);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'companies'
        AND column_name = 'siret'
    ) THEN
        ALTER TABLE companies ADD COLUMN siret TEXT;
        result := result || jsonb_build_object('siret_added', TRUE);
    ELSE
        result := result || jsonb_build_object('siret_added', FALSE);
    END IF;
    
    -- Vérifie si le trigger de préservation existe
    IF NOT EXISTS (
        SELECT FROM pg_trigger
        WHERE tgname = 'ensure_companies_fields_preserved'
        AND tgrelid = 'companies'::regclass
    ) THEN
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
        CREATE TRIGGER ensure_companies_fields_preserved
            BEFORE UPDATE ON companies
            FOR EACH ROW
            EXECUTE FUNCTION preserve_companies_fields();
            
        result := result || jsonb_build_object('trigger_created', TRUE);
    ELSE
        result := result || jsonb_build_object('trigger_created', FALSE);
    END IF;
    
    result := result || jsonb_build_object('success', TRUE);
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorde les privilèges d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION create_companies_table_if_not_exists() TO authenticated;

-- Commentaire sur la fonction
COMMENT ON FUNCTION create_companies_table_if_not_exists() IS 'Crée la table companies avec les champs email et siret si elle n''existe pas.';

-- Fonction pour mettre à jour le champ updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Exécute la fonction pour créer la table
SELECT create_companies_table_if_not_exists(); 