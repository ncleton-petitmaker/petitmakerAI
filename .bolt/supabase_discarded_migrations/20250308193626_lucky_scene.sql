/*
  # Questionnaires Schema Setup
  
  1. Drop existing policies
  2. Create/update enum types
  3. Create/update tables and columns
  4. Set up indexes and constraints
  5. Configure RLS policies
  6. Add triggers for timestamps
*/

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  -- Drop policies for questionnaire_templates
  DROP POLICY IF EXISTS "Admins can manage questionnaire templates" ON questionnaire_templates;
  DROP POLICY IF EXISTS "Everyone can read active questionnaire templates" ON questionnaire_templates;
  DROP POLICY IF EXISTS "Learners can read questionnaire templates for their training" ON questionnaire_templates;
  DROP POLICY IF EXISTS "admin_manage_templates_20250308" ON questionnaire_templates;
  DROP POLICY IF EXISTS "learner_read_templates_20250308" ON questionnaire_templates;

  -- Drop policies for questionnaire_questions
  DROP POLICY IF EXISTS "Admins can manage questionnaire questions" ON questionnaire_questions;
  DROP POLICY IF EXISTS "Everyone can read questionnaire questions" ON questionnaire_questions;
  DROP POLICY IF EXISTS "Learners can read questionnaire questions for their training" ON questionnaire_questions;
  DROP POLICY IF EXISTS "admin_manage_questions_20250308" ON questionnaire_questions;
  DROP POLICY IF EXISTS "learner_read_questions_20250308" ON questionnaire_questions;

  -- Drop policies for questionnaire_responses
  DROP POLICY IF EXISTS "Users can manage their own responses" ON questionnaire_responses;
  DROP POLICY IF EXISTS "Admins can read all responses" ON questionnaire_responses;
  DROP POLICY IF EXISTS "user_manage_responses_20250308" ON questionnaire_responses;
  DROP POLICY IF EXISTS "admin_read_responses_20250308" ON questionnaire_responses;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create enum types if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'questionnaire_type') THEN
    CREATE TYPE questionnaire_type AS ENUM ('positioning', 'initial_final_evaluation', 'satisfaction');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
    CREATE TYPE question_type AS ENUM ('multiple_choice', 'rating', 'short_answer', 'yes_no');
  END IF;
END $$;

-- Create or update questionnaire_templates table
CREATE TABLE IF NOT EXISTS questionnaire_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text,
  type questionnaire_type DEFAULT 'positioning',
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  training_id uuid REFERENCES trainings(id) ON DELETE CASCADE
);

-- Create or update questionnaire_questions table
CREATE TABLE IF NOT EXISTS questionnaire_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES questionnaire_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type question_type DEFAULT 'short_answer',
  options jsonb,
  correct_answer text,
  order_index integer NOT NULL,
  is_required boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create or update questionnaire_responses table
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('positioning', 'initial', 'final', 'satisfaction')),
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer CHECK (score >= 0 AND score <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns to user_profiles
DO $$ 
BEGIN
  -- Add questionnaire status columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'questionnaire_completed') THEN
    ALTER TABLE user_profiles ADD COLUMN questionnaire_completed BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'initial_evaluation_completed') THEN
    ALTER TABLE user_profiles ADD COLUMN initial_evaluation_completed BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'final_evaluation_completed') THEN
    ALTER TABLE user_profiles ADD COLUMN final_evaluation_completed BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'satisfaction_completed') THEN
    ALTER TABLE user_profiles ADD COLUMN satisfaction_completed BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add evaluation score columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'initial_evaluation_score') THEN
    ALTER TABLE user_profiles ADD COLUMN initial_evaluation_score INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'final_evaluation_score') THEN
    ALTER TABLE user_profiles ADD COLUMN final_evaluation_score INTEGER;
  END IF;
END $$;

-- Add score constraints to user_profiles
DO $$
BEGIN
  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_initial_evaluation_score_check;
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_initial_evaluation_score_check 
    CHECK (initial_evaluation_score >= 0 AND initial_evaluation_score <= 100);

  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_final_evaluation_score_check;
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_final_evaluation_score_check 
    CHECK (final_evaluation_score >= 0 AND final_evaluation_score <= 100);
END $$;

-- Create or update indexes
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_training_id ON questionnaire_templates(training_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_type ON questionnaire_templates(type);
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_is_active ON questionnaire_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_template_id ON questionnaire_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_order ON questionnaire_questions(order_index);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_user_id ON questionnaire_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_type ON questionnaire_responses(type);

-- Enable RLS
ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies with unique names
CREATE POLICY "admin_manage_templates_20250308_v2"
ON questionnaire_templates FOR ALL TO authenticated
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

CREATE POLICY "learner_read_templates_20250308_v2"
ON questionnaire_templates FOR SELECT TO public
USING (EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.id = auth.uid()
  AND user_profiles.training_id = questionnaire_templates.training_id
));

CREATE POLICY "admin_manage_questions_20250308_v2"
ON questionnaire_questions FOR ALL TO authenticated
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

CREATE POLICY "learner_read_questions_20250308_v2"
ON questionnaire_questions FOR SELECT TO public
USING (EXISTS (
  SELECT 1 FROM questionnaire_templates qt
  JOIN user_profiles up ON up.training_id = qt.training_id
  WHERE qt.id = questionnaire_questions.template_id
  AND up.id = auth.uid()
));

CREATE POLICY "user_manage_responses_20250308_v2"
ON questionnaire_responses FOR ALL TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_read_responses_20250308_v2"
ON questionnaire_responses FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.id = auth.uid()
  AND user_profiles.is_admin = true
));