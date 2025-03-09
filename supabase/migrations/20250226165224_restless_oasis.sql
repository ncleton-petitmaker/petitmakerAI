-- Check if policies exist before dropping them
DO $$ 
BEGIN
  -- Drop problematic policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Les administrateurs peuvent tout faire avec les profils' AND tablename = 'user_profiles') THEN
    DROP POLICY "Les administrateurs peuvent tout faire avec les profils" ON user_profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin access to all profiles' AND tablename = 'user_profiles') THEN
    DROP POLICY "Admin access to all profiles" ON user_profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Profil par défaut' AND tablename = 'user_profiles') THEN
    DROP POLICY "Profil par défaut" ON user_profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for users' AND tablename = 'user_profiles') THEN
    DROP POLICY "Enable read access for users" ON user_profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable insert for authenticated users only' AND tablename = 'user_profiles') THEN
    DROP POLICY "Enable insert for authenticated users only" ON user_profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable update for users based on id' AND tablename = 'user_profiles') THEN
    DROP POLICY "Enable update for users based on id" ON user_profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow users to read profiles' AND tablename = 'user_profiles') THEN
    DROP POLICY "Allow users to read profiles" ON user_profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow users to update own profile' AND tablename = 'user_profiles') THEN
    DROP POLICY "Allow users to update own profile" ON user_profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow system to create profiles' AND tablename = 'user_profiles') THEN
    DROP POLICY "Allow system to create profiles" ON user_profiles;
  END IF;
  
  -- Check if the new policies already exist before creating them
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin access' AND tablename = 'user_profiles') THEN
    -- Create a simple policy for admins that doesn't cause recursion
    CREATE POLICY "Admin access" 
      ON user_profiles 
      FOR ALL
      TO authenticated
      USING (is_admin = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'User read own profile' AND tablename = 'user_profiles') THEN
    -- Create policy for users to read their own profile
    CREATE POLICY "User read own profile" 
      ON user_profiles
      FOR SELECT
      TO authenticated
      USING (id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'User update own profile' AND tablename = 'user_profiles') THEN
    -- Create policy for users to update their own profile
    CREATE POLICY "User update own profile"
      ON user_profiles
      FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'User insert own profile' AND tablename = 'user_profiles') THEN
    -- Create policy for users to insert their own profile
    CREATE POLICY "User insert own profile"
      ON user_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System create profile' AND tablename = 'user_profiles') THEN
    -- Create policy for system to create profiles for new users
    CREATE POLICY "System create profile"
      ON user_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
  
  -- Fix companies policies if needed
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Les administrateurs peuvent tout faire avec les entreprises' AND tablename = 'companies') THEN
    DROP POLICY "Les administrateurs peuvent tout faire avec les entreprises" ON companies;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin manage companies' AND tablename = 'companies') THEN
    CREATE POLICY "Admin manage companies"
      ON companies
      FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own company' AND tablename = 'companies') THEN
    CREATE POLICY "Users view own company"
      ON companies
      FOR SELECT
      TO authenticated
      USING (
        id IN (
          SELECT company_id FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND company_id IS NOT NULL
        )
      );
  END IF;
END $$;