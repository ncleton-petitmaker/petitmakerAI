/*
  # Settings and Storage Configuration

  1. Settings Table
    - Create settings table for organization configuration
    - Add RLS policies for admin access
    - Add default settings data

  2. Storage Buckets
    - Create buckets for logos, signatures, and internal rules
    - Set up proper file size limits and MIME types
    - Configure RLS policies for secure access
*/

-- Create settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.settings (
  id integer PRIMARY KEY DEFAULT 1,
  company_name text NOT NULL,
  siret text,
  training_number text,
  address text,
  city text,
  postal_code text,
  country text,
  email text,
  phone text,
  website text,
  logo_path text,
  signature_path text,
  internal_rules_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT settings_single_row CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admin users can manage settings" ON public.settings;

-- Create policy for admin access
CREATE POLICY "Admin users can manage settings" ON public.settings
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = true
  ));

-- Function to create bucket if not exists
CREATE OR REPLACE FUNCTION create_bucket_if_not_exists(bucket_name text, is_public boolean)
RETURNS void AS $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    bucket_name,
    bucket_name,
    is_public,
    52428800, -- 50MB limit
    CASE 
      WHEN bucket_name = 'internal-rules' THEN ARRAY['application/pdf']::text[]
      ELSE ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']::text[]
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
END;
$$ LANGUAGE plpgsql;

-- Create buckets
SELECT create_bucket_if_not_exists('logos', true);
SELECT create_bucket_if_not_exists('signatures', true);
SELECT create_bucket_if_not_exists('internal-rules', true);

-- Function to safely create storage policies
CREATE OR REPLACE FUNCTION create_storage_policies()
RETURNS void AS $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Admin users can upload logos" ON storage.objects;
  DROP POLICY IF EXISTS "Admin users can update logos" ON storage.objects;
  DROP POLICY IF EXISTS "Admin users can delete logos" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
  
  DROP POLICY IF EXISTS "Admin users can upload signatures" ON storage.objects;
  DROP POLICY IF EXISTS "Admin users can update signatures" ON storage.objects;
  DROP POLICY IF EXISTS "Admin users can delete signatures" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view signatures" ON storage.objects;
  
  DROP POLICY IF EXISTS "Admin users can upload internal rules" ON storage.objects;
  DROP POLICY IF EXISTS "Admin users can update internal rules" ON storage.objects;
  DROP POLICY IF EXISTS "Admin users can delete internal rules" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view internal rules" ON storage.objects;

  -- Create new policies
  -- Logos
  CREATE POLICY "Admin users can upload logos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'logos' 
      AND (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
      ))
    );

  CREATE POLICY "Admin users can update logos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'logos'
      AND (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
      ))
    );

  CREATE POLICY "Admin users can delete logos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'logos'
      AND (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
      ))
    );

  CREATE POLICY "Anyone can view logos"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'logos');

  -- Signatures
  CREATE POLICY "Admin users can upload signatures"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'signatures'
      AND (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
      ))
    );

  CREATE POLICY "Admin users can update signatures"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'signatures'
      AND (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
      ))
    );

  CREATE POLICY "Admin users can delete signatures"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'signatures'
      AND (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
      ))
    );

  CREATE POLICY "Anyone can view signatures"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'signatures');

  -- Internal Rules
  CREATE POLICY "Admin users can upload internal rules"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'internal-rules'
      AND (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
      ))
    );

  CREATE POLICY "Admin users can update internal rules"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'internal-rules'
      AND (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
      ))
    );

  CREATE POLICY "Admin users can delete internal rules"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'internal-rules'
      AND (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
      ))
    );

  CREATE POLICY "Anyone can view internal rules"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'internal-rules');
END;
$$ LANGUAGE plpgsql;

-- Execute the policy creation function
SELECT create_storage_policies();

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;

-- Create trigger
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- Insert default settings if not exists
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
) ON CONFLICT (id) DO NOTHING;