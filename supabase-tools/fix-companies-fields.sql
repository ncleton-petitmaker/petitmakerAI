-- Script pour corriger les champs email et siret dans la table companies
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
SELECT log_debug('Début de la correction des champs email et siret dans la table companies');

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

-- Ajoute les colonnes email et siret si elles n'existent pas
DO $$
DECLARE
    email_exists BOOLEAN;
    siret_exists BOOLEAN;
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
    
    -- Ajoute la colonne email si elle n'existe pas
    IF NOT email_exists THEN
        PERFORM log_debug('Ajout de la colonne email à la table companies');
        ALTER TABLE companies ADD COLUMN email TEXT;
        PERFORM log_debug('Colonne email ajoutée avec succès');
    ELSE
        PERFORM log_debug('La colonne email existe déjà');
    END IF;
    
    -- Ajoute la colonne siret si elle n'existe pas
    IF NOT siret_exists THEN
        PERFORM log_debug('Ajout de la colonne siret à la table companies');
        ALTER TABLE companies ADD COLUMN siret TEXT;
        PERFORM log_debug('Colonne siret ajoutée avec succès');
    ELSE
        PERFORM log_debug('La colonne siret existe déjà');
    END IF;
END $$;

-- Crée une fonction pour préserver les valeurs des champs email et siret lors des mises à jour
CREATE OR REPLACE FUNCTION preserve_companies_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Préserve la valeur de email si elle est définie dans l'ancien enregistrement
    -- mais pas dans le nouveau (ou si elle est NULL dans le nouveau)
    IF OLD.email IS NOT NULL AND (NEW.email IS NULL OR NEW.email = '') THEN
        NEW.email := OLD.email;
        PERFORM log_debug('Préservation de la valeur email lors de la mise à jour', 
                         jsonb_build_object('company_id', NEW.id, 'email', NEW.email));
    END IF;
    
    -- Préserve la valeur de siret si elle est définie dans l'ancien enregistrement
    -- mais pas dans le nouveau (ou si elle est NULL dans le nouveau)
    IF OLD.siret IS NOT NULL AND (NEW.siret IS NULL OR NEW.siret = '') THEN
        NEW.siret := OLD.siret;
        PERFORM log_debug('Préservation de la valeur siret lors de la mise à jour', 
                         jsonb_build_object('company_id', NEW.id, 'siret', NEW.siret));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprime le trigger s'il existe déjà
DROP TRIGGER IF EXISTS ensure_companies_fields_preserved ON companies;

-- Crée le trigger pour préserver les valeurs des champs
CREATE TRIGGER ensure_companies_fields_preserved
        BEFORE UPDATE ON companies
        FOR EACH ROW
        EXECUTE FUNCTION preserve_companies_fields();

SELECT log_debug('Trigger de préservation des champs créé avec succès');

-- Vérifie les politiques RLS sur la table companies
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Vérifie si une politique pour les champs email et siret existe déjà
    SELECT EXISTS (
        SELECT FROM pg_policy
        WHERE polrelid = 'companies'::regclass
        AND polname = 'companies_email_siret_policy'
    ) INTO policy_exists;
    
    -- Si la politique n'existe pas, la crée
    IF NOT policy_exists THEN
        PERFORM log_debug('Création d''une politique RLS pour les champs email et siret');
        
        -- Assure-toi que RLS est activé sur la table
        ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
        
        -- Crée une politique pour permettre aux utilisateurs authentifiés de voir les champs email et siret
        CREATE POLICY companies_email_siret_policy ON companies
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
            
        PERFORM log_debug('Politique RLS créée avec succès');
    ELSE
        PERFORM log_debug('Une politique RLS pour les champs email et siret existe déjà');
    END IF;
END $$;

-- Test d'insertion et de mise à jour
DO $$
DECLARE
    test_company_id UUID;
BEGIN
    -- Insère une entreprise de test
    INSERT INTO companies (name, status, email, siret)
    VALUES ('Entreprise Test', 'active', 'test@example.com', '12345678901234')
    RETURNING id INTO test_company_id;
    
    PERFORM log_debug('Entreprise de test insérée', 
                     jsonb_build_object('id', test_company_id, 
                                       'email', 'test@example.com', 
                                       'siret', '12345678901234'));
    
    -- Met à jour l'entreprise en essayant de vider les champs email et siret
    UPDATE companies
    SET email = NULL, siret = NULL
    WHERE id = test_company_id;
    
    -- Vérifie si les valeurs ont été préservées
    PERFORM log_debug('Vérification après mise à jour', 
                     (SELECT jsonb_build_object(
                         'id', id,
                         'email', email,
                         'siret', siret
                     ) FROM companies WHERE id = test_company_id));
    
    -- Supprime l'entreprise de test
    DELETE FROM companies WHERE id = test_company_id;
    PERFORM log_debug('Entreprise de test supprimée');
END $$;

-- Affiche tous les logs pour analyse
SELECT * FROM debug_logs ORDER BY id; 