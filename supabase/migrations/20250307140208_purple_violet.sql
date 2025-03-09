/*
  # Add training_id to questionnaire templates

  1. Changes
    - Add training_id column to questionnaire_templates table
    - Add foreign key constraint to trainings table
    - Add index for training_id
  
  2. Security
    - Enable RLS
    - Add policies for access control
*/

-- Add training_id column
ALTER TABLE questionnaire_templates 
ADD COLUMN IF NOT EXISTS training_id uuid REFERENCES trainings(id) ON DELETE CASCADE;

-- Create index for training_id
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_training_id 
ON questionnaire_templates(training_id);

-- Update RLS policies
CREATE POLICY "Users can view questionnaires for their training"
ON questionnaire_templates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.training_id = questionnaire_templates.training_id
  )
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  )
);