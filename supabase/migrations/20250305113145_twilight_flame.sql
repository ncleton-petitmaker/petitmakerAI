/*
  # Add settings table and storage policies

  1. New Tables
    - `settings` table for storing organization settings
      - `id` (integer, primary key)
      - `company_name` (text)
      - `siret` (text)
      - `training_number` (text)
      - `address` (text)
      - `city` (text)
      - `postal_code` (text)
      - `country` (text)
      - `email` (text)
      - `phone` (text)
      - `website` (text)
      - `logo_path` (text)
      - `signature_path` (text)
      - `internal_rules_path` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Storage Policies
    - Create storage buckets for logos, signatures, and internal rules
    - Add appropriate RLS policies for each bucket
*/

-- Create settings table
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

-- Create policy for admin access
CREATE POLICY "Admin users can manage settings" ON public.settings
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = true
  ));

-- Create storage buckets if they don't exist
DO $$
BEGIN
  -- Create logos bucket
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('logos', 'logos', true)
  ON CONFLICT (id) DO NOTHING;

  -- Create signatures bucket
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('signatures', 'signatures', true)
  ON CONFLICT (id) DO NOTHING;

  -- Create internal-rules bucket
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('internal-rules', 'internal-rules', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Storage policies for logos bucket
CREATE POLICY "Admin users can upload logos" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Anyone can view logos" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'logos');

-- Storage policies for signatures bucket
CREATE POLICY "Admin users can upload signatures" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'signatures' AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Anyone can view signatures" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'signatures');

-- Storage policies for internal-rules bucket
CREATE POLICY "Admin users can upload internal rules" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'internal-rules' AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Anyone can view internal rules" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'internal-rules');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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