/*
  # Fix Policies and Permissions
  
  This migration fixes the infinite recursion issues with policies and ensures proper access control.
  
  1. Changes
    - Fixes user_profiles policies to avoid recursion
    - Adds proper admin access policies
    - Ensures correct table access permissions
    
  2. Security
    - Maintains RLS security
    - Implements safer policy checks
    - Preserves data access controls
*/

-- Create admin check function to avoid recursion
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users u
    JOIN public.user_profiles p ON u.id = p.id
    WHERE u.id = user_id 
    AND p.is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies to avoid conflicts
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Create fixed policies for user_profiles
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.user_profiles FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
  ON public.user_profiles FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete profiles"
  ON public.user_profiles FOR DELETE
  USING (is_admin(auth.uid()));

-- Create policies for companies
CREATE POLICY "Users can read companies"
  ON public.companies FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage companies"
  ON public.companies FOR ALL
  USING (is_admin(auth.uid()));

-- Create policies for trainings
CREATE POLICY "Users can read trainings"
  ON public.trainings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage trainings"
  ON public.trainings FOR ALL
  USING (is_admin(auth.uid()));

-- Create policies for documents
CREATE POLICY "Users can read own documents"
  ON public.documents FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can create own documents"
  ON public.documents FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can update own documents"
  ON public.documents FOR UPDATE
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can delete own documents"
  ON public.documents FOR DELETE
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Create policies for notifications
CREATE POLICY "Users can read notifications"
  ON public.notifications FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  USING (is_admin(auth.uid()));

-- Create policies for settings
CREATE POLICY "Users can read settings"
  ON public.settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage settings"
  ON public.settings FOR ALL
  USING (is_admin(auth.uid()));

-- Create policies for questionnaire_responses
CREATE POLICY "Users can read own questionnaire responses"
  ON public.questionnaire_responses FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can create own questionnaire responses"
  ON public.questionnaire_responses FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create policies for evaluation_responses
CREATE POLICY "Users can read own evaluation responses"
  ON public.evaluation_responses FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can create own evaluation responses"
  ON public.evaluation_responses FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create policies for satisfaction_responses
CREATE POLICY "Users can read own satisfaction responses"
  ON public.satisfaction_responses FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can create own satisfaction responses"
  ON public.satisfaction_responses FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create policies for resource_categories
CREATE POLICY "Users can read resource categories"
  ON public.resource_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage resource categories"
  ON public.resource_categories FOR ALL
  USING (is_admin(auth.uid()));

-- Create policies for resources
CREATE POLICY "Users can read resources"
  ON public.resources FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage resources"
  ON public.resources FOR ALL
  USING (is_admin(auth.uid()));

-- Create policies for account deletion requests
CREATE POLICY "Users can create own deletion requests"
  ON public.account_deletion_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage deletion requests"
  ON public.account_deletion_requests FOR ALL
  USING (is_admin(auth.uid()));

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO anon, authenticated;