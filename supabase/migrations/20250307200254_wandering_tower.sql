/*
  # Update questionnaire schema

  1. Changes
    - Add training_id to questionnaire_templates
    - Add foreign key constraint
    - Add index for better performance
    - Update RLS policies

  2. Security
    - Enable RLS
    - Add policies for questionnaire access
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
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_training_id 
ON questionnaire_templates(training_id);

-- Update RLS policies for questionnaire_templates
ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage questionnaire templates" ON questionnaire_templates;
DROP POLICY IF EXISTS "Learners can read questionnaire templates for their training" ON questionnaire_templates;

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

CREATE POLICY "Learners can read questionnaire templates for their training"
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage questionnaire questions" ON questionnaire_questions;
DROP POLICY IF EXISTS "Learners can read questionnaire questions for their training" ON questionnaire_questions;

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

CREATE POLICY "Learners can read questionnaire questions for their training"
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
  ALTER TABLE questionnaire_templates 
  ALTER COLUMN type TYPE questionnaire_type 
  USING type::questionnaire_type;
EXCEPTION
  WHEN others THEN
    NULL; -- Ignore errors if column already has correct type
END $$;