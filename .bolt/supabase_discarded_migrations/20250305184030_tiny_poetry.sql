/*
  # Fix User Profiles Policies

  1. Changes
    - Drop all existing policies to start fresh
    - Create new simplified policies without email dependency
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
  is_admin = true
);

CREATE POLICY "enable_update_for_users"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR 
  is_admin = true
)
WITH CHECK (
  auth.uid() = id OR 
  is_admin = true
);

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = user_id AND is_admin = true
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

-- Create settings table if not exists
CREATE TABLE IF NOT EXISTS public.settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name TEXT NOT NULL,
  siret TEXT,
  training_number TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  logo_path TEXT,
  signature_path TEXT,
  internal_rules_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create training_participants table if not exists
CREATE TABLE IF NOT EXISTS public.training_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID REFERENCES public.trainings(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered',
  has_signed_certificate BOOLEAN DEFAULT false,
  signature_url TEXT,
  signature_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(training_id, participant_id)
);

-- Enable RLS on training_participants
ALTER TABLE public.training_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for training_participants
CREATE POLICY "read_training_participants"
ON public.training_participants
FOR SELECT
TO authenticated
USING (
  participant_id = auth.uid() OR is_admin(auth.uid())
);

CREATE POLICY "insert_training_participants"
ON public.training_participants
FOR INSERT
TO authenticated
WITH CHECK (
  participant_id = auth.uid() OR is_admin(auth.uid())
);

CREATE POLICY "update_training_participants"
ON public.training_participants
FOR UPDATE
TO authenticated
USING (
  participant_id = auth.uid() OR is_admin(auth.uid())
)
WITH CHECK (
  participant_id = auth.uid() OR is_admin(auth.uid())
);

-- Insert initial settings if not exists
INSERT INTO public.settings (
  id,
  company_name,
  siret,
  training_number,
  address,
  city,
  postal_code,
  country,
  email,
  phone,
  website
) VALUES (
  1,
  'PETITMAKER',
  '928 386 044 00012',
  '32 59 13116 59',
  '2 rue Héraclès',
  'Villeneuve-d''Ascq',
  '59650',
  'France',
  'nicolas.cleton@petitmaker.fr',
  '07 60 17 72 67',
  'https://petitmaker.fr'
) ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  siret = EXCLUDED.siret,
  training_number = EXCLUDED.training_number,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  country = EXCLUDED.country,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website,
  updated_at = now();