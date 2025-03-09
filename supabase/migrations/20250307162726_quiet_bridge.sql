/*
  # Fix questionnaire templates schema

  1. Changes
    - Create questionnaire_templates table with proper structure
    - Add type column with correct enum values
    - Add necessary indexes and constraints
    - Enable RLS

  2. Security
    - Add RLS policies for proper access control
*/

-- Create enum type for questionnaire types if it doesn't exist
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_type ON questionnaire_templates(type);
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_is_active ON questionnaire_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_training_id ON questionnaire_templates(training_id);

-- Enable RLS
ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Admins can manage questionnaire templates" ON questionnaire_templates;
  DROP POLICY IF EXISTS "Everyone can read active questionnaire templates" ON questionnaire_templates;
  
  -- Create new policies
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
END $$;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_questionnaire_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_questionnaire_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_questionnaire_templates_updated_at
      BEFORE UPDATE ON questionnaire_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_questionnaire_templates_updated_at();
  END IF;
END $$;

-- Create questions table if it doesn't exist
CREATE TABLE IF NOT EXISTS questionnaire_questions (
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
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_template_id ON questionnaire_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_order ON questionnaire_questions(order_index);

-- Enable RLS for questions
ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for questions
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Admins can manage questionnaire questions" ON questionnaire_questions;
  DROP POLICY IF EXISTS "Everyone can read questionnaire questions" ON questionnaire_questions;
  
  -- Create new policies
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
END $$;

-- Create updated_at trigger for questions
CREATE OR REPLACE FUNCTION update_questionnaire_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_questionnaire_questions_updated_at'
  ) THEN
    CREATE TRIGGER update_questionnaire_questions_updated_at
      BEFORE UPDATE ON questionnaire_questions
      FOR EACH ROW
      EXECUTE FUNCTION update_questionnaire_questions_updated_at();
  END IF;
END $$;