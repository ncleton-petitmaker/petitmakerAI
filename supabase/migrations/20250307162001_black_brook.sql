/*
  # Create questionnaire tables and types

  1. New Types
    - questionnaire_type enum for categorizing questionnaires
    - question_type enum for different question formats

  2. New Tables
    - questionnaire_templates for storing questionnaire templates
    - questionnaire_questions for storing individual questions

  3. Security
    - Enable RLS on all tables
    - Add policies for admin access and read access
*/

-- Drop existing triggers if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_questionnaire_templates_updated_at'
  ) THEN
    DROP TRIGGER update_questionnaire_templates_updated_at ON questionnaire_templates;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_questionnaire_questions_updated_at'
  ) THEN
    DROP TRIGGER update_questionnaire_questions_updated_at ON questionnaire_questions;
  END IF;
END $$;

-- First drop existing enums if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'questionnaire_type') THEN
    DROP TYPE questionnaire_type CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
    DROP TYPE question_type CASCADE;
  END IF;
END $$;

-- Create new enum types
CREATE TYPE questionnaire_type AS ENUM (
  'positioning',
  'initial_final_evaluation',
  'satisfaction'
);

CREATE TYPE question_type AS ENUM (
  'multiple_choice',
  'short_answer',
  'rating',
  'yes_no'
);

-- Create questionnaire_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS questionnaire_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text,
  type questionnaire_type NOT NULL DEFAULT 'positioning',
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  training_id uuid REFERENCES trainings(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Admins can manage questionnaire templates" ON questionnaire_templates;
  DROP POLICY IF EXISTS "Everyone can read active questionnaire templates" ON questionnaire_templates;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Add policies
CREATE POLICY "Admins can manage questionnaire templates"
  ON questionnaire_templates
  FOR ALL
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

-- Add updated_at trigger
CREATE TRIGGER update_questionnaire_templates_updated_at
  BEFORE UPDATE ON questionnaire_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create questions table if it doesn't exist
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

-- Enable RLS
ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Admins can manage questionnaire questions" ON questionnaire_questions;
  DROP POLICY IF EXISTS "Everyone can read questionnaire questions" ON questionnaire_questions;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Add policies
CREATE POLICY "Admins can manage questionnaire questions"
  ON questionnaire_questions
  FOR ALL
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

-- Add updated_at trigger
CREATE TRIGGER update_questionnaire_questions_updated_at
  BEFORE UPDATE ON questionnaire_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_training_id ON questionnaire_templates(training_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_is_active ON questionnaire_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_template_id ON questionnaire_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_order ON questionnaire_questions(order_index);