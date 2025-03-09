/*
  # Fix Storage Buckets and Settings

  1. New Tables
    - `settings` table with proper RLS policies
    
  2. Storage Buckets
    - Create required storage buckets with proper policies
    - Fix RLS policies for existing buckets
    
  3. Security
    - Enable RLS on all tables
    - Add appropriate policies for admin access
*/

-- First, ensure settings table exists with proper structure
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

-- Enable RLS on settings table
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies for settings table
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
  DROP POLICY IF EXISTS "Anyone can read settings" ON public.settings;
END $$;

CREATE POLICY "Admins can manage settings"
ON public.settings
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Anyone can read settings"
ON public.settings
FOR SELECT
TO public
USING (true);

-- Insert default settings if not exists
INSERT INTO public.settings (
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
)
SELECT
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
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- Create storage buckets if they don't exist
DO $$
DECLARE
  bucket_exists boolean;
BEGIN
  -- Check and create 'Images' bucket
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'Images'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('Images', 'Images', true);
  END IF;

  -- Check and create 'trainer-cvs' bucket
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'trainer-cvs'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('trainer-cvs', 'trainer-cvs', true);
  END IF;

  -- Check and create 'trainer-profile-pictures' bucket
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'trainer-profile-pictures'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('trainer-profile-pictures', 'trainer-profile-pictures', true);
  END IF;

  -- Check and create 'signatures' bucket
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'signatures'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('signatures', 'signatures', true);
  END IF;

  -- Check and create 'agreements' bucket
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'agreements'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('agreements', 'agreements', true);
  END IF;

  -- Check and create 'completion-certificates' bucket
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'completion-certificates'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('completion-certificates', 'completion-certificates', true);
  END IF;

  -- Check and create 'attendance-sheets' bucket
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'attendance-sheets'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('attendance-sheets', 'attendance-sheets', true);
  END IF;
END $$;

-- Create storage policies for each bucket
DO $$
BEGIN
  -- Images bucket policies
  DROP POLICY IF EXISTS "Public Access" ON storage.objects FOR SELECT;
  CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'Images');

  -- Trainer CVs bucket policies
  DROP POLICY IF EXISTS "Public CV Access" ON storage.objects FOR SELECT;
  CREATE POLICY "Public CV Access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'trainer-cvs');

  DROP POLICY IF EXISTS "Admin CV Upload" ON storage.objects FOR INSERT;
  CREATE POLICY "Admin CV Upload"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'trainer-cvs'
    AND (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND is_admin = true
      )
    )
  );

  -- Trainer profile pictures bucket policies
  DROP POLICY IF EXISTS "Public Profile Picture Access" ON storage.objects FOR SELECT;
  CREATE POLICY "Public Profile Picture Access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'trainer-profile-pictures');

  DROP POLICY IF EXISTS "Admin Profile Picture Upload" ON storage.objects FOR INSERT;
  CREATE POLICY "Admin Profile Picture Upload"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'trainer-profile-pictures'
    AND (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND is_admin = true
      )
    )
  );

  -- Signatures bucket policies
  DROP POLICY IF EXISTS "Public Signature Access" ON storage.objects FOR SELECT;
  CREATE POLICY "Public Signature Access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'signatures');

  DROP POLICY IF EXISTS "Authenticated Signature Upload" ON storage.objects FOR INSERT;
  CREATE POLICY "Authenticated Signature Upload"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'signatures'
    AND auth.role() = 'authenticated'
  );

  -- Agreements bucket policies
  DROP POLICY IF EXISTS "Public Agreement Access" ON storage.objects FOR SELECT;
  CREATE POLICY "Public Agreement Access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'agreements');

  DROP POLICY IF EXISTS "Authenticated Agreement Upload" ON storage.objects FOR INSERT;
  CREATE POLICY "Authenticated Agreement Upload"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'agreements'
    AND auth.role() = 'authenticated'
  );

  -- Certificates bucket policies
  DROP POLICY IF EXISTS "Public Certificate Access" ON storage.objects FOR SELECT;
  CREATE POLICY "Public Certificate Access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'completion-certificates');

  DROP POLICY IF EXISTS "Authenticated Certificate Upload" ON storage.objects FOR INSERT;
  CREATE POLICY "Authenticated Certificate Upload"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'completion-certificates'
    AND auth.role() = 'authenticated'
  );

  -- Attendance sheets bucket policies
  DROP POLICY IF EXISTS "Public Attendance Sheet Access" ON storage.objects FOR SELECT;
  CREATE POLICY "Public Attendance Sheet Access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'attendance-sheets');

  DROP POLICY IF EXISTS "Authenticated Attendance Sheet Upload" ON storage.objects FOR INSERT;
  CREATE POLICY "Authenticated Attendance Sheet Upload"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'attendance-sheets'
    AND auth.role() = 'authenticated'
  );
END $$;