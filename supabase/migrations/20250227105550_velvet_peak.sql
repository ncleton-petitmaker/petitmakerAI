/*
  # Correction de la table de notifications

  1. Vérification de l'existence des politiques avant création
    - Évite les erreurs de duplication de politiques
*/

-- Vérifier si la table existe déjà
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
  ) THEN
    -- Créer la table si elle n'existe pas
    CREATE TABLE notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      type text NOT NULL,
      title text NOT NULL,
      message text NOT NULL,
      is_read boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Activer RLS sur la table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Créer les politiques seulement si elles n'existent pas déjà
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Admin users can read notifications'
  ) THEN
    CREATE POLICY "Admin users can read notifications"
      ON notifications
      FOR SELECT
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Admin users can update notifications'
  ) THEN
    CREATE POLICY "Admin users can update notifications"
      ON notifications
      FOR UPDATE
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Admin users can insert notifications'
  ) THEN
    CREATE POLICY "Admin users can insert notifications"
      ON notifications
      FOR INSERT
      TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Admin users can delete notifications'
  ) THEN
    CREATE POLICY "Admin users can delete notifications"
      ON notifications
      FOR DELETE
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'All users can insert notifications'
  ) THEN
    -- Allow all authenticated users to insert notifications
    -- This is needed for the student registration process
    CREATE POLICY "All users can insert notifications"
      ON notifications
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Create index for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);