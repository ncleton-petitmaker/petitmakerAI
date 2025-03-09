/*
  # Update questionnaires schema

  1. Add training_id to templates
  2. Update RLS policies
  3. Add necessary indexes
  4. Update enum types
*/

-- Add training_id to questionnaire_templates if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questionnaire_templates' 
    AND column_name = 'training_id'
  ) THEN
    ALTER TABLE questionnaire_templates 
    ADD COLUMN training_id UUID REFERENCES trainings(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for training_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_questionnaire_templates_training_id'
  ) THEN
    CREATE INDEX idx_questionnaire_templates_training_id 
    ON questionnaire_templates(training_id);
  END IF;
END $$;

-- Update RLS policies for questionnaire_templates
ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage questionnaire templates" ON questionnaire_templates;
DROP POLICY IF EXISTS "Everyone can read active questionnaire templates" ON questionnaire_templates;
DROP POLICY IF EXISTS "Learners can read questionnaire templates for their training" ON questionnaire_templates;

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

-- Update RLS policies for questionnaire_questions
ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage questionnaire questions" ON questionnaire_questions;
DROP POLICY IF EXISTS "Everyone can read questionnaire questions" ON questionnaire_questions;
DROP POLICY IF EXISTS "Learners can read questionnaire questions for their training" ON questionnaire_questions;

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
    SELECT 1 
    FROM questionnaire_templates qt
    JOIN user_profiles up ON up.training_id = qt.training_id
    WHERE qt.id = questionnaire_questions.template_id
    AND up.id = auth.uid()
  )
);

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

-- Update questionnaire_templates table to use the enum type
DO $$
BEGIN
  -- Only attempt to alter the column if it exists and isn't already the correct type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questionnaire_templates' 
    AND column_name = 'type'
    AND data_type != 'questionnaire_type'
  ) THEN
    ALTER TABLE questionnaire_templates 
    ALTER COLUMN type TYPE questionnaire_type 
    USING type::questionnaire_type;
  END IF;
END $$;