/*
  # Création des tables pour le CRM admin

  1. Nouvelles Tables
    - `companies` - Table pour stocker les informations des entreprises
    - Ajout de la colonne `company_id` à `user_profiles` pour lier les utilisateurs aux entreprises
    - Ajout de la colonne `is_admin` à `user_profiles` pour identifier les administrateurs

  2. Sécurité
    - Enable RLS sur la table `companies`
    - Création de politiques pour permettre aux administrateurs de gérer les entreprises
    - Création de politiques pour permettre aux utilisateurs de voir leur entreprise
*/

-- Ajouter la colonne is_admin à user_profiles si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Créer la table companies
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  size text,
  address text,
  city text,
  postal_code text,
  country text,
  phone text,
  website text,
  status text CHECK (status IN ('active', 'inactive', 'lead')) DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ajouter la colonne company_id à user_profiles si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ajouter la colonne position à user_profiles si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'position'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN position text;
  END IF;
END $$;

-- Ajouter la colonne status à user_profiles si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN status text CHECK (status IN ('active', 'inactive')) DEFAULT 'active';
  END IF;
END $$;

-- Ajouter la colonne last_login à user_profiles si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'last_login'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN last_login timestamptz;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Créer des politiques pour la table companies
CREATE POLICY "Les administrateurs peuvent tout faire avec les entreprises"
  ON companies
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  ));

-- Créer une politique pour permettre aux utilisateurs de voir leur entreprise
CREATE POLICY "Les utilisateurs peuvent voir leur entreprise"
  ON companies
  FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND company_id IS NOT NULL
    )
  );

-- Mettre à jour la politique pour user_profiles
CREATE POLICY "Les administrateurs peuvent tout faire avec les profils"
  ON user_profiles
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  ));

-- Créer une fonction pour mettre à jour last_login lors de la connexion
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE user_profiles
  SET last_login = now()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$;

-- Créer un trigger pour mettre à jour last_login
DROP TRIGGER IF EXISTS on_auth_sign_in ON auth.sessions;
CREATE TRIGGER on_auth_sign_in
  AFTER INSERT ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_last_login();

-- Créer une fonction pour associer automatiquement un utilisateur à une entreprise
CREATE OR REPLACE FUNCTION associate_user_with_company()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  company_exists boolean;
  company_id uuid;
BEGIN
  -- Vérifier si l'entreprise existe déjà
  IF NEW.company IS NOT NULL AND NEW.company != '' THEN
    SELECT EXISTS (
      SELECT 1 FROM companies WHERE LOWER(name) = LOWER(NEW.company)
    ) INTO company_exists;
    
    IF company_exists THEN
      -- Si l'entreprise existe, récupérer son ID
      SELECT id INTO company_id FROM companies WHERE LOWER(name) = LOWER(NEW.company);
      NEW.company_id := company_id;
    ELSE
      -- Si l'entreprise n'existe pas, la créer
      INSERT INTO companies (name, created_at, updated_at)
      VALUES (NEW.company, now(), now())
      RETURNING id INTO company_id;
      
      NEW.company_id := company_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer un trigger pour associer automatiquement un utilisateur à une entreprise
DROP TRIGGER IF EXISTS on_user_profile_update ON user_profiles;
CREATE TRIGGER on_user_profile_update
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION associate_user_with_company();

DROP TRIGGER IF EXISTS on_user_profile_insert ON user_profiles;
CREATE TRIGGER on_user_profile_insert
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION associate_user_with_company();