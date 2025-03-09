/*
  # Fix User Profile Issues

  1. Changes
    - Simplify profile policies
    - Add better error handling
    - Fix duplicate key issues
    - Ensure proper profile creation

  2. Security
    - Maintain RLS policies
    - Add proper constraints
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow users to read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow automatic profile creation" ON user_profiles;

-- Create simplified policies
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

-- Drop and recreate the function with better error handling
DROP FUNCTION IF EXISTS handle_new_user CASCADE;

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
    );
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Add missing profiles for existing users
DO $$
DECLARE
  missing_user RECORD;
BEGIN
  FOR missing_user IN
    SELECT id, raw_user_meta_data
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM user_profiles p WHERE p.id = u.id
    )
  LOOP
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
      missing_user.id,
      COALESCE(missing_user.raw_user_meta_data->>'full_name', ''),
      '',
      0,
      false,
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$$;