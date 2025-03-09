/*
  # Add satisfaction questionnaire table

  1. New Tables
    - `satisfaction_responses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `responses` (jsonb)
      - `created_at` (timestamptz)

  2. Changes
    - Add `satisfaction_completed` column to user_profiles
    
  3. Security
    - Enable RLS on satisfaction_responses
    - Add policies for authenticated users
*/

-- Create satisfaction_responses table
CREATE TABLE IF NOT EXISTS satisfaction_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  responses jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add satisfaction_completed column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS satisfaction_completed boolean DEFAULT false;

-- Enable RLS
ALTER TABLE satisfaction_responses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own responses"
  ON satisfaction_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own responses"
  ON satisfaction_responses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_satisfaction_responses_user_id 
ON satisfaction_responses(user_id);

-- Add trigger to update user profile when satisfaction response is submitted
CREATE OR REPLACE FUNCTION handle_satisfaction_response()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET satisfaction_completed = true
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_satisfaction_response_submitted
  AFTER INSERT ON satisfaction_responses
  FOR EACH ROW
  EXECUTE FUNCTION handle_satisfaction_response();