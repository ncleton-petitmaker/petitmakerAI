-- Fix RLS Policies for User Profiles
-- 
-- This migration:
-- 1. Drops problematic policies causing infinite recursion
-- 2. Creates new policies with proper access controls
-- 3. Fixes company policies for proper admin access

-- First check if policies exist before dropping them
DO $$ 
BEGIN
  -- Drop problematic policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Les administrateurs peuvent tout faire avec les profils' AND tablename = 'user_profiles') THEN
    DROP POLICY "Les administrateurs peuvent tout faire avec les profils" ON user_profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin access' AND tablename = 'user_profiles') THEN
    DROP POLICY "Admin access" ON user_profiles;
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
  
  -- Create new policies with better names, but only if they don't already exist
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_full_access' AND tablename = 'user_profiles') THEN
    CREATE POLICY "admin_full_access" 
      ON user_profiles 
      FOR ALL
      TO authenticated
      USING (is_admin = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_read_own' AND tablename = 'user_profiles') THEN
    CREATE POLICY "user_read_own" 
      ON user_profiles
      FOR SELECT
      TO authenticated
      USING (id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_update_own' AND tablename = 'user_profiles') THEN
    CREATE POLICY "user_update_own"
      ON user_profiles
      FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_insert_own' AND tablename = 'user_profiles') THEN
    CREATE POLICY "user_insert_own"
      ON user_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'system_create_profile' AND tablename = 'user_profiles') THEN
    CREATE POLICY "system_create_profile"
      ON user_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
  
  -- Fix companies policies if needed
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Les administrateurs peuvent tout faire avec les entreprises' AND tablename = 'companies') THEN
    DROP POLICY "Les administrateurs peuvent tout faire avec les entreprises" ON companies;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_manage_companies' AND tablename = 'companies') THEN
    CREATE POLICY "admin_manage_companies"
      ON companies
      FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_view_own_company' AND tablename = 'companies') THEN
    CREATE POLICY "users_view_own_company"
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