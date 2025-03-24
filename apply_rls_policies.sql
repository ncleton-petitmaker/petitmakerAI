/*
  # Update questionnaire RLS policies

  1. Changes
    - Update policies for questionnaire_templates to respect company isolation
    - Ensure learners only see questionnaires for their training based on company_id

  2. Security
    - Prevent users from one company accessing questionnaires of another company
*/

-- Drop existing policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Learners can read questionnaire templates for their training" ON questionnaire_templates;
END $$;

-- Create updated policy for questionnaire_templates
CREATE POLICY "Learners can read questionnaire templates for their training" ON questionnaire_templates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainings
      JOIN user_profiles ON user_profiles.company_id = trainings.company_id
      WHERE trainings.id = questionnaire_templates.training_id
      AND user_profiles.id = auth.uid()
    )
  );

-- Update policy for questionnaire_questions
DO $$
BEGIN
  DROP POLICY IF EXISTS "Everyone can read questionnaire questions" ON questionnaire_questions;
END $$;

CREATE POLICY "Everyone can read questionnaire questions" ON questionnaire_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM questionnaire_templates
      JOIN trainings ON trainings.id = questionnaire_templates.training_id
      JOIN user_profiles ON user_profiles.company_id = trainings.company_id
      WHERE questionnaire_templates.id = questionnaire_questions.template_id
      AND user_profiles.id = auth.uid()
    )
  );

-- Update policy for questionnaire_responses
DO $$
BEGIN
  DROP POLICY IF EXISTS "Learners can see their own responses" ON questionnaire_responses;
END $$;

CREATE POLICY "Learners can see their own responses" ON questionnaire_responses
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM questionnaire_templates
      JOIN trainings ON trainings.id = questionnaire_templates.training_id
      JOIN user_profiles ON user_profiles.company_id = trainings.company_id
      WHERE questionnaire_templates.id = questionnaire_responses.template_id
      AND user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  ); 