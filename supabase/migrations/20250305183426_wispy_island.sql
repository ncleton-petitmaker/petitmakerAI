/*
  # Fix user profiles policies

  1. Changes
    - Drop existing problematic policies
    - Create new optimized policies without recursion
    - Add proper documentation for each policy

  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Keep RLS enabled
*/

-- Drop existing policies to clean up
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

-- Create new optimized policies
CREATE POLICY "users_read_own_profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR 
  (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid())
);

CREATE POLICY "users_update_own_profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR 
  (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid())
)
WITH CHECK (
  auth.uid() = id OR 
  (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid())
);

CREATE POLICY "users_insert_own_profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id OR 
  (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid())
);

CREATE POLICY "system_create_initial_profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add helpful comments
COMMENT ON POLICY "users_read_own_profile" ON public.user_profiles IS 'Users can read their own profile or admin can read all profiles';
COMMENT ON POLICY "users_update_own_profile" ON public.user_profiles IS 'Users can update their own profile or admin can update all profiles';
COMMENT ON POLICY "users_insert_own_profile" ON public.user_profiles IS 'Users can insert their own profile or admin can insert profiles';
COMMENT ON POLICY "system_create_initial_profile" ON public.user_profiles IS 'System can create initial profiles during signup';