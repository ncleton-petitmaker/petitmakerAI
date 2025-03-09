/*
  # Fix notifications table and policies

  1. Changes
    - Drop and recreate notifications table with proper constraints
    - Add RLS policies
    - Add trigger for new user notifications
    
  2. Security
    - Enable RLS
    - Add proper access control policies
    - Use security definer for trigger function
*/

-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Drop and recreate notifications table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    DROP TABLE public.notifications CASCADE;
  END IF;
END $$;

-- Create notifications table
CREATE TABLE public.notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Add primary key constraint without naming it (PostgreSQL will auto-name it)
ALTER TABLE public.notifications ADD PRIMARY KEY (id);

-- Grant permissions
GRANT ALL ON TABLE public.notifications TO postgres;
GRANT ALL ON TABLE public.notifications TO authenticated;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow insert for authenticated users"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow select for authenticated users"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow update for authenticated users"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create notification handler function
CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_user_email text;
BEGIN
    -- Get user email
    SELECT email INTO v_user_email FROM auth.users WHERE id = NEW.id;

    -- Insert notification
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
        format('Un nouvel utilisateur (%s) s''est inscrit sur la plateforme.', v_user_email),
        false,
        now()
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();