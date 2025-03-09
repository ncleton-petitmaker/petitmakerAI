/*
  # Fix Company Name Updates

  1. Changes
    - Add trigger function to update company name in related tables
    - Add trigger to companies table
    - Add trigger to update training company name
    
  2. Security
    - Function is set as SECURITY DEFINER to ensure it can update all necessary tables
*/

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_company_name_references()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only proceed if the company name has changed
  IF (TG_OP = 'UPDATE' AND OLD.name IS DISTINCT FROM NEW.name) THEN
    -- Update user_profiles
    UPDATE user_profiles 
    SET 
      company = NEW.name,
      updated_at = NOW()
    WHERE company_id = NEW.id;
    
    -- Update trainings
    UPDATE trainings 
    SET 
      company_name = NEW.name,
      updated_at = NOW()
    WHERE company_id = NEW.id;
    
    -- Update documents
    UPDATE documents 
    SET updated_at = NOW()
    WHERE company_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_company_name_references_trigger ON companies;

-- Create the trigger
CREATE TRIGGER update_company_name_references_trigger
  AFTER UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_company_name_references();

-- Add comment to explain the trigger
COMMENT ON TRIGGER update_company_name_references_trigger ON companies IS 
  'Updates company name references in related tables when company name changes';

-- Add comment to explain the function
COMMENT ON FUNCTION update_company_name_references() IS 
  'Trigger function to update company name references across all related tables';