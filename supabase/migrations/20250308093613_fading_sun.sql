/*
  # Fix questionnaire tables and responses

  1. New Tables
    - `questionnaire_responses` - Stores all questionnaire responses
    - Adds completion tracking columns to user_profiles
  
  2. Security
    - Enable RLS
    - Add policies for data access
    
  3. Changes
    - Simplifies questionnaire storage
    - Adds proper response tracking
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop policies from questionnaire_responses if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'questionnaire_responses' 
    AND policyname = 'Users can manage their own responses'
  ) THEN
    DROP POLICY "Users can manage their own responses" ON questionnaire_responses;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'questionnaire_responses' 
    AND policyname = 'Admins can read all responses'
  ) THEN
    DROP POLICY "Admins can read all responses" ON questionnaire_responses;
  END IF;
END $$;

-- Create questionnaire_responses table if it doesn't exist
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('positioning', 'initial', 'final', 'satisfaction')),
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer CHECK (score >= 0 AND score <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns to user_profiles
DO $$ 
BEGIN
  -- Add questionnaire status columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'questionnaire_completed') THEN
    ALTER TABLE user_profiles ADD COLUMN questionnaire_completed BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'initial_evaluation_completed') THEN
    ALTER TABLE user_profiles ADD COLUMN initial_evaluation_completed BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'final_evaluation_completed') THEN
    ALTER TABLE user_profiles ADD COLUMN final_evaluation_completed BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'satisfaction_completed') THEN
    ALTER TABLE user_profiles ADD COLUMN satisfaction_completed BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add evaluation score columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'initial_evaluation_score') THEN
    ALTER TABLE user_profiles ADD COLUMN initial_evaluation_score INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'final_evaluation_score') THEN
    ALTER TABLE user_profiles ADD COLUMN final_evaluation_score INTEGER;
  END IF;

  -- Add score constraints
  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_initial_evaluation_score_check;
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_initial_evaluation_score_check 
    CHECK (initial_evaluation_score >= 0 AND initial_evaluation_score <= 100);

  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_final_evaluation_score_check;
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_final_evaluation_score_check 
    CHECK (final_evaluation_score >= 0 AND final_evaluation_score <= 100);
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_user_id ON questionnaire_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_type ON questionnaire_responses(type);

-- Enable RLS
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ 
BEGIN
  -- Create policies only if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'questionnaire_responses' 
    AND policyname = 'Users can manage their own responses'
  ) THEN
    CREATE POLICY "Users can manage their own responses" ON questionnaire_responses
      FOR ALL TO public
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'questionnaire_responses' 
    AND policyname = 'Admins can read all responses'
  ) THEN
    CREATE POLICY "Admins can read all responses" ON questionnaire_responses
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
      ));
  END IF;
END $$;