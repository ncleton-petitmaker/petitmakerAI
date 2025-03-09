/*
  # Fix Policies and Tables

  1. Changes
    - Drop all existing policies safely
    - Create tables before policies
    - Add proper checks for existing policies
    - Fix policy naming conflicts

  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Keep admin privileges
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

-- Drop all existing policies safely
DO $$ 
DECLARE
  policy_name text;
  table_name text;
BEGIN
  FOR table_name, policy_name IN 
    SELECT schemaname || '.' || tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', policy_name, table_name);
  END LOOP;
END $$;

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

-- Create new policies for user_profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'allow_insert_for_auth'
  ) THEN
    CREATE POLICY "allow_insert_for_auth"
    ON public.user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'allow_select_for_auth'
  ) THEN
    CREATE POLICY "allow_select_for_auth"
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR is_admin = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'allow_update_for_auth'
  ) THEN
    CREATE POLICY "allow_update_for_auth"
    ON public.user_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id OR is_admin = true)
    WITH CHECK (auth.uid() = id OR is_admin = true);
  END IF;
END $$;

-- Create policies for settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'settings' 
    AND policyname = 'allow_admin_manage_settings'
  ) THEN
    CREATE POLICY "allow_admin_manage_settings"
    ON public.settings
    FOR ALL
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'settings' 
    AND policyname = 'allow_read_settings'
  ) THEN
    CREATE POLICY "allow_read_settings"
    ON public.settings
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Create policies for training_participants
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'training_participants' 
    AND policyname = 'allow_read_training_participants'
  ) THEN
    CREATE POLICY "allow_read_training_participants"
    ON public.training_participants
    FOR SELECT
    TO authenticated
    USING (participant_id = auth.uid() OR is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'training_participants' 
    AND policyname = 'allow_insert_training_participants'
  ) THEN
    CREATE POLICY "allow_insert_training_participants"
    ON public.training_participants
    FOR INSERT
    TO authenticated
    WITH CHECK (participant_id = auth.uid() OR is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'training_participants' 
    AND policyname = 'allow_update_training_participants'
  ) THEN
    CREATE POLICY "allow_update_training_participants"
    ON public.training_participants
    FOR UPDATE
    TO authenticated
    USING (participant_id = auth.uid() OR is_admin(auth.uid()))
    WITH CHECK (participant_id = auth.uid() OR is_admin(auth.uid()));
  END IF;
END $$;

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