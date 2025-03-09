-- Add missing columns to trainings table
DO $$ 
BEGIN
  -- Add content column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainings' 
    AND column_name = 'content'
  ) THEN
    ALTER TABLE trainings ADD COLUMN content text;
  END IF;

  -- Add dates column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainings' 
    AND column_name = 'dates'
  ) THEN
    ALTER TABLE trainings ADD COLUMN dates text DEFAULT 'À définir';
  END IF;

  -- Add company_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainings' 
    AND column_name = 'company_name'
  ) THEN
    ALTER TABLE trainings ADD COLUMN company_name text;
  END IF;
END $$;

-- Update RLS policies for trainings
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can read trainings" ON trainings;
  DROP POLICY IF EXISTS "Admins can manage trainings" ON trainings;

  -- Create new policies
  CREATE POLICY "Users can read trainings"
    ON trainings
    FOR SELECT
    USING (
      id IN (
        SELECT training_id FROM user_profiles
        WHERE user_profiles.id = auth.uid()
      ) OR
      company_id IN (
        SELECT company_id FROM user_profiles
        WHERE user_profiles.id = auth.uid()
      )
    );

  CREATE POLICY "Admins can manage trainings"
    ON trainings
    FOR ALL
    USING (EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    ));
END $$;

-- Update documents policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can read documents from their trainings" ON documents;

  -- Create new policy
  CREATE POLICY "Users can read documents from their trainings"
    ON documents
    FOR SELECT
    USING (
      training_id IN (
        SELECT training_id FROM user_profiles
        WHERE user_profiles.id = auth.uid()
      ) OR
      company_id IN (
        SELECT company_id FROM user_profiles
        WHERE user_profiles.id = auth.uid()
      )
    );
END $$;

-- Create function to update company_name when company_id changes
CREATE OR REPLACE FUNCTION update_training_company_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    SELECT name INTO NEW.company_name
    FROM companies
    WHERE id = NEW.company_id;
  ELSE
    NEW.company_name := 'Non assignée';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update company_name
DROP TRIGGER IF EXISTS update_training_company_name ON trainings;
CREATE TRIGGER update_training_company_name
  BEFORE INSERT OR UPDATE OF company_id ON trainings
  FOR EACH ROW
  EXECUTE FUNCTION update_training_company_name();