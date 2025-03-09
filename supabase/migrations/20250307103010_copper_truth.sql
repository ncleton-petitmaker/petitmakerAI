/*
  # Fix Companies Table RLS Policies
  
  1. Changes
    - Add proper RLS policies for companies table
    - Allow users to read companies
    - Allow admins to manage companies
    - Fix permission issues for company creation
    
  2. Security
    - Enable RLS on companies table
    - Add specific policies for company access
    - Ensure proper admin checks
*/

-- Ensure RLS is enabled
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Anyone can read companies" ON public.companies;

-- Create new policies with proper permissions
CREATE POLICY "Anyone can read companies"
ON public.companies FOR SELECT
USING (true);

CREATE POLICY "Admins can manage companies"
ON public.companies FOR ALL
USING (check_user_is_admin());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.companies TO authenticated;
GRANT ALL ON public.companies TO authenticated;

-- Add indexes for performance if not exists
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);

-- Add trigger for updating timestamps if not exists
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();