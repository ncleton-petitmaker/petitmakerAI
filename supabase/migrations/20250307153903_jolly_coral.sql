/*
  # Update questionnaire schema
  
  1. Changes
    - Update questionnaire_type enum to have 3 types instead of 4
    - Create tables for questionnaire templates and questions
    - Add proper indexes and RLS policies
  
  2. Security
    - Enable RLS on all tables
    - Add policies for admin management and user access
*/

-- Create enum for question types if not exists
DO $$ BEGIN
  CREATE TYPE question_type AS ENUM (
    'multiple_choice',
    'short_answer',
    'rating',
    'yes_no'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for questionnaire types if not exists
DO $$ BEGIN
  CREATE TYPE questionnaire_type AS ENUM (
    'positioning',
    'initial_final_evaluation',
    'satisfaction'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create questionnaire templates table if not exists
CREATE TABLE IF NOT EXISTS questionnaire_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type questionnaire_type NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add training_id column if it doesn't exist
DO $$ 
BEGIN
  ALTER TABLE questionnaire_templates ADD COLUMN training_id uuid REFERENCES trainings(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Create questionnaire questions table if not exists
CREATE TABLE IF NOT EXISTS questionnaire_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES questionnaire_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type question_type NOT NULL,
  options jsonb,
  correct_answer text,
  order_index integer NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_type ON questionnaire_templates(type);
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_is_active ON questionnaire_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_training_id ON questionnaire_templates(training_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_template_id ON questionnaire_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_order ON questionnaire_questions(order_index);

-- Enable RLS
ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage questionnaire templates" ON questionnaire_templates;
DROP POLICY IF EXISTS "Everyone can read active questionnaire templates" ON questionnaire_templates;
DROP POLICY IF EXISTS "Admins can manage questionnaire questions" ON questionnaire_questions;
DROP POLICY IF EXISTS "Everyone can read questionnaire questions" ON questionnaire_questions;

-- Create policies for questionnaire templates
CREATE POLICY "Admins can manage questionnaire templates"
ON questionnaire_templates
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  )
);

CREATE POLICY "Everyone can read active questionnaire templates"
ON questionnaire_templates
FOR SELECT
TO authenticated
USING (is_active = true);

-- Create policies for questionnaire questions
CREATE POLICY "Admins can manage questionnaire questions"
ON questionnaire_questions
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  )
);

CREATE POLICY "Everyone can read questionnaire questions"
ON questionnaire_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM questionnaire_templates
    WHERE questionnaire_templates.id = template_id
    AND questionnaire_templates.is_active = true
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_questionnaire_templates_updated_at ON questionnaire_templates;
CREATE TRIGGER update_questionnaire_templates_updated_at
  BEFORE UPDATE ON questionnaire_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_questionnaire_questions_updated_at ON questionnaire_questions;
CREATE TRIGGER update_questionnaire_questions_updated_at
  BEFORE UPDATE ON questionnaire_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();