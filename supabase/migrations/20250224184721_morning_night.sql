/*
  # Fix Account Deletion Process

  1. Changes
    - Add cascade deletion for user data
    - Improve deletion request handling
    - Add better error handling

  2. Security
    - Maintain RLS policies
    - Ensure proper data cleanup
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_account_deletion_request ON account_deletion_requests;
DROP FUNCTION IF EXISTS handle_account_deletion();

-- Create function to handle account deletion
CREATE OR REPLACE FUNCTION handle_account_deletion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete user data from related tables
  DELETE FROM questionnaire_responses WHERE user_id = NEW.user_id;
  DELETE FROM user_profiles WHERE id = NEW.user_id;
  
  -- Delete the user from auth.users
  DELETE FROM auth.users WHERE id = NEW.user_id;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail
    RAISE WARNING 'Error in handle_account_deletion: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger for account deletion
CREATE TRIGGER on_account_deletion_request
  AFTER INSERT ON account_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_account_deletion();