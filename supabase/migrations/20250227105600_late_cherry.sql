/*
  # Mise à jour de la table user_profiles

  1. Ajout de colonnes pour le CRM
    - `is_admin` - Indique si l'utilisateur est un administrateur
    - `company_id` - Référence à l'entreprise de l'utilisateur
    - `position` - Poste de l'utilisateur
    - `status` - Statut de l'utilisateur (actif, inactif)
*/

-- Ajouter les colonnes à user_profiles si elles n'existent pas
DO $$ 
BEGIN
  -- Colonne is_admin
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN is_admin boolean DEFAULT false;
  END IF;

  -- Colonne company_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
  END IF;

  -- Colonne position
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'position'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN position text;
  END IF;

  -- Colonne status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN status text CHECK (status IN ('active', 'inactive')) DEFAULT 'active';
  END IF;
END $$;

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

-- Créer les triggers seulement s'ils n'existent pas déjà
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_user_profile_update'
  ) THEN
    CREATE TRIGGER on_user_profile_update
      BEFORE UPDATE ON user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION associate_user_with_company();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_user_profile_insert'
  ) THEN
    CREATE TRIGGER on_user_profile_insert
      BEFORE INSERT ON user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION associate_user_with_company();
  END IF;
END $$;