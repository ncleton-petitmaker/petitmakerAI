/*
  # Fix User Permissions Migration
  
  1. Changes
    - Add proper RLS policies for user_profiles table
    - Add function to safely get user email
    - Fix permission issues for user data access
    
  2. Security
    - Enable RLS on all tables
    - Add specific policies for user data access
    - Create safe email lookup function
*/

-- Function to safely get user email
CREATE OR REPLACE FUNCTION get_auth_users_email(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;
  RETURN user_email;
END;
$$;

-- Drop existing policies on user_profiles to recreate them properly
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
  DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create new policies with proper permissions
CREATE POLICY "Users can read own profile"
ON public.user_profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
ON public.user_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'nicolas.cleton@petitmaker.fr'
  )
);

CREATE POLICY "Admins can update all profiles"
ON public.user_profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'nicolas.cleton@petitmaker.fr'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'nicolas.cleton@petitmaker.fr'
  )
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION get_auth_users_email TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;