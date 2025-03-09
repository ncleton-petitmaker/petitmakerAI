-- Add missing columns to companies table
DO $$ 
BEGIN
  -- Add email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE companies ADD COLUMN email text;
  END IF;

  -- Add website column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' 
    AND column_name = 'website'
  ) THEN
    ALTER TABLE companies ADD COLUMN website text;
  END IF;
END $$;

-- Add missing columns to trainings table
DO $$ 
BEGIN
  -- Add content column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainings' 
    AND column_name = 'content'
  ) THEN
    ALTER TABLE trainings ADD COLUMN content text;
  END IF;

  -- Add dates column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainings' 
    AND column_name = 'dates'
  ) THEN
    ALTER TABLE trainings ADD COLUMN dates text DEFAULT 'À définir';
  END IF;
END $$;

-- Create function to get user profile with better error handling
CREATE OR REPLACE FUNCTION get_user_profile_safe_v2(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  is_admin boolean,
  first_name text,
  last_name text,
  company_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.is_admin, p.first_name, p.last_name, p.company_id, p.created_at, p.updated_at
  FROM user_profiles p
  WHERE p.id = user_uuid
  LIMIT 1;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error getting profile for user %: %', user_uuid, SQLERRM;
    RETURN;
END;
$$;

-- Create function to check admin status with better error handling
CREATE OR REPLACE FUNCTION check_admin_status_safe_v2(user_uuid uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT p.is_admin INTO is_admin
  FROM user_profiles p
  WHERE p.id = user_uuid
  LIMIT 1;
  
  RETURN COALESCE(is_admin, false);
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error checking admin status for user %: %', user_uuid, SQLERRM;
    RETURN false;
END;
$$;

-- Create function to check connection status
CREATE OR REPLACE FUNCTION check_connection_safe_v2()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  start_time timestamptz;
  end_time timestamptz;
  response_time interval;
BEGIN
  start_time := clock_timestamp();
  
  -- Quick health check
  PERFORM 1;
  
  end_time := clock_timestamp();
  response_time := end_time - start_time;
  
  RETURN jsonb_build_object(
    'connected', true,
    'response_time_ms', EXTRACT(MILLISECOND FROM response_time),
    'timestamp', now()
  );
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'connected', false,
      'error', SQLERRM,
      'timestamp', now()
    );
END;
$$;

-- Add indices for better performance
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_trainings_content ON trainings(content);
CREATE INDEX IF NOT EXISTS idx_trainings_dates ON trainings(dates);