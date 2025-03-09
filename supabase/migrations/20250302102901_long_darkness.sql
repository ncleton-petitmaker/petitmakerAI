-- Recreate trainings table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'trainings'
  ) THEN
    CREATE TABLE public.trainings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text,
      target_audience text,
      prerequisites text DEFAULT 'Aucun',
      duration text DEFAULT '2 jours soit 14h',
      dates text DEFAULT 'À définir',
      schedule text DEFAULT 'De 9h à 12h30 et de 13h30 à 17h',
      min_participants integer DEFAULT 1,
      max_participants integer DEFAULT 8,
      registration_deadline text DEFAULT 'Inscription à réaliser 1 mois avant le démarrage de la formation',
      location text,
      accessibility_info text DEFAULT 'Pour les personnes en situation de handicap, nous mettrons tout en œuvre pour vous accueillir ou pour vous réorienter. Vous pouvez nous contacter au XXXX',
      start_date timestamptz,
      end_date timestamptz,
      price numeric DEFAULT 0,
      objectives jsonb DEFAULT '[""]',
      content text,
      evaluation_methods jsonb DEFAULT '{"profile_evaluation": true, "skills_evaluation": true, "knowledge_evaluation": true, "satisfaction_survey": true}',
      tracking_methods jsonb DEFAULT '{"attendance_sheet": true, "completion_certificate": true}',
      pedagogical_methods jsonb DEFAULT '{"needs_evaluation": true, "theoretical_content": true, "practical_exercises": true, "case_studies": true, "experience_sharing": true, "digital_support": true}',
      material_elements jsonb DEFAULT '{"computer_provided": true, "pedagogical_material": true, "digital_support_provided": true}',
      status text DEFAULT 'draft',
      company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Add RLS policies
    ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;

    -- Policy for users to read trainings
    CREATE POLICY "Users can read trainings"
      ON public.trainings
      FOR SELECT
      USING (true);

    -- Policy for admins to manage trainings
    CREATE POLICY "Admins can manage trainings"
      ON public.trainings
      FOR ALL
      USING (EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
      ));

    -- Create training_participants table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.training_participants (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      training_id uuid REFERENCES public.trainings(id) ON DELETE CASCADE,
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      status text DEFAULT 'registered',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE(training_id, user_id)
    );

    -- Add RLS policies for training_participants
    ALTER TABLE public.training_participants ENABLE ROW LEVEL SECURITY;

    -- Policy for users to read their own participations
    CREATE POLICY "Users can read their own participations"
      ON public.training_participants
      FOR SELECT
      USING (auth.uid() = user_id);

    -- Policy for users to register themselves
    CREATE POLICY "Users can register themselves"
      ON public.training_participants
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    -- Policy for users to update their own participations
    CREATE POLICY "Users can update their own participations"
      ON public.training_participants
      FOR UPDATE
      USING (auth.uid() = user_id);

    -- Policy for admins to manage all participations
    CREATE POLICY "Admins can manage all participations"
      ON public.training_participants
      FOR ALL
      USING (EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
      ));
  END IF;
END $$;

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_trainings_company_id ON trainings(company_id);
CREATE INDEX IF NOT EXISTS idx_trainings_status ON trainings(status);
CREATE INDEX IF NOT EXISTS idx_trainings_dates ON trainings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_training_participants_training_id ON training_participants(training_id);
CREATE INDEX IF NOT EXISTS idx_training_participants_user_id ON training_participants(user_id);