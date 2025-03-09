-- Create function to check database connection with retries
CREATE OR REPLACE FUNCTION check_database_connection_with_retries()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  max_retries constant int := 3;
  current_try int := 0;
  start_time timestamptz;
  end_time timestamptz;
  response_time interval;
BEGIN
  WHILE current_try < max_retries LOOP
    BEGIN
      -- Set statement timeout for each attempt
      EXECUTE 'SET LOCAL statement_timeout = ''1s''';
      
      start_time := clock_timestamp();
      
      -- Quick health check
      PERFORM 1;
      
      end_time := clock_timestamp();
      response_time := end_time - start_time;
      
      RETURN jsonb_build_object(
        'connected', true,
        'response_time_ms', EXTRACT(MILLISECOND FROM response_time),
        'timestamp', now(),
        'attempt', current_try + 1
      );
    EXCEPTION
      WHEN sqlstate '57014' THEN -- query_canceled error code
        current_try := current_try + 1;
        IF current_try = max_retries THEN
          RETURN jsonb_build_object(
            'connected', false,
            'error', 'Connection check timed out after ' || max_retries || ' attempts',
            'timestamp', now()
          );
        END IF;
        -- Wait 100ms before next retry
        PERFORM pg_sleep(0.1);
      WHEN others THEN
        RETURN jsonb_build_object(
          'connected', false,
          'error', SQLERRM,
          'timestamp', now()
        );
    END;
  END LOOP;
END;
$$;

-- Create function to get user profile with retries
CREATE OR REPLACE FUNCTION get_user_profile_with_retries(user_uuid uuid)
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
DECLARE
  max_retries constant int := 3;
  current_try int := 0;
BEGIN
  WHILE current_try < max_retries LOOP
    BEGIN
      -- Set statement timeout for each attempt
      EXECUTE 'SET LOCAL statement_timeout = ''2s''';
      
      RETURN QUERY
      SELECT p.id, p.is_admin, p.first_name, p.last_name, p.company_id, p.created_at, p.updated_at
      FROM user_profiles p
      WHERE p.id = user_uuid
      LIMIT 1;
      
      RETURN;
    EXCEPTION
      WHEN sqlstate '57014' THEN -- query_canceled error code
        current_try := current_try + 1;
        IF current_try = max_retries THEN
          RAISE WARNING 'Profile query timed out for user % after % attempts', user_uuid, max_retries;
          RETURN;
        END IF;
        -- Wait 100ms before next retry
        PERFORM pg_sleep(0.1);
      WHEN others THEN
        RAISE WARNING 'Error getting profile for user %: %', user_uuid, SQLERRM;
        RETURN;
    END;
  END LOOP;
END;
$$;

-- Create function to check admin status with retries
CREATE OR REPLACE FUNCTION check_admin_status_with_retries(user_uuid uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  max_retries constant int := 3;
  current_try int := 0;
  result boolean;
BEGIN
  WHILE current_try < max_retries LOOP
    BEGIN
      -- Set statement timeout for each attempt
      EXECUTE 'SET LOCAL statement_timeout = ''1s''';
      
      SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = user_uuid
        AND is_admin = true
      ) INTO result;
      
      RETURN COALESCE(result, false);
    EXCEPTION
      WHEN sqlstate '57014' THEN -- query_canceled error code
        current_try := current_try + 1;
        IF current_try = max_retries THEN
          RAISE WARNING 'Admin check timed out for user % after % attempts', user_uuid, max_retries;
          RETURN false;
        END IF;
        -- Wait 100ms before next retry
        PERFORM pg_sleep(0.1);
      WHEN others THEN
        RAISE WARNING 'Error checking admin status for user %: %', user_uuid, SQLERRM;
        RETURN false;
    END;
  END LOOP;
END;
$$;

-- Create function to get auth user email with retries
CREATE OR REPLACE FUNCTION get_auth_users_email_with_retries(user_id uuid)
RETURNS text
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  max_retries constant int := 3;
  current_try int := 0;
  email_result text;
BEGIN
  WHILE current_try < max_retries LOOP
    BEGIN
      -- Set statement timeout for each attempt
      EXECUTE 'SET LOCAL statement_timeout = ''1s''';
      
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
    EXCEPTION
      WHEN sqlstate '57014' THEN -- query_canceled error code
        current_try := current_try + 1;
        IF current_try = max_retries THEN
          RAISE WARNING 'Email lookup timed out for user % after % attempts', user_id, max_retries;
          RETURN NULL;
        END IF;
        -- Wait 100ms before next retry
        PERFORM pg_sleep(0.1);
      WHEN others THEN
        RAISE WARNING 'Error getting email for user %: %', user_id, SQLERRM;
        RETURN NULL;
    END;
  END LOOP;
END;
$$;

-- Add indices for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_auth_users_id ON auth.users(id);