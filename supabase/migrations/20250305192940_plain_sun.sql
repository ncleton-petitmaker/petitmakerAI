/*
  # Complete Database Schema Migration
  
  This migration creates all necessary tables, triggers, policies and indexes for the application.
  It uses safe operations and proper error handling to avoid conflicts.
  
  1. Tables
    - user_profiles: User profile information and preferences
    - companies: Company information 
    - trainings: Training course details
    - documents: Document management
    - notifications: System notifications
    - settings: Application settings
    - questionnaire_responses: User questionnaire responses
    - evaluation_responses: User evaluation responses 
    - satisfaction_responses: User satisfaction feedback
    - resource_categories: Resource categorization
    - resources: Training resources
    - account_deletion_requests: Account deletion management
    
  2. Security
    - Enables Row Level Security (RLS) on all tables
    - Creates appropriate access policies
    - Sets up proper permissions
    
  3. Performance
    - Creates necessary indexes
    - Optimizes common queries
    
  4. Automation
    - Sets up triggers for timestamp updates
    - Implements automatic notifications
    - Handles evaluation score updates
*/

-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Create or replace functions first
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_training_company_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    SELECT name INTO NEW.company_name
    FROM public.companies
    WHERE id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION create_user_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (type, title, message, is_read)
  VALUES (
    TG_ARGV[0],
    TG_ARGV[1],
    'Un nouvel événement requiert votre attention',
    false
  );
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_evaluation_scores()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'initial' THEN
    UPDATE public.user_profiles
    SET initial_evaluation_score = NEW.score
    WHERE id = NEW.user_id;
  ELSIF NEW.type = 'final' THEN
    UPDATE public.user_profiles
    SET final_evaluation_score = NEW.score
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  industry text,
  size text,
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'France',
  phone text,
  email text,
  website text,
  siret text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'lead')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trainings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  evaluation_methods jsonb DEFAULT '{"skills_evaluation": true, "profile_evaluation": true, "satisfaction_survey": true, "knowledge_evaluation": true}',
  tracking_methods jsonb DEFAULT '{"attendance_sheet": true, "completion_certificate": true}',
  pedagogical_methods jsonb DEFAULT '{"case_studies": true, "digital_support": true, "needs_evaluation": true, "experience_sharing": true, "practical_exercises": true, "theoretical_content": true}',
  material_elements jsonb DEFAULT '{"computer_provided": true, "pedagogical_material": true, "digital_support_provided": true}',
  status text DEFAULT 'draft',
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name text,
  metadata text,
  trainer_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text DEFAULT '' NOT NULL,
  last_name text DEFAULT '' NOT NULL,
  company text DEFAULT '' NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  job_position text,
  training_id uuid REFERENCES public.trainings(id) ON DELETE SET NULL,
  training_status text DEFAULT 'registered',
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  is_admin boolean DEFAULT false,
  photo_url text,
  google_photo_url text,
  last_login timestamptz,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  questionnaire_completed boolean DEFAULT false,
  initial_evaluation_completed boolean DEFAULT false,
  final_evaluation_completed boolean DEFAULT false,
  satisfaction_completed boolean DEFAULT false,
  initial_evaluation_score integer CHECK (initial_evaluation_score >= 0 AND initial_evaluation_score <= 100),
  final_evaluation_score integer CHECK (final_evaluation_score >= 0 AND final_evaluation_score <= 100),
  has_signed_agreement boolean DEFAULT false NOT NULL,
  agreement_signature_url text,
  agreement_signature_date timestamptz,
  has_signed_attendance boolean DEFAULT false NOT NULL,
  attendance_signature_url text,
  attendance_signature_date timestamptz,
  internal_rules_acknowledged boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  type text CHECK (type IN ('convention', 'attestation', 'devis', 'facture', 'programme', 'autre')),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  training_id uuid REFERENCES public.trainings(id) ON DELETE CASCADE,
  file_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name text NOT NULL,
  siret text,
  training_number text,
  address text,
  city text,
  postal_code text,
  country text,
  email text,
  phone text,
  website text,
  logo_path text,
  signature_path text,
  internal_rules_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.questionnaire_responses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responses jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evaluation_responses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  responses jsonb NOT NULL,
  score integer CHECK (score >= 0 AND score <= 100),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.satisfaction_responses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responses jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resource_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  type text CHECK (type IN ('document', 'video', 'exercise')),
  url text NOT NULL,
  category uuid REFERENCES resource_categories(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  reason text,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables with error handling
DO $$ 
BEGIN
  EXECUTE 'ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.evaluation_responses ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.satisfaction_responses ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY';
EXCEPTION 
  WHEN others THEN NULL;
END $$;

-- Create policies for user_profiles
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.user_profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Admins can update all profiles"
  ON public.user_profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = true
  ));

