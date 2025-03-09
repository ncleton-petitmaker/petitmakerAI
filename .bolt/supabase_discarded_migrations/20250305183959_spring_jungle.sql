/*
  # Fix User Profiles Policies

  1. Changes
    - Drop all existing policies to start fresh
    - Create new simplified policies without recursion
    - Fix infinite recursion in admin checks
    - Add proper RLS policies for all tables

  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Keep admin privileges
*/

-- Drop all existing policies to start fresh
DO $$ 
BEGIN
  -- Drop user_profiles policies
  DROP POLICY IF EXISTS "users_read_own_profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "users_insert_own_profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "read_own_profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "update_own_profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "insert_own_profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "User read own profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "User update own profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "User insert own" ON public.user_profiles;
  DROP POLICY IF EXISTS "user_insert_own" ON public.user_profiles;
  DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
  DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;
  DROP POLICY IF EXISTS "user_update_own" ON public.user_profiles;
  DROP POLICY IF EXISTS "Admin manage all profiles" ON public.user_profiles;
  DROP POLICY IF EXISTS "system_create_profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "user_read_own" ON public.user_profiles;
  DROP POLICY IF EXISTS "admin_manage_profiles" ON public.user_profiles;
END $$;

-- Create new simplified policies for user_profiles
CREATE POLICY "enable_insert_for_authenticated"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
);

CREATE POLICY "enable_select_for_users"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR 
  email = 'nicolas.cleton@petitmaker.fr'
);

CREATE POLICY "enable_update_for_users"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR 
  email = 'nicolas.cleton@petitmaker.fr'
)
WITH CHECK (
  auth.uid() = id OR 
  email = 'nicolas.cleton@petitmaker.fr'
);

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = user_id AND email = 'nicolas.cleton@petitmaker.fr'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing tables to use the new admin check
DO $$ 
BEGIN
  -- Update companies policies
  DROP POLICY IF EXISTS "companies_admin_policy" ON public.companies;
  CREATE POLICY "companies_admin_policy"
    ON public.companies
    FOR ALL 
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

  -- Update trainings policies
  DROP POLICY IF EXISTS "trainings_admin_policy" ON public.trainings;
  CREATE POLICY "trainings_admin_policy"
    ON public.trainings
    FOR ALL 
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

  -- Update documents policies
  DROP POLICY IF EXISTS "documents_admin_policy" ON public.documents;
  CREATE POLICY "documents_admin_policy"
    ON public.documents
    FOR ALL 
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

  -- Update settings policies
  DROP POLICY IF EXISTS "settings_admin_policy" ON public.settings;
  CREATE POLICY "settings_admin_policy"
    ON public.settings
    FOR ALL 
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
END $$;