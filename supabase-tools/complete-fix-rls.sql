-- Script complet pour corriger les problèmes de la table trainings
-- Ce script va :
-- 1. Vérifier et ajouter les colonnes nécessaires
-- 2. Activer RLS sur la table
-- 3. Supprimer toutes les politiques existantes
-- 4. Créer de nouvelles politiques plus permissives
-- 5. Ajouter des logs pour le diagnostic

-- Fonction pour enregistrer les logs dans une table temporaire
DO $$
BEGIN
    -- Créer une table temporaire pour les logs si elle n'existe pas
    CREATE TABLE IF NOT EXISTS debug_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        message TEXT,
        details JSONB
    );
    
    -- Enregistrer le début de l'exécution
    INSERT INTO debug_logs (message) VALUES ('Début de l''exécution du script de correction RLS pour trainings');
END $$;

-- 1. Vérifier et ajouter les colonnes nécessaires
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
    
    -- Vérifier la structure complète de la table trainings
    INSERT INTO debug_logs (message, details) 
    SELECT 
        'Structure complète de la table trainings', 
        jsonb_agg(jsonb_build_object('column_name', column_name, 'data_type', data_type, 'is_nullable', is_nullable))
    FROM 
        information_schema.columns 
    WHERE 
        table_name = 'trainings';
END $$;

-- 2. Activer RLS sur la table
DO $$
BEGIN
    ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
    INSERT INTO debug_logs (message) VALUES ('RLS activé sur la table trainings');
END $$;

-- 3. Supprimer toutes les politiques existantes pour éviter les conflits
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
        VALUES ('Politique existante trouvée: ' || policy_record.policyname);
    END LOOP;
    
    IF policies_count = 0 THEN
        INSERT INTO debug_logs (message) VALUES ('Aucune politique existante trouvée pour la table trainings');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('Nombre total de politiques trouvées: ' || policies_count);
    END IF;
    
    -- Supprimer toutes les politiques
    DROP POLICY IF EXISTS "Les utilisateurs peuvent voir les formations auxquelles ils sont inscrits" ON trainings;
    DROP POLICY IF EXISTS "Les administrateurs peuvent modifier les formations" ON trainings;
    DROP POLICY IF EXISTS "Les administrateurs peuvent supprimer les formations" ON trainings;
    DROP POLICY IF EXISTS "Les administrateurs peuvent ajouter des formations" ON trainings;
    DROP POLICY IF EXISTS "Administrateurs peuvent voir toutes les formations" ON trainings;
    DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs formations" ON trainings;
    DROP POLICY IF EXISTS "Administrateurs peuvent modifier les formations" ON trainings;
    DROP POLICY IF EXISTS "Administrateurs peuvent supprimer des formations" ON trainings;
    DROP POLICY IF EXISTS "Administrateurs peuvent ajouter des formations" ON trainings;
    DROP POLICY IF EXISTS "Tout le monde peut voir les formations" ON trainings;
    DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs propres formations" ON trainings;
    DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs propres formations" ON trainings;
    DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent ajouter des formations" ON trainings;
    
    INSERT INTO debug_logs (message) VALUES ('Toutes les politiques ont été supprimées');
END $$;

-- 4. Créer de nouvelles politiques plus permissives
DO $$
BEGIN
    -- Politique pour permettre à tout le monde de voir les formations
    CREATE POLICY "Tout le monde peut voir les formations" 
    ON trainings FOR SELECT 
    USING (true);
    
    INSERT INTO debug_logs (message) VALUES ('Politique créée: Tout le monde peut voir les formations');
    
    -- Vérifier si la table user_profiles existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_profiles'
    ) THEN
        INSERT INTO debug_logs (message) VALUES ('La table user_profiles existe');
        
        -- Vérifier si la colonne is_admin existe dans user_profiles
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' AND column_name = 'is_admin'
        ) THEN
            INSERT INTO debug_logs (message) VALUES ('La colonne is_admin existe dans user_profiles');
            
            -- Politique pour permettre aux administrateurs de modifier les formations
            CREATE POLICY "Les administrateurs peuvent modifier les formations" 
            ON trainings FOR UPDATE 
            USING (
              EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE user_profiles.id = auth.uid() 
                AND user_profiles.is_admin = true
              )
            );
            
            INSERT INTO debug_logs (message) VALUES ('Politique créée: Les administrateurs peuvent modifier les formations');
            
            -- Politique pour permettre aux administrateurs de supprimer les formations
            CREATE POLICY "Les administrateurs peuvent supprimer les formations" 
            ON trainings FOR DELETE 
            USING (
              EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE user_profiles.id = auth.uid() 
                AND user_profiles.is_admin = true
              )
            );
            
            INSERT INTO debug_logs (message) VALUES ('Politique créée: Les administrateurs peuvent supprimer les formations');
            
            -- Politique pour permettre aux administrateurs d'ajouter des formations
            CREATE POLICY "Les administrateurs peuvent ajouter des formations" 
            ON trainings FOR INSERT 
            WITH CHECK (
              EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE user_profiles.id = auth.uid() 
                AND user_profiles.is_admin = true
              )
            );
            
            INSERT INTO debug_logs (message) VALUES ('Politique créée: Les administrateurs peuvent ajouter des formations');
        ELSE
            INSERT INTO debug_logs (message) VALUES ('ERREUR: La colonne is_admin n''existe pas dans user_profiles');
        END IF;
    ELSE
        INSERT INTO debug_logs (message) VALUES ('ERREUR: La table user_profiles n''existe pas');
    END IF;
    
    -- Politique pour permettre à tous les utilisateurs authentifiés d'ajouter des formations
    CREATE POLICY "Les utilisateurs authentifiés peuvent ajouter des formations" 
    ON trainings FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);
    
    INSERT INTO debug_logs (message) VALUES ('Politique créée: Les utilisateurs authentifiés peuvent ajouter des formations');
END $$;

-- 5. Vérifier les politiques créées
DO $$
DECLARE
    policy_record RECORD;
    policies_count INTEGER := 0;
BEGIN
    -- Récupérer et enregistrer toutes les politiques créées
    FOR policy_record IN 
        SELECT policyname, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'trainings'
    LOOP
        policies_count := policies_count + 1;
        INSERT INTO debug_logs (message, details) 
        VALUES (
            'Politique créée vérifiée: ' || policy_record.policyname,
            jsonb_build_object(
                'cmd', policy_record.cmd,
                'qual', policy_record.qual,
                'with_check', policy_record.with_check
            )
        );
    END LOOP;
    
    IF policies_count = 0 THEN
        INSERT INTO debug_logs (message) VALUES ('ERREUR: Aucune politique n''a été créée pour la table trainings');
    ELSE
        INSERT INTO debug_logs (message) VALUES ('Nombre total de politiques créées: ' || policies_count);
    END IF;
END $$;

-- 6. Afficher les logs pour diagnostic
SELECT * FROM debug_logs ORDER BY id;

-- Fin du script 