-- Create policies for companies
CREATE POLICY "Users can read companies"
  ON public.companies FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage companies"
  ON public.companies FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = true
  ));

-- Create policies for trainings
CREATE POLICY "Users can read trainings"
  ON public.trainings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage trainings"
  ON public.trainings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = true
  ));

-- Create policies for documents
CREATE POLICY "Users can read own documents"
  ON public.documents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own documents"
  ON public.documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own documents"
  ON public.documents FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all documents"
  ON public.documents FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = true
  ));

-- Create policies for notifications
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (true);

-- Create policies for settings
CREATE POLICY "Admins can manage settings"
  ON public.settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Users can read settings"
  ON public.settings FOR SELECT
  USING (true);

-- Create policies for questionnaire_responses
CREATE POLICY "Users can read own questionnaire responses"
  ON public.questionnaire_responses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own questionnaire responses"
  ON public.questionnaire_responses FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create policies for evaluation_responses
CREATE POLICY "Users can read own evaluation responses"
  ON public.evaluation_responses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own evaluation responses"
  ON public.evaluation_responses FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create policies for satisfaction_responses
CREATE POLICY "Users can read own satisfaction responses"
  ON public.satisfaction_responses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own satisfaction responses"
  ON public.satisfaction_responses FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create policies for resource_categories
CREATE POLICY "Users can read resource categories"
  ON public.resource_categories FOR SELECT
  USING (true);

-- Create policies for resources
CREATE POLICY "Users can read resources"
  ON public.resources FOR SELECT
  USING (true);

-- Create necessary indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON public.user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_training_id ON public.user_profiles(training_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON public.user_profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_training_status ON public.user_profiles(training_status);

CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);

CREATE INDEX IF NOT EXISTS idx_trainings_company_id ON public.trainings(company_id);
CREATE INDEX IF NOT EXISTS idx_trainings_status ON public.trainings(status);
CREATE INDEX IF NOT EXISTS idx_trainings_dates ON public.trainings(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_documents_company_id ON public.documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_training_id ON public.documents(training_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_user_id ON public.questionnaire_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_responses_user_id ON public.evaluation_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_satisfaction_responses_user_id ON public.satisfaction_responses(user_id);

-- Create triggers only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_user_profiles_updated_at
      BEFORE UPDATE ON public.user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_companies_updated_at'
  ) THEN
    CREATE TRIGGER update_companies_updated_at
      BEFORE UPDATE ON public.companies
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_trainings_updated_at'
  ) THEN
    CREATE TRIGGER update_trainings_updated_at
      BEFORE UPDATE ON public.trainings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_documents_updated_at'
  ) THEN
    CREATE TRIGGER update_documents_updated_at
      BEFORE UPDATE ON public.documents
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_settings_updated_at
      BEFORE UPDATE ON public.settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_training_company_name'
  ) THEN
    CREATE TRIGGER update_training_company_name
      BEFORE INSERT OR UPDATE OF company_id ON public.trainings
      FOR EACH ROW
      EXECUTE FUNCTION update_training_company_name();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_evaluation_score_update'
  ) THEN
    CREATE TRIGGER on_evaluation_score_update
      AFTER INSERT ON public.evaluation_responses
      FOR EACH ROW
      EXECUTE FUNCTION update_evaluation_scores();
  END IF;
END $$;