/*
  # Add questionnaire tables and types

  1. New Types
    - questionnaire_type enum
    - question_type enum
  
  2. New Tables
    - questionnaire_templates
    - questionnaire_questions
  
  3. Security
    - Enable RLS
    - Add policies for admin management
    - Add policies for user read access
    
  4. Indexes
    - Add performance indexes
*/

-- Drop and recreate enums with safe checks
DO $$ 
BEGIN
  -- Drop existing types if they exist
  DROP TYPE IF EXISTS questionnaire_type CASCADE;
  DROP TYPE IF EXISTS question_type CASCADE;
END $$;

-- Create new enum types
CREATE TYPE questionnaire_type AS ENUM (
  'initial_final_evaluation',
  'positioning',
  'satisfaction'
);

CREATE TYPE question_type AS ENUM (
  'multiple_choice',
  'rating',
  'short_answer',
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
DROP POLICY IF EXISTS "Admins can manage questionnaire templates" ON questionnaire_templates;
DROP POLICY IF EXISTS "Everyone can read active questionnaire templates" ON questionnaire_templates;

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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_questionnaire_templates_updated_at ON questionnaire_templates;

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
DROP POLICY IF EXISTS "Admins can manage questionnaire questions" ON questionnaire_questions;
DROP POLICY IF EXISTS "Everyone can read questionnaire questions" ON questionnaire_questions;

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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_questionnaire_questions_updated_at ON questionnaire_questions;

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