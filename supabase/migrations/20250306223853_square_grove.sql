/*
  # Fix notifications table and policies

  1. Changes
    - Create notifications table with UUID primary key
    - Add proper RLS policies
    - Add trigger for new user notifications
    
  2. Security
    - Enable RLS
    - Add proper access control policies
    - Use security definer for trigger function
*/

-- Create notifications table if not exists
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create new policies
CREATE POLICY "Users can read notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage notifications"
ON public.notifications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.notifications TO authenticated;

-- Create function to handle new user notifications
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create notification for new user
  INSERT INTO public.notifications (
    type,
    title,
    message,
    is_read,
    created_at
  )
  VALUES (
    'new_user',
    'Nouvel utilisateur inscrit',
    'Un nouvel utilisateur s''est inscrit sur la plateforme.',
    false,
    now()
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user notifications
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();