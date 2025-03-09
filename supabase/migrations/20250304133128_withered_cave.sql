-- Add job_position column to user_profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'job_position'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN job_position text;
  END IF;

  -- Add position column if it exists (to handle potential legacy data)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'position'
  ) THEN
    -- Migrate data from position to job_position if needed
    UPDATE user_profiles 
    SET job_position = position 
    WHERE job_position IS NULL AND position IS NOT NULL;

    -- Drop the old position column
    ALTER TABLE user_profiles DROP COLUMN position;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_job_position ON user_profiles(job_position);

-- Update RLS policies to include the new column
DO $$
BEGIN
  -- Ensure policies are up to date
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can read their own profile'
  ) THEN
    DROP POLICY "Users can read their own profile" ON user_profiles;
    
    CREATE POLICY "Users can read their own profile"
      ON user_profiles
      FOR SELECT
      USING (auth.uid() = id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can update their own profile'
  ) THEN
    DROP POLICY "Users can update their own profile" ON user_profiles;
    
    CREATE POLICY "Users can update their own profile"
      ON user_profiles
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;