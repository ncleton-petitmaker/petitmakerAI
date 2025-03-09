/*
  # Fix User Profile Management

  1. Changes
    - Add better error handling for profile creation
    - Update profile querying policies
    - Add default values for required fields
    - Ensure proper cascade deletion

  2. Security
    - Maintain RLS policies
    - Add proper constraints
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate user_profiles table with better defaults
CREATE TABLE IF NOT EXISTS user_profiles (
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

-- Create function to handle new user registration with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    full_name,
    company,
    created_at,
    updated_at,
    questionnaire_completed,
    progress
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    '',
    NOW(),
    NOW(),
    false,
    0
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Drop existing policies
DROP POLICY IF EXISTS "Lecture du profil" ON user_profiles;
DROP POLICY IF EXISTS "Mise à jour du profil" ON user_profiles;
DROP POLICY IF EXISTS "Création automatique du profil" ON user_profiles;
DROP POLICY IF EXISTS "Suppression du profil" ON user_profiles;
DROP POLICY IF EXISTS "Profil par défaut" ON user_profiles;

-- Create new policies with better names and permissions
CREATE POLICY "Allow users to read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow users to update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow automatic profile creation"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;