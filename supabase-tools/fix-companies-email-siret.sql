-- Script pour corriger les problèmes avec les champs email et siret dans la table companies
-- Ce script s'assure que les champs sont correctement définis et que les données sont correctement enregistrées

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
INSERT INTO debug_logs (message) VALUES ('Début de la correction des champs email et siret dans la table companies');

-- 1. Vérifier et ajouter les colonnes si elles n'existent pas
DO $$
DECLARE
    email_exists BOOLEAN;
    siret_exists BOOLEAN;
BEGIN
    -- Vérifier si la colonne email existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'email'
    ) INTO email_exists;
    
    -- Vérifier si la colonne siret existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'siret'
    ) INTO siret_exists;
    
    -- Ajouter la colonne email si elle n'existe pas
    IF NOT email_exists THEN
        ALTER TABLE companies ADD COLUMN email TEXT;
        INSERT INTO debug_logs (message) VALUES ('Colonne email ajoutée à la table companies');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('La colonne email existe déjà dans la table companies');
    END IF;
    
    -- Ajouter la colonne siret si elle n'existe pas
    IF NOT siret_exists THEN
        ALTER TABLE companies ADD COLUMN siret TEXT;
        INSERT INTO debug_logs (message) VALUES ('Colonne siret ajoutée à la table companies');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('La colonne siret existe déjà dans la table companies');
    END IF;
END $$;

-- 2. Vérifier les politiques RLS sur la table companies
DO $$
DECLARE
    rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'companies';
    
    IF rls_enabled THEN
        INSERT INTO debug_logs (message) VALUES ('RLS est activé sur la table companies');
        
        -- Récupérer les politiques existantes
        INSERT INTO debug_logs (message, details)
        SELECT 
            'Politiques existantes sur la table companies',
            jsonb_agg(jsonb_build_object(
                'policyname', policyname,
                'cmd', cmd,
                'roles', roles,
                'qual', qual,
                'with_check', with_check
            ))
        FROM 
            pg_policies
        WHERE 
            tablename = 'companies';
            
        -- Désactiver temporairement RLS pour les opérations suivantes
        ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
        INSERT INTO debug_logs (message) VALUES ('RLS temporairement désactivé sur la table companies');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('RLS n''est pas activé sur la table companies');
    END IF;
END $$;

-- 3. Créer une fonction pour s'assurer que les champs email et siret sont correctement mis à jour
CREATE OR REPLACE FUNCTION ensure_companies_fields_updated()
RETURNS TRIGGER AS $$
BEGIN
    -- S'assurer que les champs email et siret sont correctement copiés
    NEW.email := COALESCE(NEW.email, OLD.email);
    NEW.siret := COALESCE(NEW.siret, OLD.siret);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Créer un trigger pour appliquer la fonction lors des mises à jour
DO $$
BEGIN
    -- Supprimer le trigger s'il existe déjà
    DROP TRIGGER IF EXISTS ensure_companies_fields_updated_trigger ON companies;
    
    -- Créer le trigger
    CREATE TRIGGER ensure_companies_fields_updated_trigger
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION ensure_companies_fields_updated();
    
    INSERT INTO debug_logs (message) VALUES ('Trigger ensure_companies_fields_updated_trigger créé sur la table companies');
END $$;

-- 5. Tester l'insertion et la mise à jour d'une entreprise avec email et siret
DO $$
DECLARE
    test_company_id UUID;
    updated_email TEXT;
    updated_siret TEXT;
BEGIN
    -- Insérer une entreprise de test
    INSERT INTO companies (
        name, 
        email,
        siret
    ) VALUES (
        'Entreprise de test pour correction',
        'test-correction@example.com',
        '987 654 321 00012'
    ) RETURNING id INTO test_company_id;
    
    INSERT INTO debug_logs (message, details) VALUES (
        'Insertion de test réussie',
        jsonb_build_object('company_id', test_company_id)
    );
    
    -- Mettre à jour l'entreprise sans spécifier email et siret
    UPDATE companies 
    SET name = 'Entreprise de test mise à jour'
    WHERE id = test_company_id;
    
    -- Vérifier que email et siret sont toujours présents
    SELECT email, siret INTO updated_email, updated_siret
    FROM companies
    WHERE id = test_company_id;
    
    INSERT INTO debug_logs (message, details) VALUES (
        'Après mise à jour sans email et siret',
        jsonb_build_object(
            'email', updated_email,
            'siret', updated_siret
        )
    );
    
    -- Mettre à jour l'entreprise en spécifiant email et siret
    UPDATE companies 
    SET 
        name = 'Entreprise de test mise à jour 2',
        email = 'test-updated@example.com',
        siret = '123 987 654 00012'
    WHERE id = test_company_id;
    
    -- Vérifier que email et siret ont été mis à jour
    SELECT email, siret INTO updated_email, updated_siret
    FROM companies
    WHERE id = test_company_id;
    
    INSERT INTO debug_logs (message, details) VALUES (
        'Après mise à jour avec email et siret',
        jsonb_build_object(
            'email', updated_email,
            'siret', updated_siret
        )
    );
    
    -- Supprimer l'entreprise de test
    DELETE FROM companies WHERE id = test_company_id;
    INSERT INTO debug_logs (message) VALUES ('Entreprise de test supprimée');
END $$;

-- 6. Réactiver RLS si nécessaire
DO $$
DECLARE
    rls_was_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO rls_was_enabled
    FROM pg_class
    WHERE relname = 'companies';
    
    IF NOT rls_was_enabled THEN
        ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
        INSERT INTO debug_logs (message) VALUES ('RLS réactivé sur la table companies');
    END IF;
END $$;

-- 7. Vérifier les données existantes dans la table companies
INSERT INTO debug_logs (message, details)
SELECT 
    'Nombre d''entreprises dans la table',
    jsonb_build_object('count', COUNT(*))
FROM 
    companies;

INSERT INTO debug_logs (message, details)
SELECT 
    'Nombre d''entreprises avec email non nul',
    jsonb_build_object('count', COUNT(*))
FROM 
    companies
WHERE 
    email IS NOT NULL AND email != '';

INSERT INTO debug_logs (message, details)
SELECT 
    'Nombre d''entreprises avec siret non nul',
    jsonb_build_object('count', COUNT(*))
FROM 
    companies
WHERE 
    siret IS NOT NULL AND siret != '';

-- 8. Afficher un échantillon des données pour vérifier
INSERT INTO debug_logs (message, details)
SELECT 
    'Échantillon des données de la table companies',
    jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'email', email,
        'siret', siret
    ))
FROM 
    companies
LIMIT 5;

-- Afficher tous les logs pour diagnostic
SELECT id, timestamp, message, details FROM debug_logs ORDER BY id;

-- Fin du script 