/*
  # Add questionnaire tables

  1. New Tables
    - `questionnaire_responses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `responses` (jsonb)
      - `created_at` (timestamptz)

  2. Changes
    - Add `questionnaire_completed` column to `user_profiles` table

  3. Security
    - Enable RLS on `questionnaire_responses` table
    - Add policies for authenticated users
*/

-- Create questionnaire_responses table
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  responses jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add questionnaire_completed column to user_profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'questionnaire_completed'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN questionnaire_completed boolean DEFAULT false;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own responses"
  ON questionnaire_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own responses"
  ON questionnaire_responses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);