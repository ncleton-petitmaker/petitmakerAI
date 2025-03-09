/*
  # Fix training tables and policies

  1. New Tables
    - trainings
      - id (uuid, primary key)
      - title (text)
      - description (text)
      - duration (text)
      - trainer_name (text)
      - location (text)
      - start_date (timestamptz)
      - end_date (timestamptz)
      - objectives (jsonb)
      - content (text)
      - price (numeric)
      - company_id (uuid, references companies)
      - status (text)
      - created_at (timestamptz)
      - updated_at (timestamptz)

  2. Changes
    - Add training_id and training_status to user_profiles
    - Add document template URLs to trainings
    - Add signature fields to user_profiles
    - Add necessary indexes
    - Set up RLS policies

  3. Security
    - Enable RLS
    - Add policies for read and manage access
*/

-- Drop existing policies and triggers safely
DO $$ 
BEGIN
  -- Drop policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read trainings' AND tablename = 'trainings') THEN
    DROP POLICY IF EXISTS "Users can read trainings" ON trainings;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage trainings' AND tablename = 'trainings') THEN
    DROP POLICY IF EXISTS "Admins can manage trainings" ON trainings;
  END IF;
  
  -- Drop triggers if they exist
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_trainings_updated_at') THEN
    DROP TRIGGER IF EXISTS update_trainings_updated_at ON trainings;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_training_company_name') THEN
    DROP TRIGGER IF EXISTS update_training_company_name ON trainings;
  END IF;
END $$;

-- Create trainings table if not exists
CREATE TABLE IF NOT EXISTS trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration TEXT DEFAULT '2 jours soit 14h',
  trainer_name TEXT,
  location TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  objectives JSONB DEFAULT '[""]',
  content TEXT,
  price NUMERIC DEFAULT 0,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  company_name TEXT,
  evaluation_methods JSONB DEFAULT '{"profile_evaluation": true, "skills_evaluation": true, "knowledge_evaluation": true, "satisfaction_survey": true}',
  tracking_methods JSONB DEFAULT '{"attendance_sheet": true, "completion_certificate": true}',
  pedagogical_methods JSONB DEFAULT '{"needs_evaluation": true, "theoretical_content": true, "practical_exercises": true, "case_studies": true, "experience_sharing": true, "digital_support": true}',
  material_elements JSONB DEFAULT '{"computer_provided": true, "pedagogical_material": true, "digital_support_provided": true}',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add training reference to user_profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'training_id'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN training_id UUID REFERENCES trainings(id) ON DELETE SET NULL,
    ADD COLUMN training_status TEXT DEFAULT 'registered';
  END IF;
END $$;

-- Add document template URLs to trainings if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainings' AND column_name = 'agreement_template_url'
  ) THEN
    ALTER TABLE trainings 
    ADD COLUMN agreement_template_url TEXT,
    ADD COLUMN attendance_template_url TEXT,
    ADD COLUMN completion_template_url TEXT;
  END IF;
END $$;

-- Add signature fields to user_profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'has_signed_agreement'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN has_signed_agreement BOOLEAN DEFAULT FALSE,
    ADD COLUMN agreement_signature_url TEXT,
    ADD COLUMN agreement_signature_date TIMESTAMPTZ,
    ADD COLUMN has_signed_attendance BOOLEAN DEFAULT FALSE,
    ADD COLUMN attendance_signature_url TEXT,
    ADD COLUMN attendance_signature_date TIMESTAMPTZ,
    ADD COLUMN has_signed_completion BOOLEAN DEFAULT FALSE,
    ADD COLUMN completion_signature_url TEXT,
    ADD COLUMN completion_signature_date TIMESTAMPTZ;
  END IF;
END $$;

-- Add indexes for better performance
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trainings_company_id') THEN
    CREATE INDEX idx_trainings_company_id ON trainings(company_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trainings_status') THEN
    CREATE INDEX idx_trainings_status ON trainings(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trainings_dates') THEN
    CREATE INDEX idx_trainings_dates ON trainings(start_date, end_date);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trainings_templates') THEN
    CREATE INDEX idx_trainings_templates ON trainings(agreement_template_url, attendance_template_url, completion_template_url);
  END IF;
END $$;

-- Enable RLS on trainings
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

-- Create or replace functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_training_company_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    SELECT name INTO NEW.company_name
    FROM companies
    WHERE id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create new triggers
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_trainings_updated_at') THEN
    CREATE TRIGGER update_trainings_updated_at
      BEFORE UPDATE ON trainings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_training_company_name') THEN
    CREATE TRIGGER update_training_company_name
      BEFORE INSERT OR UPDATE OF company_id ON trainings
      FOR EACH ROW
      EXECUTE FUNCTION update_training_company_name();
  END IF;
END $$;

-- Create new RLS policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read trainings' AND tablename = 'trainings') THEN
    CREATE POLICY "Users can read trainings"
      ON trainings
      FOR SELECT
      TO public
      USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage trainings' AND tablename = 'trainings') THEN
    CREATE POLICY "Admins can manage trainings"
      ON trainings
      FOR ALL
      TO public
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.uid() = id
          AND email = 'nicolas.cleton@petitmaker.fr'
        )
      );
  END IF;
END $$;