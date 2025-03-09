/*
  # Database Triggers Migration

  1. Changes
    - Add IF NOT EXISTS checks for all triggers
    - Create functions and triggers safely
    - Maintain all existing functionality
    
  2. Security
    - Preserve RLS policies
    - Keep all security constraints
*/

-- Create or replace functions
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

-- Safely create triggers with existence checks
DO $$ 
BEGIN
  -- user_profiles updated_at trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_user_profiles_updated_at
      BEFORE UPDATE ON public.user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- companies updated_at trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_companies_updated_at'
  ) THEN
    CREATE TRIGGER update_companies_updated_at
      BEFORE UPDATE ON public.companies
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- trainings updated_at trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_trainings_updated_at'
  ) THEN
    CREATE TRIGGER update_trainings_updated_at
      BEFORE UPDATE ON public.trainings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- documents updated_at trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_documents_updated_at'
  ) THEN
    CREATE TRIGGER update_documents_updated_at
      BEFORE UPDATE ON public.documents
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- settings updated_at trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_settings_updated_at
      BEFORE UPDATE ON public.settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- training company name trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_training_company_name'
  ) THEN
    CREATE TRIGGER update_training_company_name
      BEFORE INSERT OR UPDATE OF company_id ON public.trainings
      FOR EACH ROW
      EXECUTE FUNCTION update_training_company_name();
  END IF;

  -- evaluation score update trigger
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

-- Verify all triggers were created
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at'
  ), 'user_profiles trigger not created';
  
  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_companies_updated_at'
  ), 'companies trigger not created';
  
  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_trainings_updated_at'
  ), 'trainings trigger not created';
  
  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_documents_updated_at'
  ), 'documents trigger not created';
  
  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_settings_updated_at'
  ), 'settings trigger not created';
  
  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_training_company_name'
  ), 'training_company_name trigger not created';
  
  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_evaluation_score_update'
  ), 'evaluation_score trigger not created';
  
  RAISE NOTICE 'All triggers verified successfully';
END $$;