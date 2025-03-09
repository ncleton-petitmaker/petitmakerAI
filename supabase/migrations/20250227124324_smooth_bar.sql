/*
  # Fix for email column issues
  
  1. Overview
    - Fixes issues with the admin panel expecting an email column
  
  2. Changes
    - Add a PL/pgSQL function to the auth.users view to properly handle email display in admin panel
    - Ensure proper permissions for viewing user data
*/

-- Function to get auth.users email with proper permissions
CREATE OR REPLACE FUNCTION get_auth_users_email(user_id uuid)
RETURNS text
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  email_result text;
BEGIN
  -- Only allow the user to get their own email or admins to get any email
  IF 
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  THEN
    SELECT email INTO email_result FROM auth.users WHERE id = user_id;
    RETURN email_result;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- Ensure companies table exists for foreign key references
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  size text,
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'France',
  phone text,
  website text,
  status text CHECK (status IN ('active', 'inactive', 'lead')) DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create a function to automatically create notifications for new users
CREATE OR REPLACE FUNCTION create_user_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  company_name text;
BEGIN
  -- Get company name if available
  SELECT c.name INTO company_name
  FROM companies c
  JOIN user_profiles up ON up.company_id = c.id
  WHERE up.id = NEW.id;

  -- Create notification for new user
  INSERT INTO notifications (
    type,
    title,
    message,
    is_read,
    created_at
  ) VALUES (
    'new_learner',
    'Nouvel apprenant inscrit',
    CASE 
      WHEN company_name IS NOT NULL THEN 
        (SELECT first_name || ' ' || last_name FROM user_profiles WHERE id = NEW.id) || ' de l''entreprise "' || company_name || '" s''est inscrit.'
      ELSE
        (SELECT first_name || ' ' || last_name FROM user_profiles WHERE id = NEW.id) || ' s''est inscrit.'
    END,
    false,
    now()
  );
  RETURN NEW;
END;
$$;

-- Create trigger for user notifications
CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_notification();