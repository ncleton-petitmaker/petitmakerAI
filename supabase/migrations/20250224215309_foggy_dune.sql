/*
  # Add questionnaire status columns

  1. New Columns
    - `initial_evaluation_completed`: boolean
    - `final_evaluation_completed`: boolean
    - `satisfaction_completed`: boolean

  2. Security
    - Maintain existing RLS policies
*/

-- Add evaluation completion columns to user_profiles if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'initial_evaluation_completed'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN initial_evaluation_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'final_evaluation_completed'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN final_evaluation_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'satisfaction_completed'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN satisfaction_completed boolean DEFAULT false;
  END IF;
END $$;

-- Create function to update questionnaire status
CREATE OR REPLACE FUNCTION update_questionnaire_status(
  user_uuid uuid,
  questionnaire_type text,
  completed boolean
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the requesting user is authorized
  IF auth.uid() = user_uuid THEN
    CASE questionnaire_type
      WHEN 'positioning' THEN
        UPDATE user_profiles
        SET questionnaire_completed = completed
        WHERE id = user_uuid;
      WHEN 'initial' THEN
        UPDATE user_profiles
        SET initial_evaluation_completed = completed
        WHERE id = user_uuid;
      WHEN 'final' THEN
        UPDATE user_profiles
        SET final_evaluation_completed = completed
        WHERE id = user_uuid;
      WHEN 'satisfaction' THEN
        UPDATE user_profiles
        SET satisfaction_completed = completed
        WHERE id = user_uuid;
    END CASE;
  END IF;
END;
$$;