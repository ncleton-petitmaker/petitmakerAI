-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'admin_full_access'
  ) THEN
    DROP POLICY "admin_full_access" ON user_profiles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'user_read_own'
  ) THEN
    DROP POLICY "user_read_own" ON user_profiles;
  END IF;
END $$;

-- Create new policies with proper admin access
CREATE POLICY "admin_read_all_profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR -- User can read their own profile
    EXISTS ( -- Admin can read all profiles
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "admin_update_all_profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR -- User can update their own profile
    EXISTS ( -- Admin can update all profiles
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    auth.uid() = id OR -- User can update their own profile
    EXISTS ( -- Admin can update all profiles
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Create function to get all learners (non-admin users)
CREATE OR REPLACE FUNCTION get_all_learners()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  company text,
  company_id uuid,
  job_position text,
  status text,
  last_login timestamptz,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if requesting user is admin
  IF EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    RETURN QUERY
    SELECT 
      up.id,
      up.first_name,
      up.last_name,
      up.company,
      up.company_id,
      up.job_position,
      up.status,
      up.last_login,
      up.created_at
    FROM user_profiles up
    WHERE up.is_admin = false
    ORDER BY up.created_at DESC;
  END IF;
END;
$$;