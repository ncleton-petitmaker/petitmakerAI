/*
  # Add secure functions for questionnaire responses

  1. New Functions
    - `get_questionnaire_responses`: Get all responses for a user
    - `get_questionnaire_status`: Get completion status for all questionnaires

  2. Security
    - Functions are SECURITY DEFINER
    - Proper permission checks
*/

-- Create function to get all questionnaire responses for a user
CREATE OR REPLACE FUNCTION get_questionnaire_responses(user_uuid uuid)
RETURNS TABLE (
  questionnaire_type text,
  responses jsonb,
  created_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the requesting user is authorized
  IF auth.uid() = user_uuid THEN
    -- Return positioning questionnaire responses
    RETURN QUERY
    SELECT 
      'positioning'::text as questionnaire_type,
      responses,
      created_at
    FROM questionnaire_responses
    WHERE user_id = user_uuid

    UNION ALL

    -- Return evaluation responses
    SELECT 
      type as questionnaire_type,
      responses,
      created_at
    FROM evaluation_responses
    WHERE user_id = user_uuid

    UNION ALL

    -- Return satisfaction responses
    SELECT 
      'satisfaction'::text as questionnaire_type,
      responses,
      created_at
    FROM satisfaction_responses
    WHERE user_id = user_uuid

    ORDER BY created_at DESC;
  END IF;
END;
$$;

-- Create function to get questionnaire status for a user
CREATE OR REPLACE FUNCTION get_questionnaire_status(user_uuid uuid)
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  company text,
  positioning_completed boolean,
  initial_evaluation_completed boolean,
  final_evaluation_completed boolean,
  satisfaction_completed boolean,
  last_response_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the requesting user is authorized
  IF auth.uid() = user_uuid THEN
    RETURN QUERY
    SELECT
      up.id,
      up.first_name,
      up.last_name,
      up.company,
      up.questionnaire_completed,
      up.initial_evaluation_completed,
      up.final_evaluation_completed,
      up.satisfaction_completed,
      (
        SELECT MAX(created_at)
        FROM (
          SELECT created_at FROM questionnaire_responses WHERE user_id = up.id
          UNION ALL
          SELECT created_at FROM evaluation_responses WHERE user_id = up.id
          UNION ALL
          SELECT created_at FROM satisfaction_responses WHERE user_id = up.id
        ) responses
      ) as last_response_at
    FROM user_profiles up
    WHERE up.id = user_uuid;
  END IF;
END;
$$;

-- Create helper function to check if a questionnaire is completed
CREATE OR REPLACE FUNCTION is_questionnaire_completed(
  user_uuid uuid,
  questionnaire_type text
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the requesting user is authorized
  IF auth.uid() = user_uuid THEN
    CASE questionnaire_type
      WHEN 'positioning' THEN
        RETURN EXISTS (
          SELECT 1 FROM questionnaire_responses 
          WHERE user_id = user_uuid
        );
      WHEN 'initial' THEN
        RETURN EXISTS (
          SELECT 1 FROM evaluation_responses 
          WHERE user_id = user_uuid AND type = 'initial'
        );
      WHEN 'final' THEN
        RETURN EXISTS (
          SELECT 1 FROM evaluation_responses 
          WHERE user_id = user_uuid AND type = 'final'
        );
      WHEN 'satisfaction' THEN
        RETURN EXISTS (
          SELECT 1 FROM satisfaction_responses 
          WHERE user_id = user_uuid
        );
      ELSE
        RETURN false;
    END CASE;
  END IF;
  RETURN false;
END;
$$;