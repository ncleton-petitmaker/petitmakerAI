/*
  # Fix questionnaires schema

  1. New Tables
    - `questionnaire_templates` - Stores questionnaire templates
    - `questionnaire_questions` - Stores questions for each template
    - `questionnaire_responses` - Stores user responses
    
  2. Security
    - Enable RLS
    - Add policies for data access
    
  3. Changes
    - Adds proper schema for questionnaires
    - Fixes data storage issues
*/

-- Create questionnaire_type enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'questionnaire_type') THEN
    CREATE TYPE questionnaire_type AS ENUM (
      'positioning',
      'initial_final_evaluation',
      'satisfaction'
    );
  END IF;
END $$;

-- Create question_type enum if it doesn't exist
DO $$ 
BEGIN
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
  score integer CHECK (score >= 0 AND score <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

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

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop policies from questionnaire_templates
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'questionnaire_templates' AND policyname = 'Admins can manage questionnaire templates') THEN
    DROP POLICY "Admins can manage questionnaire templates" ON questionnaire_templates;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'questionnaire_templates' AND policyname = 'Learners can read questionnaire templates for their training') THEN
    DROP POLICY "Learners can read questionnaire templates for their training" ON questionnaire_templates;
  END IF;

  -- Drop policies from questionnaire_questions
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'questionnaire_questions' AND policyname = 'Admins can manage questionnaire questions') THEN
    DROP POLICY "Admins can manage questionnaire questions" ON questionnaire_questions;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'questionnaire_questions' AND policyname = 'Learners can read questionnaire questions for their training') THEN
    DROP POLICY "Learners can read questionnaire questions for their training" ON questionnaire_questions;
  END IF;

  -- Drop policies from questionnaire_responses
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'questionnaire_responses' AND policyname = 'Users can manage their own responses') THEN
    DROP POLICY "Users can manage their own responses" ON questionnaire_responses;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'questionnaire_responses' AND policyname = 'Admins can read all responses') THEN
    DROP POLICY "Admins can read all responses" ON questionnaire_responses;
  END IF;
END $$;

-- Create policies for questionnaire_templates
CREATE POLICY "Admins can manage questionnaire templates" ON questionnaire_templates
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  ));

CREATE POLICY "Learners can read questionnaire templates for their training" ON questionnaire_templates
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.training_id = questionnaire_templates.training_id
  ));

-- Create policies for questionnaire_questions
CREATE POLICY "Admins can manage questionnaire questions" ON questionnaire_questions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  ));

CREATE POLICY "Learners can read questionnaire questions for their training" ON questionnaire_questions
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 
    FROM questionnaire_templates qt
    JOIN user_profiles up ON up.training_id = qt.training_id
    WHERE qt.id = questionnaire_questions.template_id
    AND up.id = auth.uid()
  ));

-- Create policies for questionnaire_responses
CREATE POLICY "Users can manage their own responses" ON questionnaire_responses
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all responses" ON questionnaire_responses
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  ));

-- Create or replace trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
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