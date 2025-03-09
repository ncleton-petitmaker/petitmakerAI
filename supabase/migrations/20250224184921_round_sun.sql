/*
  # Fix User Profiles Migration

  1. Changes
    - Recreate user_profiles table with proper constraints
    - Add better error handling for profile creation
    - Fix data migration issues
    - Ensure proper cascade deletion

  2. Security
    - Maintain RLS policies
    - Add better access control
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create temporary table for existing data
CREATE TEMP TABLE IF NOT EXISTS temp_profiles AS
SELECT
  id,
  full_name,
  company,
  training_start,
  training_end,
  progress,
  COALESCE(questionnaire_completed, false) as questionnaire_completed,
  created_at,
  updated_at
FROM user_profiles;

-- Drop existing table
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Recreate user_profiles table with better constraints
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  training_start timestamptz,
  training_end timestamptz,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  questionnaire_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Migrate data from temporary table
INSERT INTO user_profiles (
  id,
  full_name,
  company,
  training_start,
  training_end,
  progress,
  questionnaire_completed,
  created_at,
  updated_at
)
SELECT
  id,
  full_name,
  company,
  training_start,
  training_end,
  COALESCE(progress, 0),
  questionnaire_completed,
  created_at,
  updated_at
FROM temp_profiles
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  company = EXCLUDED.company,
  training_start = EXCLUDED.training_start,
  training_end = EXCLUDED.training_end,
  progress = EXCLUDED.progress,
  questionnaire_completed = EXCLUDED.questionnaire_completed,
  updated_at = EXCLUDED.updated_at;

-- Drop temporary table
DROP TABLE temp_profiles;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  profile_exists boolean;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM user_profiles WHERE id = NEW.id
  ) INTO profile_exists;

  -- Only create profile if it doesn't exist
  IF NOT profile_exists THEN
    INSERT INTO user_profiles (
      id,
      full_name,
      company,
      progress,
      questionnaire_completed,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      '',
      0,
      false,
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
  WHEN others THEN
    -- Log error but don't fail
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for users"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);

-- Add missing profiles for existing users
INSERT INTO user_profiles (
  id,
  full_name,
  company,
  progress,
  questionnaire_completed,
  created_at,
  updated_at
)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', ''),
  '',
  0,
  false,
  now(),
  now()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;