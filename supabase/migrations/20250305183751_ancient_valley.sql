/*
  # Database Setup and Policy Fixes

  1. Tables
    - Create settings table
    - Create training_participants table after trainings exists
    - Fix user_profiles policies

  2. Security
    - Drop and recreate policies
    - Fix infinite recursion issues
    - Ensure proper table order
*/

-- Drop all existing policies first to avoid conflicts
DO $$ 
BEGIN
  -- Drop user_profiles policies
  DROP POLICY IF EXISTS "users_read_own_profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "users_insert_own_profile" ON public.user_profiles;
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

  -- Drop settings policies if table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'settings') THEN
    DROP POLICY IF EXISTS "settings_admin_policy" ON public.settings;
    DROP POLICY IF EXISTS "settings_read_policy" ON public.settings;
    DROP POLICY IF EXISTS "Admin users can manage settings" ON public.settings;
    DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.settings;
  END IF;

  -- Drop training_participants policies if table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'training_participants') THEN
    DROP POLICY IF EXISTS "training_participants_read_policy" ON public.training_participants;
    DROP POLICY IF EXISTS "training_participants_insert_policy" ON public.training_participants;
    DROP POLICY IF EXISTS "training_participants_update_policy" ON public.training_participants;
  END IF;
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

-- Create trainings table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trainings') THEN
    CREATE TABLE public.trainings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      duration TEXT DEFAULT '2 jours soit 14h',
      location TEXT,
      trainer_name TEXT,
      company_id UUID,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    
    ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

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

-- Create new optimized policies for user_profiles
CREATE POLICY "read_own_profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "update_own_profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true
  )
)
WITH CHECK (
  id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "insert_own_profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true
  )
);

-- Create policies for settings
CREATE POLICY "admin_manage_settings"
ON public.settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "read_settings"
ON public.settings
FOR SELECT
TO authenticated
USING (true);

-- Create policies for training_participants
CREATE POLICY "read_training_participants"
ON public.training_participants
FOR SELECT
TO authenticated
USING (
  participant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "insert_training_participants"
ON public.training_participants
FOR INSERT
TO authenticated
WITH CHECK (
  participant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "update_training_participants"
ON public.training_participants
FOR UPDATE
TO authenticated
USING (
  participant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true
  )
)
WITH CHECK (
  participant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true
  )
);

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

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