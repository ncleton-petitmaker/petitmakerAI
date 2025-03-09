/*
  # Fix questionnaire tables and responses

  1. Add missing columns to user_profiles
    - questionnaire_completed
    - initial_evaluation_completed 
    - final_evaluation_completed
    - satisfaction_completed
    - initial_evaluation_score
    - final_evaluation_score

  2. Add missing columns to trainings
    - objectives (jsonb array)
    - evaluation_methods (jsonb)
    - tracking_methods (jsonb)
    - pedagogical_methods (jsonb)
    - material_elements (jsonb)
*/

-- Add missing columns to user_profiles if they don't exist
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

  -- Add constraints for scores
  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_initial_evaluation_score_check;
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_initial_evaluation_score_check 
    CHECK (initial_evaluation_score >= 0 AND initial_evaluation_score <= 100);

  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_final_evaluation_score_check;
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_final_evaluation_score_check 
    CHECK (final_evaluation_score >= 0 AND final_evaluation_score <= 100);
END $$;

-- Add missing columns to trainings if they don't exist
DO $$ 
BEGIN
  -- Add objectives array
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainings' AND column_name = 'objectives') THEN
    ALTER TABLE trainings ADD COLUMN objectives JSONB DEFAULT '[""]'::jsonb;
  END IF;

  -- Add evaluation methods
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainings' AND column_name = 'evaluation_methods') THEN
    ALTER TABLE trainings ADD COLUMN evaluation_methods JSONB DEFAULT '{
      "profile_evaluation": true,
      "skills_evaluation": true,
      "knowledge_evaluation": true,
      "satisfaction_survey": true
    }'::jsonb;
  END IF;

  -- Add tracking methods
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainings' AND column_name = 'tracking_methods') THEN
    ALTER TABLE trainings ADD COLUMN tracking_methods JSONB DEFAULT '{
      "attendance_sheet": true,
      "completion_certificate": true
    }'::jsonb;
  END IF;

  -- Add pedagogical methods
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainings' AND column_name = 'pedagogical_methods') THEN
    ALTER TABLE trainings ADD COLUMN pedagogical_methods JSONB DEFAULT '{
      "needs_evaluation": true,
      "theoretical_content": true,
      "practical_exercises": true,
      "case_studies": true,
      "experience_sharing": true,
      "digital_support": true
    }'::jsonb;
  END IF;

  -- Add material elements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainings' AND column_name = 'material_elements') THEN
    ALTER TABLE trainings ADD COLUMN material_elements JSONB DEFAULT '{
      "computer_provided": true,
      "pedagogical_material": true,
      "digital_support_provided": true
    }'::jsonb;
  END IF;
END $$;

-- Create questionnaire_responses table if it doesn't exist
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('positioning', 'initial', 'final', 'satisfaction')),
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer CHECK (score >= 0 AND score <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_user_id ON questionnaire_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_type ON questionnaire_responses(type);

-- Enable RLS
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DROP POLICY IF EXISTS "Users can manage their own responses" ON questionnaire_responses;
CREATE POLICY "Users can manage their own responses" ON questionnaire_responses
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all responses" ON questionnaire_responses;
CREATE POLICY "Admins can read all responses" ON questionnaire_responses
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  ));