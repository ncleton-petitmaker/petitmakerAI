/*
  # Migration initiale pour la configuration de Supabase

  1. Fonctions utilitaires
    - Fonctions pour exécuter des requêtes SQL et explorer la base de données
  2. Vérification et correction des tables
    - Vérification de la table training_participants et création de user_profiles si nécessaire
  3. Sécurité
    - Configuration des politiques RLS
*/

-- Création de la fonction pour exécuter des requêtes SQL arbitraires
CREATE OR REPLACE FUNCTION query_db(sql_query text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE sql_query INTO result;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Création de la fonction pour récupérer la liste des tables
CREATE OR REPLACE FUNCTION get_tables()
RETURNS TABLE (tablename text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT t.tablename::text
  FROM pg_catalog.pg_tables t
  WHERE t.schemaname = 'public';
END;
$$;

-- Création de la fonction pour récupérer la structure d'une table
CREATE OR REPLACE FUNCTION get_columns(table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = table_name;
END;
$$;

-- Vérifier si la table training_participants existe et la remplacer par user_profiles si nécessaire
DO $$
DECLARE
  training_participants_exists BOOLEAN;
  user_profiles_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'training_participants'
  ) INTO training_participants_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) INTO user_profiles_exists;
  
  IF training_participants_exists AND NOT user_profiles_exists THEN
    -- Créer la table user_profiles basée sur training_participants
    EXECUTE 'CREATE TABLE user_profiles AS SELECT * FROM training_participants';
    
    -- Ajouter les contraintes et index nécessaires
    EXECUTE 'ALTER TABLE user_profiles ADD PRIMARY KEY (id)';
    
    -- Activer RLS
    EXECUTE 'ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY';
    
    -- Créer les politiques de sécurité pour user_profiles
    IF NOT EXISTS (
      SELECT FROM pg_policies 
      WHERE tablename = 'user_profiles' 
      AND policyname = 'Les utilisateurs peuvent voir leur propre profil'
    ) THEN
      EXECUTE 'CREATE POLICY "Les utilisateurs peuvent voir leur propre profil" 
        ON user_profiles FOR SELECT 
        USING (auth.uid() = user_id)';
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM pg_policies 
      WHERE tablename = 'user_profiles' 
      AND policyname = 'Les utilisateurs peuvent mettre à jour leur propre profil'
    ) THEN
      EXECUTE 'CREATE POLICY "Les utilisateurs peuvent mettre à jour leur propre profil" 
        ON user_profiles FOR UPDATE 
        USING (auth.uid() = user_id)';
    END IF;
    
    -- Optionnellement, supprimer la table training_participants
    -- EXECUTE 'DROP TABLE training_participants';
  END IF;
END $$;

-- Vérifier et configurer la table companies
DO $$
DECLARE
  companies_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) INTO companies_exists;
  
  IF companies_exists THEN
    -- Activer RLS si ce n'est pas déjà fait
    EXECUTE 'ALTER TABLE companies ENABLE ROW LEVEL SECURITY';
    
    -- Créer les politiques de sécurité pour companies
    IF NOT EXISTS (
      SELECT FROM pg_policies 
      WHERE tablename = 'companies' 
      AND policyname = 'Les administrateurs peuvent voir toutes les entreprises'
    ) THEN
      EXECUTE 'CREATE POLICY "Les administrateurs peuvent voir toutes les entreprises" 
        ON companies FOR SELECT 
        TO authenticated
        USING (auth.jwt() ? ''admin_access'')';
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM pg_policies 
      WHERE tablename = 'companies' 
      AND policyname = 'Les administrateurs peuvent modifier toutes les entreprises'
    ) THEN
      EXECUTE 'CREATE POLICY "Les administrateurs peuvent modifier toutes les entreprises" 
        ON companies FOR UPDATE 
        TO authenticated
        USING (auth.jwt() ? ''admin_access'')';
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM pg_policies 
      WHERE tablename = 'companies' 
      AND policyname = 'Les administrateurs peuvent supprimer des entreprises'
    ) THEN
      EXECUTE 'CREATE POLICY "Les administrateurs peuvent supprimer des entreprises" 
        ON companies FOR DELETE 
        TO authenticated
        USING (auth.jwt() ? ''admin_access'')';
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM pg_policies 
      WHERE tablename = 'companies' 
      AND policyname = 'Les administrateurs peuvent ajouter des entreprises'
    ) THEN
      EXECUTE 'CREATE POLICY "Les administrateurs peuvent ajouter des entreprises" 
        ON companies FOR INSERT 
        TO authenticated
        WITH CHECK (auth.jwt() ? ''admin_access'')';
    END IF;
  END IF;
END $$; 