/*
  # Questionnaires Schema Update
  
  1. New Tables
    - questionnaire_templates
      - id (uuid, primary key)
      - title (text)
      - description (text)
      - type (questionnaire_type)
      - version (integer)
      - is_active (boolean)
      - created_at (timestamptz)
      - updated_at (timestamptz)
      - created_by (uuid)
      - training_id (uuid)
    
    - questionnaire_questions
      - id (uuid, primary key)
      - template_id (uuid)
      - question_text (text)
      - question_type (question_type)
      - options (jsonb)
      - correct_answer (text)
      - order_index (integer)
      - is_required (boolean)
      - created_at (timestamptz)
      - updated_at (timestamptz)
    
    - questionnaire_responses
      - id (uuid, primary key)
      - user_id (uuid)
      - type (text)
      - responses (jsonb)
      - score (integer)
      - created_at (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for admin and learner access
  
  3. Changes
    - Add questionnaire status columns to user_profiles
    - Add evaluation score columns to user_profiles
    - Add constraints and indexes
*/

-- Drop existing policies to avoid conflicts
DO $$ 
DECLARE
  policy_name text;
  table_name text;
BEGIN
  FOR table_name, policy_name IN 
    SELECT t.tablename, p.policyname
    FROM pg_policies p
    JOIN pg_tables t ON t.tablename = p.tablename
    WHERE t.tablename IN ('questionnaire_templates', 'questionnaire_questions', 'questionnaire_responses')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, table_name);
  END LOOP;
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

-- Create or update tables
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

CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('positioning', 'initial', 'final', 'satisfaction')),
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer CHECK (score >= 0 AND score <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns to user_profiles
DO $$ 
BEGIN
  -- Status columns
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

  -- Score columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'initial_evaluation_score') THEN
    ALTER TABLE user_profiles ADD COLUMN initial_evaluation_score INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'final_evaluation_score') THEN
    ALTER TABLE user_profiles ADD COLUMN final_evaluation_score INTEGER;
  END IF;
END $$;

-- Add constraints
DO $$
BEGIN
  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_initial_evaluation_score_check;
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_initial_evaluation_score_check 
    CHECK (initial_evaluation_score >= 0 AND initial_evaluation_score <= 100);

  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_final_evaluation_score_check;
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_final_evaluation_score_check 
    CHECK (final_evaluation_score >= 0 AND final_evaluation_score <= 100);
END $$;

-- Create indexes
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

-- Create RLS policies with unique names
CREATE POLICY "admin_manage_templates_20250308_v3" ON questionnaire_templates
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

CREATE POLICY "learner_read_templates_20250308_v3" ON questionnaire_templates
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.training_id = questionnaire_templates.training_id
  ));

CREATE POLICY "admin_manage_questions_20250308_v3" ON questionnaire_questions
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

CREATE POLICY "learner_read_questions_20250308_v3" ON questionnaire_questions
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM questionnaire_templates qt
    JOIN user_profiles up ON up.training_id = qt.training_id
    WHERE qt.id = questionnaire_questions.template_id
    AND up.id = auth.uid()
  ));

CREATE POLICY "user_manage_responses_20250308_v3" ON questionnaire_responses
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_read_responses_20250308_v3" ON questionnaire_responses
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  ));