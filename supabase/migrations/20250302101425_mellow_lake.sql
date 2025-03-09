-- Function to execute dynamic SQL (for emergency table creation)
CREATE OR REPLACE FUNCTION execute_sql(sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Function to check if a function exists
CREATE OR REPLACE FUNCTION check_function_exists(function_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = function_name
  );
END;
$$;

-- Function to get server timestamp (for connection check)
CREATE OR REPLACE FUNCTION get_server_timestamp()
RETURNS timestamptz
LANGUAGE sql
AS $$
  SELECT NOW();
$$;

-- Function to create user_profiles table if it doesn't exist
CREATE OR REPLACE FUNCTION create_user_profiles_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
  ) THEN
    CREATE TABLE public.user_profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      is_admin BOOLEAN DEFAULT FALSE,
      first_name TEXT,
      last_name TEXT,
      company_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Add RLS policies
    ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
    
    -- Policy for users to read their own profile
    CREATE POLICY "Users can read their own profile"
      ON public.user_profiles
      FOR SELECT
      USING (auth.uid() = id);
      
    -- Policy for users to update their own profile
    CREATE POLICY "Users can update their own profile"
      ON public.user_profiles
      FOR UPDATE
      USING (auth.uid() = id);
      
    -- Policy for admins to read all profiles
    CREATE POLICY "Admins can read all profiles"
      ON public.user_profiles
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND is_admin = TRUE
        )
      );
      
    -- Policy for admins to update all profiles
    CREATE POLICY "Admins can update all profiles"
      ON public.user_profiles
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND is_admin = TRUE
        )
      );
  END IF;
END;
$$;

-- Function to create notifications table if it doesn't exist
CREATE OR REPLACE FUNCTION create_notifications_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
  ) THEN
    CREATE TABLE public.notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Add RLS policies
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    
    -- Policy for users to read their own notifications
    CREATE POLICY "Users can read their own notifications"
      ON public.notifications
      FOR SELECT
      USING (auth.uid() = user_id);
      
    -- Policy for users to update their own notifications
    CREATE POLICY "Users can update their own notifications"
      ON public.notifications
      FOR UPDATE
      USING (auth.uid() = user_id);
      
    -- Policy for admins to read all notifications
    CREATE POLICY "Admins can read all notifications"
      ON public.notifications
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND is_admin = TRUE
        )
      );
      
    -- Policy for admins to update all notifications
    CREATE POLICY "Admins can update all notifications"
      ON public.notifications
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND is_admin = TRUE
        )
      );
      
    -- Policy for admins to insert notifications
    CREATE POLICY "Admins can insert notifications"
      ON public.notifications
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND is_admin = TRUE
        )
      );
  END IF;
END;
$$;

-- Function to create companies table if it doesn't exist
CREATE OR REPLACE FUNCTION create_companies_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'companies'
  ) THEN
    CREATE TABLE public.companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      address TEXT,
      postal_code TEXT,
      city TEXT,
      country TEXT DEFAULT 'France',
      phone TEXT,
      email TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Add RLS policies
    ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
    
    -- Policy for users to read companies
    CREATE POLICY "Users can read companies"
      ON public.companies
      FOR SELECT
      USING (true);
      
    -- Policy for admins to insert, update, delete companies
    CREATE POLICY "Admins can manage companies"
      ON public.companies
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND is_admin = TRUE
        )
      );
  END IF;
END;
$$;

-- Function to create learners table if it doesn't exist
CREATE OR REPLACE FUNCTION create_learners_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'learners'
  ) THEN
    CREATE TABLE public.learners (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      position TEXT,
      auth_email TEXT,
      company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Add RLS policies
    ALTER TABLE public.learners ENABLE ROW LEVEL SECURITY;
    
    -- Policy for users to read learners
    CREATE POLICY "Users can read learners"
      ON public.learners
      FOR SELECT
      USING (true);
      
    -- Policy for admins to manage learners
    CREATE POLICY "Admins can manage learners"
      ON public.learners
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND is_admin = TRUE
        )
      );
  END IF;
END;
$$;

-- Function to create documents table if it doesn't exist
CREATE OR REPLACE FUNCTION create_documents_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'documents'
  ) THEN
    CREATE TABLE public.documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      file_path TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      is_public BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Add RLS policies
    ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
    
    -- Policy for users to read public documents
    CREATE POLICY "Users can read public documents"
      ON public.documents
      FOR SELECT
      USING (is_public = TRUE);
      
    -- Policy for users to read their own documents
    CREATE POLICY "Users can read their own documents"
      ON public.documents
      FOR SELECT
      USING (auth.uid() = user_id);
      
    -- Policy for users to read documents from their company
    CREATE POLICY "Users can read documents from their company"
      ON public.documents
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND company_id = documents.company_id
        )
      );
      
    -- Policy for admins to manage all documents
    CREATE POLICY "Admins can manage all documents"
      ON public.documents
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND is_admin = TRUE
        )
      );
  END IF;
END;
$$;

-- Function to create trainings table if it doesn't exist
CREATE OR REPLACE FUNCTION create_trainings_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'trainings'
  ) THEN
    CREATE TABLE public.trainings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      target_audience TEXT,
      prerequisites TEXT DEFAULT 'Aucun',
      duration TEXT DEFAULT '2 jours soit 14h',
      dates TEXT DEFAULT 'À définir',
      schedule TEXT DEFAULT 'De 9h à 12h30 et de 13h30 à 17h',
      min_participants INTEGER DEFAULT 1,
      max_participants INTEGER DEFAULT 8,
      registration_deadline TEXT DEFAULT 'Inscription à réaliser 1 mois avant le démarrage de la formation',
      location TEXT,
      accessibility_info TEXT DEFAULT 'Pour les personnes en situation de handicap, nous mettrons tout en œuvre pour vous accueillir ou pour vous réorienter. Vous pouvez nous contacter au XXXX',
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      price NUMERIC DEFAULT 0,
      objectives JSONB DEFAULT '[""]',
      content TEXT,
      evaluation_methods JSONB DEFAULT '{"profile_evaluation": true, "skills_evaluation": true, "knowledge_evaluation": true, "satisfaction_survey": true}',
      tracking_methods JSONB DEFAULT '{"attendance_sheet": true, "completion_certificate": true}',
      pedagogical_methods JSONB DEFAULT '{"needs_evaluation": true, "theoretical_content": true, "practical_exercises": true, "case_studies": true, "experience_sharing": true, "digital_support": true}',
      material_elements JSONB DEFAULT '{"computer_provided": true, "pedagogical_material": true, "digital_support_provided": true}',
      status TEXT DEFAULT 'draft',
      company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
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
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND is_admin = TRUE
        )
      );
      
    -- Create training_participants table
    CREATE TABLE public.training_participants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      training_id UUID REFERENCES public.trainings(id) ON DELETE CASCADE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'registered', -- registered, confirmed, cancelled, completed
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(training_id, user_id)
    );
    
    -- Add RLS policies
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
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND is_admin = TRUE
        )
      );
  END IF;
END;
$$;

-- Execute all table creation functions
SELECT create_user_profiles_table_if_not_exists();
SELECT create_notifications_table_if_not_exists();
SELECT create_companies_table_if_not_exists();
SELECT create_learners_table_if_not_exists();
SELECT create_documents_table_if_not_exists();
SELECT create_trainings_table_if_not_exists();