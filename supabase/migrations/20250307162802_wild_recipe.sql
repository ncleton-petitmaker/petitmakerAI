/*
  # Fix questionnaire schema

  1. Changes
    - Drop existing enum and tables if they exist
    - Create new questionnaire_type enum
    - Create questionnaire_templates table with proper structure
    - Create questionnaire_questions table
    - Add necessary indexes and constraints
    - Enable RLS with proper policies

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for admins and users
*/

-- Drop existing objects if they exist
DROP TABLE IF EXISTS questionnaire_questions CASCADE;
DROP TABLE IF EXISTS questionnaire_templates CASCADE;
DROP TYPE IF EXISTS questionnaire_type CASCADE;

-- Create questionnaire_type enum
CREATE TYPE questionnaire_type AS ENUM (
  'positioning',
  'initial_final_evaluation',
  'satisfaction'
);

-- Create questionnaire_templates table
CREATE TABLE questionnaire_templates (
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

-- Create indexes
CREATE INDEX idx_questionnaire_templates_type ON questionnaire_templates(type);
CREATE INDEX idx_questionnaire_templates_is_active ON questionnaire_templates(is_active);
CREATE INDEX idx_questionnaire_templates_training_id ON questionnaire_templates(training_id);

-- Enable RLS
ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_questionnaire_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_questionnaire_templates_updated_at
  BEFORE UPDATE ON questionnaire_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_questionnaire_templates_updated_at();

-- Create questions table
CREATE TABLE questionnaire_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES questionnaire_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL,
  options jsonb,
  correct_answer text,
  order_index integer NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for questions
CREATE INDEX idx_questionnaire_questions_template_id ON questionnaire_questions(template_id);
CREATE INDEX idx_questionnaire_questions_order ON questionnaire_questions(order_index);

-- Enable RLS for questions
ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for questions
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

-- Create updated_at trigger for questions
CREATE OR REPLACE FUNCTION update_questionnaire_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_questionnaire_questions_updated_at
  BEFORE UPDATE ON questionnaire_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_questionnaire_questions_updated_at();