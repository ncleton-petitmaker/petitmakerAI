/*
  # Fix User Profiles

  1. Changes
    - Simplify user profile creation and update logic
    - Add better error handling for profile operations
    - Fix race conditions in profile creation
    - Ensure proper cascade deletion

  2. Security
    - Maintain RLS policies
    - Ensure proper access control
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert new profile with retry logic
  FOR i IN 1..3 LOOP
    BEGIN
      INSERT INTO user_profiles (
        id,
        first_name,
        last_name,
        company,
        progress,
        questionnaire_completed,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id,
        '',
        '',
        '',
        0,
        false,
        now(),
        now()
      )
      ON CONFLICT (id) DO NOTHING;
      
      EXIT; -- Exit loop if successful
    EXCEPTION
      WHEN unique_violation THEN
        -- Profile already exists, ignore
        EXIT;
      WHEN others THEN
        IF i = 3 THEN
          RAISE WARNING 'Failed to create profile after 3 attempts: %', SQLERRM;
        END IF;
        -- Sleep for a short time before retrying
        PERFORM pg_sleep(0.1);
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Ensure proper cascade delete on foreign keys
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey,
  ADD CONSTRAINT user_profiles_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for users" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON user_profiles;

-- Create simplified policies
CREATE POLICY "Allow users to read profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow system to create profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at ON user_profiles(updated_at);

-- Fix any orphaned profiles
DELETE FROM user_profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- Create missing profiles for existing users
INSERT INTO user_profiles (
  id,
  first_name,
  last_name,
  company,
  progress,
  questionnaire_completed,
  created_at,
  updated_at
)
SELECT
  id,
  '',
  '',
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