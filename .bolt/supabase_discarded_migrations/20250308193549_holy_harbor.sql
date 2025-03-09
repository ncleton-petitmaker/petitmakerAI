/*
  # Questionnaires Schema Setup
  
  1. Create enum types
  2. Create tables for templates, questions, and responses
  3. Set up RLS policies
  4. Add indexes and triggers
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage questionnaire templates" ON questionnaire_templates;
DROP POLICY IF EXISTS "Everyone can read active questionnaire templates" ON questionnaire_templates;
DROP POLICY IF EXISTS "Learners can read questionnaire templates for their training" ON questionnaire_templates;
DROP POLICY IF EXISTS "Admins can manage questionnaire questions" ON questionnaire_questions;
DROP POLICY IF EXISTS "Everyone can read questionnaire questions" ON questionnaire_questions;
DROP POLICY IF EXISTS "Learners can read questionnaire questions for their training" ON questionnaire_questions;
DROP POLICY IF EXISTS "Users can manage their own responses" ON questionnaire_responses;
DROP POLICY IF EXISTS "Admins can read all responses" ON questionnaire_responses;

-- Create enum types if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'questionnaire_type') THEN
    CREATE TYPE questionnaire_type AS ENUM (
      'positioning',
      'initial_final_evaluation',
      'satisfaction'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
    CREATE TYPE question_type AS ENUM (
      'multiple_choice',
      'rating',
      'short_answer',
      'yes_no'
    );
  END IF;
END $$;

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

-- Create questionnaire_questions table if it doesn't exist
CREATE TABLE IF NOT EXISTS questionnaire_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES questionnaire_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type question_type NOT NULL DEFAULT 'short_answer',
  options jsonb,
  correct_answer text,
  order_index integer NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create questionnaire_responses table if it doesn't exist
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES questionnaire_templates(id) ON DELETE CASCADE,
  type questionnaire_type NOT NULL DEFAULT 'positioning',
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create or replace function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_questionnaire_templates_updated_at ON questionnaire_templates;
DROP TRIGGER IF EXISTS update_questionnaire_questions_updated_at ON questionnaire_questions;

-- Create triggers
CREATE TRIGGER update_questionnaire_templates_updated_at
  BEFORE UPDATE ON questionnaire_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questionnaire_questions_updated_at
  BEFORE UPDATE ON questionnaire_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_training_id ON questionnaire_templates(training_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_type ON questionnaire_templates(type);
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_is_active ON questionnaire_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_template_id ON questionnaire_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_order ON questionnaire_questions(order_index);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_user_id ON questionnaire_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_template_id ON questionnaire_responses(template_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_type ON questionnaire_responses(type);

-- Enable RLS
ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names
CREATE POLICY "admin_manage_templates_20250308"
ON questionnaire_templates FOR ALL TO authenticated
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

CREATE POLICY "learner_read_templates_20250308"
ON questionnaire_templates FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.training_id = questionnaire_templates.training_id
  )
);

CREATE POLICY "admin_manage_questions_20250308"
ON questionnaire_questions FOR ALL TO authenticated
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

CREATE POLICY "learner_read_questions_20250308"
ON questionnaire_questions FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 
    FROM questionnaire_templates qt
    JOIN user_profiles up ON up.training_id = qt.training_id
    WHERE qt.id = questionnaire_questions.template_id
    AND up.id = auth.uid()
  )
);

CREATE POLICY "user_manage_responses_20250308"
ON questionnaire_responses FOR ALL TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_read_responses_20250308"
ON questionnaire_responses FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  )
);