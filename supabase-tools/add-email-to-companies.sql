-- Script pour s'assurer que le champ email est correctement ajouté à la table companies
-- et qu'il est correctement mis à jour lors des opérations d'insertion et de mise à jour

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
INSERT INTO debug_logs (message) VALUES ('Début de la vérification du champ email dans la table companies');

-- Vérifier si le champ email existe dans la table companies
DO $$
DECLARE
    email_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'email'
    ) INTO email_exists;
    
    IF email_exists THEN
        INSERT INTO debug_logs (message) VALUES ('Le champ email existe déjà dans la table companies');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('Le champ email n''existe pas dans la table companies, ajout en cours...');
        ALTER TABLE companies ADD COLUMN email TEXT;
        INSERT INTO debug_logs (message) VALUES ('Champ email ajouté à la table companies');
    END IF;
END $$;

-- Vérifier si le champ siret existe dans la table companies
DO $$
DECLARE
    siret_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'siret'
    ) INTO siret_exists;
    
    IF siret_exists THEN
        INSERT INTO debug_logs (message) VALUES ('Le champ siret existe déjà dans la table companies');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('Le champ siret n''existe pas dans la table companies, ajout en cours...');
        ALTER TABLE companies ADD COLUMN siret TEXT;
        INSERT INTO debug_logs (message) VALUES ('Champ siret ajouté à la table companies');
    END IF;
END $$;

-- Vérifier les politiques RLS sur la table companies
DO $$
DECLARE
    rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'companies';
    
    IF rls_enabled THEN
        INSERT INTO debug_logs (message) VALUES ('RLS est activé sur la table companies');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('RLS n''est pas activé sur la table companies');
    END IF;
END $$;

-- Tester l'insertion d'une entreprise avec email et siret
DO $$
DECLARE
    test_company_id UUID;
    insertion_error TEXT;
BEGIN
    BEGIN
        INSERT INTO companies (
            name, 
            email,
            siret
        ) VALUES (
            'Entreprise de test',
            'test@example.com',
            '123 456 789 00012'
        ) RETURNING id INTO test_company_id;
        
        INSERT INTO debug_logs (message, details) VALUES (
            'Insertion de test réussie',
            jsonb_build_object('company_id', test_company_id)
        );
        
        -- Vérifier que les données ont bien été insérées
        INSERT INTO debug_logs (message, details)
        SELECT 
            'Données de l''entreprise de test',
            jsonb_build_object(
                'id', id,
                'name', name,
                'email', email,
                'siret', siret
            )
        FROM companies
        WHERE id = test_company_id;
        
        -- Supprimer l'entreprise de test
        DELETE FROM companies WHERE id = test_company_id;
        INSERT INTO debug_logs (message) VALUES ('Entreprise de test supprimée');
        
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

-- Afficher tous les logs pour diagnostic
SELECT id, timestamp, message, details FROM debug_logs ORDER BY id;

-- Fin du script 