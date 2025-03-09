/*
  # Settings Table Migration

  1. New Tables
    - `settings` table for storing organization settings
      - `id` (integer, primary key, default 1)
      - `company_name` (text, required)
      - Various organization details (siret, address, etc.)
      - File paths for logo, signature, and internal rules
      - Timestamps for created_at and updated_at

  2. Security
    - Enable RLS
    - Add policies for read access and admin management
    
  3. Automation
    - Trigger for updating updated_at timestamp
    - Initial settings data
*/

-- Create settings table if it doesn't exist
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

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'settings' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist and create new ones
DO $$ 
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.settings;
  DROP POLICY IF EXISTS "Admin users can manage settings" ON public.settings;
  
  -- Create read policy for authenticated users
  CREATE POLICY "Authenticated users can read settings"
    ON public.settings
    FOR SELECT
    TO authenticated
    USING (true);
  
  -- Create management policy for admin users
  CREATE POLICY "Admin users can manage settings"
    ON public.settings
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND is_admin = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND is_admin = true
      )
    );
END $$;

-- Create or replace trigger function
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- Insert or update initial settings
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