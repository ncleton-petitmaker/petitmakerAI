/*
  # Create trainings table and related fields

  1. New Tables
    - `trainings` - Stores training information
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `duration` (text)
      - `trainer_name` (text)
      - `location` (text)
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `objectives` (jsonb)
      - `content` (text)
      - `price` (numeric)
      - `company_id` (uuid, references companies)
      - `status` (text)
      - Various configuration JSONBs for methods and elements
      - Template URLs for documents

  2. Changes to Existing Tables
    - Add training-related fields to `user_profiles`
      - `training_id` (uuid)
      - `training_status` (text)
      - Document signature fields

  3. Security
    - Enable RLS on trainings table
    - Add policies for read/write access
*/

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
CREATE INDEX IF NOT EXISTS idx_trainings_company_id ON trainings(company_id);
CREATE INDEX IF NOT EXISTS idx_trainings_status ON trainings(status);
CREATE INDEX IF NOT EXISTS idx_trainings_dates ON trainings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_trainings_templates ON trainings(agreement_template_url, attendance_template_url, completion_template_url);

-- Enable RLS on trainings
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trainings' AND policyname = 'Users can read trainings'
  ) THEN
    DROP POLICY "Users can read trainings" ON trainings;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trainings' AND policyname = 'Admins can manage trainings'
  ) THEN
    DROP POLICY "Admins can manage trainings" ON trainings;
  END IF;
END $$;

-- Add RLS policies for trainings
CREATE POLICY "Users can read trainings"
  ON trainings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage trainings"
  ON trainings
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create or replace function for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and create new one
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_trainings_updated_at'
  ) THEN
    DROP TRIGGER update_trainings_updated_at ON trainings;
  END IF;
END $$;

CREATE TRIGGER update_trainings_updated_at
  BEFORE UPDATE ON trainings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create or replace function for updating training company name
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

-- Drop trigger if exists and create new one
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_training_company_name'
  ) THEN
    DROP TRIGGER update_training_company_name ON trainings;
  END IF;
END $$;

CREATE TRIGGER update_training_company_name
  BEFORE INSERT OR UPDATE OF company_id ON trainings
  FOR EACH ROW
  EXECUTE FUNCTION update_training_company_name();