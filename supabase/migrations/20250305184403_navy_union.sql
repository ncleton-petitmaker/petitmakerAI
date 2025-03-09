/*
  # Fix Missing Data Migration
  
  1. New Tables
    - questionnaire_responses
    - evaluation_responses
    - satisfaction_responses
  
  2. Security
    - Enable RLS
    - Add appropriate policies
    - Maintain admin access
*/

-- Create questionnaire_responses table
CREATE TABLE IF NOT EXISTS public.questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Create evaluation_responses table
CREATE TABLE IF NOT EXISTS public.evaluation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('initial', 'final')),
  responses JSONB NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, type)
);

-- Create satisfaction_responses table
CREATE TABLE IF NOT EXISTS public.satisfaction_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for questionnaire_responses
CREATE POLICY "Users can read own questionnaire responses"
ON public.questionnaire_responses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can insert own questionnaire responses"
ON public.questionnaire_responses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own questionnaire responses"
ON public.questionnaire_responses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- Create policies for evaluation_responses
CREATE POLICY "Users can read own evaluation responses"
ON public.evaluation_responses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can insert own evaluation responses"
ON public.evaluation_responses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own evaluation responses"
ON public.evaluation_responses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- Create policies for satisfaction_responses
CREATE POLICY "Users can read own satisfaction responses"
ON public.satisfaction_responses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can insert own satisfaction responses"
ON public.satisfaction_responses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own satisfaction responses"
ON public.satisfaction_responses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- Create trigger functions for handling responses
CREATE OR REPLACE FUNCTION handle_questionnaire_response()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET questionnaire_completed = true,
      updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_evaluation_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'initial' THEN
    UPDATE public.user_profiles
    SET initial_evaluation_completed = true,
        initial_evaluation_score = NEW.score,
        updated_at = now()
    WHERE id = NEW.user_id;
  ELSIF NEW.type = 'final' THEN
    UPDATE public.user_profiles
    SET final_evaluation_completed = true,
        final_evaluation_score = NEW.score,
        updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_satisfaction_response()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET satisfaction_completed = true,
      updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS on_questionnaire_response_submitted ON public.questionnaire_responses;
CREATE TRIGGER on_questionnaire_response_submitted
  AFTER INSERT ON public.questionnaire_responses
  FOR EACH ROW
  EXECUTE FUNCTION handle_questionnaire_response();

DROP TRIGGER IF EXISTS on_evaluation_response_submitted ON public.evaluation_responses;
CREATE TRIGGER on_evaluation_response_submitted
  AFTER INSERT ON public.evaluation_responses
  FOR EACH ROW
  EXECUTE FUNCTION handle_evaluation_response();

DROP TRIGGER IF EXISTS on_satisfaction_response_submitted ON public.satisfaction_responses;
CREATE TRIGGER on_satisfaction_response_submitted
  AFTER INSERT ON public.satisfaction_responses
  FOR EACH ROW
  EXECUTE FUNCTION handle_satisfaction_response();

-- Add columns to user_profiles if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'questionnaire_completed') THEN
    ALTER TABLE public.user_profiles ADD COLUMN questionnaire_completed BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'initial_evaluation_completed') THEN
    ALTER TABLE public.user_profiles ADD COLUMN initial_evaluation_completed BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'final_evaluation_completed') THEN
    ALTER TABLE public.user_profiles ADD COLUMN final_evaluation_completed BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'satisfaction_completed') THEN
    ALTER TABLE public.user_profiles ADD COLUMN satisfaction_completed BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'initial_evaluation_score') THEN
    ALTER TABLE public.user_profiles ADD COLUMN initial_evaluation_score INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'final_evaluation_score') THEN
    ALTER TABLE public.user_profiles ADD COLUMN final_evaluation_score INTEGER;
  END IF;
END $$;