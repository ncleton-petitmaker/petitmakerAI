/*
  # Create questionnaire tables and types

  1. New Types
    - questionnaire_type enum
    - question_type enum
  
  2. New Tables
    - questionnaire_templates
    - questionnaire_questions
  
  3. Security
    - Enable RLS on both tables
    - Add policies for admin management
    - Add policies for user read access
*/

-- First check and create enum types
DO $$ 
BEGIN
  -- Create questionnaire_type enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'questionnaire_type') THEN
    CREATE TYPE questionnaire_type AS ENUM (
      'positioning',
      'initial_final_evaluation',
      'satisfaction'
    );
  END IF;

  -- Create question_type enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
    CREATE TYPE question_type AS ENUM (
      'multiple_choice',
      'rating',
      'short_answer',
      'yes_no'
    );
  END IF;
END $$;

-- Create or update questionnaire_templates table
DO $$ 
BEGIN
  -- Create table if it doesn't exist
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

  -- Enable RLS if not already enabled
  ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;

  -- Drop existing trigger if it exists
  DROP TRIGGER IF EXISTS update_questionnaire_templates_updated_at ON questionnaire_templates;

  -- Create trigger
  CREATE TRIGGER update_questionnaire_templates_updated_at
    BEFORE UPDATE ON questionnaire_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  -- Drop existing policies
  DROP POLICY IF EXISTS "admin_manage_templates_20250308" ON questionnaire_templates;
  DROP POLICY IF EXISTS "learner_read_templates_20250308" ON questionnaire_templates;

  -- Create new policies
  CREATE POLICY "admin_manage_templates_20250308"
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

  CREATE POLICY "learner_read_templates_20250308"
    ON questionnaire_templates
    FOR SELECT
    TO public
    USING (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.training_id = questionnaire_templates.training_id
      )
    );

EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Create or update questionnaire_questions table
DO $$ 
BEGIN
  -- Create table if it doesn't exist
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

  -- Enable RLS if not already enabled
  ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;

  -- Drop existing trigger if it exists
  DROP TRIGGER IF EXISTS update_questionnaire_questions_updated_at ON questionnaire_questions;

  -- Create trigger
  CREATE TRIGGER update_questionnaire_questions_updated_at
    BEFORE UPDATE ON questionnaire_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  -- Drop existing policies
  DROP POLICY IF EXISTS "admin_manage_questions_20250308" ON questionnaire_questions;
  DROP POLICY IF EXISTS "learner_read_questions_20250308" ON questionnaire_questions;

  -- Create new policies
  CREATE POLICY "admin_manage_questions_20250308"
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

  CREATE POLICY "learner_read_questions_20250308"
    ON questionnaire_questions
    FOR SELECT
    TO public
    USING (
      EXISTS (
        SELECT 1 FROM (
          questionnaire_templates qt
          JOIN user_profiles up ON up.training_id = qt.training_id
        )
        WHERE qt.id = questionnaire_questions.template_id
        AND up.id = auth.uid()
      )
    );

EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_training_id ON questionnaire_templates(training_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_type ON questionnaire_templates(type);
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_is_active ON questionnaire_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_template_id ON questionnaire_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_order ON questionnaire_questions(order_index);