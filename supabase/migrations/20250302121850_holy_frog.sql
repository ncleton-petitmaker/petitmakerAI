-- Drop redundant tables
DROP TABLE IF EXISTS learners CASCADE;

-- Add missing columns to user_profiles if they don't exist
DO $$ 
BEGIN
  -- Add job_position column if it doesn't exist (renamed from position to avoid reserved keyword)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'job_position'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN job_position text;
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN status text CHECK (status IN ('active', 'inactive')) DEFAULT 'active';
  END IF;

  -- Add last_login column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'last_login'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_login timestamptz;
  END IF;
END $$;

-- Create function to update last_login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE user_profiles
  SET last_login = now()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$;

-- Create trigger for last_login update
DROP TRIGGER IF EXISTS on_auth_sign_in ON auth.sessions;
CREATE TRIGGER on_auth_sign_in
  AFTER INSERT ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_last_login();

-- Update RLS policies for user_profiles
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "user_read_own" ON user_profiles;
  DROP POLICY IF EXISTS "user_update_own" ON user_profiles;
  DROP POLICY IF EXISTS "admin_manage_all" ON user_profiles;
END $$;

-- Create new policies with unique names
CREATE POLICY "user_read_own_profile_v2"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "user_update_own_profile_v2"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "admin_manage_all_profiles_v2"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ));

-- Add indices for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login);

-- Create function to get user profile with better error handling
CREATE OR REPLACE FUNCTION get_user_profile_safe(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  is_admin boolean,
  first_name text,
  last_name text,
  company_id uuid,
  job_position text,
  status text,
  last_login timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.is_admin,
    p.first_name,
    p.last_name,
    p.company_id,
    p.job_position,
    p.status,
    p.last_login,
    p.created_at,
    p.updated_at
  FROM user_profiles p
  WHERE p.id = user_uuid
  LIMIT 1;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error getting profile for user %: %', user_uuid, SQLERRM;
    RETURN;
END;
$$;