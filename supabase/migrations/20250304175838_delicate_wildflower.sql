/*
  # Fix questionnaire response functions
  
  1. Changes
    - Drop existing functions first to avoid return type conflicts
    - Recreate functions with correct return types and security
    
  2. Security
    - Functions are security definer to ensure proper access control
    - Only allows users to access their own data or admins to access all data
*/

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_questionnaire_responses(uuid);
DROP FUNCTION IF EXISTS get_evaluation_responses(uuid, text);
DROP FUNCTION IF EXISTS get_satisfaction_responses(uuid);

-- Function to get questionnaire responses
CREATE OR REPLACE FUNCTION get_questionnaire_responses(user_uuid uuid)
RETURNS SETOF questionnaire_responses
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if requesting user is authorized
  IF auth.uid() = user_uuid OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RETURN QUERY
    SELECT *
    FROM questionnaire_responses qr
    WHERE qr.user_id = user_uuid
    ORDER BY qr.created_at DESC
    LIMIT 1;
  END IF;
END;
$$;

-- Function to get evaluation responses with scores
CREATE OR REPLACE FUNCTION get_evaluation_responses(user_uuid uuid, eval_type text)
RETURNS SETOF evaluation_responses
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if requesting user is authorized
  IF auth.uid() = user_uuid OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RETURN QUERY
    SELECT *
    FROM evaluation_responses er
    WHERE er.user_id = user_uuid AND er.type = eval_type
    ORDER BY er.created_at DESC
    LIMIT 1;
  END IF;
END;
$$;

-- Function to get satisfaction responses
CREATE OR REPLACE FUNCTION get_satisfaction_responses(user_uuid uuid)
RETURNS SETOF satisfaction_responses
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if requesting user is authorized
  IF auth.uid() = user_uuid OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RETURN QUERY
    SELECT *
    FROM satisfaction_responses sr
    WHERE sr.user_id = user_uuid
    ORDER BY sr.created_at DESC
    LIMIT 1;
  END IF;
END;
$$;