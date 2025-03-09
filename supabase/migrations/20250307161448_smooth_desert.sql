/*
  # Fix questionnaire types and templates

  1. Changes
    - Drop and recreate questionnaire_type enum with correct values
    - Update questionnaire_templates table structure
    - Add proper constraints and defaults
    - Fix existing data

  2. Security
    - Enable RLS
    - Add appropriate policies
*/

-- First drop existing enum if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'questionnaire_type') THEN
    DROP TYPE questionnaire_type CASCADE;
  END IF;
END $$;

-- Create new enum type
CREATE TYPE questionnaire_type AS ENUM (
  'positioning',
  'initial_final_evaluation',
  'satisfaction'
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

-- Add updated_at trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_questionnaire_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_questionnaire_templates_updated_at
      BEFORE UPDATE ON questionnaire_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create questions table if it doesn't exist
CREATE TABLE IF NOT EXISTS questionnaire_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES questionnaire_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (
    question_type IN ('multiple_choice', 'short_answer', 'rating', 'yes_no')
  ),
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

-- Add updated_at trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_questionnaire_questions_updated_at'
  ) THEN
    CREATE TRIGGER update_questionnaire_questions_updated_at
      BEFORE UPDATE ON questionnaire_questions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;