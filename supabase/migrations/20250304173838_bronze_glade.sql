-- Add missing columns to user_profiles if they don't exist
DO $$ 
BEGIN
  -- Add training_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'training_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN training_id uuid REFERENCES trainings(id) ON DELETE SET NULL;
  END IF;

  -- Add training_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'training_status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN training_status text DEFAULT 'registered';
  END IF;

  -- Add evaluation scores columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'initial_evaluation_score'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN initial_evaluation_score integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'final_evaluation_score'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN final_evaluation_score integer;
  END IF;

  -- Add questionnaire completion flags if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'questionnaire_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN questionnaire_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'initial_evaluation_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN initial_evaluation_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'final_evaluation_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN final_evaluation_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'satisfaction_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN satisfaction_completed boolean DEFAULT false;
  END IF;
END $$;

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_training_id ON user_profiles(training_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_training_status ON user_profiles(training_status);

-- Update RLS policies to include new columns
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
  DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;

  -- Create new policies that include the new columns
  CREATE POLICY "user_profiles_select_policy"
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (
      id = auth.uid() OR  -- Users can read their own profile
      is_admin(auth.uid()) -- Admins can read all profiles
    );

  CREATE POLICY "user_profiles_update_policy"
    ON user_profiles
    FOR UPDATE
    TO authenticated
    USING (
      id = auth.uid() OR  -- Users can update their own profile
      is_admin(auth.uid()) -- Admins can update all profiles
    )
    WITH CHECK (
      id = auth.uid() OR  -- Users can update their own profile
      is_admin(auth.uid()) -- Admins can update all profiles
    );
END $$;

-- Add documents table columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE documents ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for documents user_id
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);