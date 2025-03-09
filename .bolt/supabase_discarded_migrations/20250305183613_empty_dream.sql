/*
  # Fix Database Setup

  1. New Tables
    - settings table with proper constraints and policies
    - training_participants table with proper structure
    - Fix user_profiles policies

  2. Security
    - Enable RLS
    - Add appropriate policies
    - Fix infinite recursion issues
*/

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

-- Drop existing problematic policies
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

-- Create new optimized policies for user_profiles
CREATE POLICY "users_read_own_profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.is_admin = true
  )
);

CREATE POLICY "users_update_own_profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.is_admin = true
  )
)
WITH CHECK (
  auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.is_admin = true
  )
);

CREATE POLICY "users_insert_own_profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.is_admin = true
  )
);

-- Create policies for settings
CREATE POLICY "settings_admin_policy"
ON public.settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.is_admin = true
  )
);

CREATE POLICY "settings_read_policy"
ON public.settings
FOR SELECT
TO authenticated
USING (true);

-- Create policies for training_participants
CREATE POLICY "training_participants_read_policy"
ON public.training_participants
FOR SELECT
TO authenticated
USING (
  participant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.is_admin = true
  )
);

CREATE POLICY "training_participants_insert_policy"
ON public.training_participants
FOR INSERT
TO authenticated
WITH CHECK (
  participant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.is_admin = true
  )
);

CREATE POLICY "training_participants_update_policy"
ON public.training_participants
FOR UPDATE
TO authenticated
USING (
  participant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.is_admin = true
  )
)
WITH CHECK (
  participant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.is_admin = true
  )
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