/*
  # Fix Company and Training Associations

  1. Changes
    - Add company_id to user_profiles if not exists
    - Add training_id to user_profiles if not exists
    - Add foreign key constraints
    - Add indexes for better performance
    - Add trigger to update company name in trainings

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
*/

-- Add company_id to user_profiles if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add training_id to user_profiles if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'training_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN training_id uuid REFERENCES trainings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_training_id ON user_profiles(training_id);

-- Function to update training company name
CREATE OR REPLACE FUNCTION update_training_company_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    SELECT name INTO NEW.company_name
    FROM companies
    WHERE id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update training company name
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_training_company_name'
  ) THEN
    CREATE TRIGGER update_training_company_name
    BEFORE INSERT OR UPDATE OF company_id ON trainings
    FOR EACH ROW
    EXECUTE FUNCTION update_training_company_name();
  END IF;
END $$;

-- Function to associate user with company
CREATE OR REPLACE FUNCTION associate_user_with_company()
RETURNS TRIGGER AS $$
BEGIN
  -- If company name is provided but company_id is not
  IF NEW.company IS NOT NULL AND NEW.company_id IS NULL THEN
    -- Try to find existing company
    WITH company_lookup AS (
      SELECT id FROM companies 
      WHERE LOWER(name) = LOWER(NEW.company)
      LIMIT 1
    ), new_company AS (
      -- If company doesn't exist, create it
      INSERT INTO companies (name, status)
      SELECT NEW.company, 'active'
      WHERE NOT EXISTS (SELECT 1 FROM company_lookup)
      RETURNING id
    )
    -- Get company id from either lookup or new creation
    SELECT id INTO NEW.company_id
    FROM (
      SELECT id FROM company_lookup
      UNION ALL
      SELECT id FROM new_company
    ) companies
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to associate user with company
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'associate_user_with_company'
  ) THEN
    CREATE TRIGGER associate_user_with_company
    BEFORE INSERT OR UPDATE OF company ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION associate_user_with_company();
  END IF;
END $$;

-- Update existing user profiles to associate with companies
DO $$ 
DECLARE 
  profile RECORD;
BEGIN
  FOR profile IN 
    SELECT id, company 
    FROM user_profiles 
    WHERE company IS NOT NULL AND company_id IS NULL
  LOOP
    -- This will trigger the associate_user_with_company function
    UPDATE user_profiles 
    SET company = profile.company 
    WHERE id = profile.id;
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
  DROP POLICY IF EXISTS "Users can read companies" ON companies;
  DROP POLICY IF EXISTS "Users can read trainings" ON trainings;
END $$;

-- Create policies without IF NOT EXISTS (not supported in policy creation)
CREATE POLICY "Users can read their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read companies"
  ON companies FOR SELECT
  USING (true);

CREATE POLICY "Users can read trainings"
  ON trainings FOR SELECT
  USING (true);