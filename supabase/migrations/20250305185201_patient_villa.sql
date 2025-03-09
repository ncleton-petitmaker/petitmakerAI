/*
  # Fix Training Data Structure and Relationships

  1. Changes
    - Add training_id to user_profiles table
    - Add training status fields to user_profiles
    - Add training relationship fields to user_profiles
    - Update RLS policies for proper access control

  2. Security
    - Enable RLS on all affected tables
    - Add appropriate policies for data access
    - Ensure admin access is properly handled

  3. Data Migration
    - Preserve existing data
    - Set up proper relationships
*/

-- Add training fields to user_profiles if they don't exist
DO $$ 
BEGIN
  -- Add training_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'training_id'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN training_id UUID REFERENCES public.trainings(id) ON DELETE SET NULL;
  END IF;

  -- Add training status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'training_status'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN training_status TEXT DEFAULT 'registered';
  END IF;

  -- Add training relationship fields if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'has_signed_agreement'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN has_signed_agreement BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'agreement_signature_url'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN agreement_signature_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'agreement_signature_date'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN agreement_signature_date TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'has_signed_attendance'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN has_signed_attendance BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'attendance_signature_url'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN attendance_signature_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'attendance_signature_date'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN attendance_signature_date TIMESTAMPTZ;
  END IF;
END $$;

-- Create or replace function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = user_id AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "allow_select_for_auth" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_insert_for_auth" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_update_for_auth" ON public.user_profiles;

-- Create new policies
CREATE POLICY "allow_select_for_auth"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR is_admin(auth.uid())
);

CREATE POLICY "allow_insert_for_auth"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()
);

CREATE POLICY "allow_update_for_auth"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid() OR is_admin(auth.uid())
)
WITH CHECK (
  id = auth.uid() OR is_admin(auth.uid())
);

-- Update trainings table
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "allow_select_trainings" ON public.trainings;
DROP POLICY IF EXISTS "allow_all_for_admin" ON public.trainings;

-- Create new policies
CREATE POLICY "allow_select_trainings"
ON public.trainings
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT training_id 
    FROM public.user_profiles 
    WHERE id = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "allow_all_for_admin"
ON public.trainings
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add comment explaining the training_id reference
COMMENT ON COLUMN public.user_profiles.training_id IS 'Reference to the training the user is enrolled in';

-- Add comment explaining the training status
COMMENT ON COLUMN public.user_profiles.training_status IS 'Current status of the user in the training';