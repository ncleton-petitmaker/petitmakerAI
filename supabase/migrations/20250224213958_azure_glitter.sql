/*
  # Add evaluation responses table

  1. New Tables
    - `evaluation_responses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `type` (text) - 'initial' or 'final'
      - `responses` (jsonb)
      - `created_at` (timestamptz)

  2. Changes
    - Add `initial_evaluation_completed` and `final_evaluation_completed` columns to user_profiles
    
  3. Security
    - Enable RLS on evaluation_responses
    - Add policies for authenticated users
*/

-- Create evaluation_responses table
CREATE TABLE IF NOT EXISTS evaluation_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text CHECK (type IN ('initial', 'final')),
  responses jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add evaluation completion columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS initial_evaluation_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS final_evaluation_completed boolean DEFAULT false;

-- Enable RLS
ALTER TABLE evaluation_responses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own responses"
  ON evaluation_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own responses"
  ON evaluation_responses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_evaluation_responses_user_id 
ON evaluation_responses(user_id);

-- Add trigger to update user profile when evaluation response is submitted
CREATE OR REPLACE FUNCTION handle_evaluation_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'initial' THEN
    UPDATE user_profiles
    SET initial_evaluation_completed = true
    WHERE id = NEW.user_id;
  ELSIF NEW.type = 'final' THEN
    UPDATE user_profiles
    SET final_evaluation_completed = true
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_evaluation_response_submitted
  AFTER INSERT ON evaluation_responses
  FOR EACH ROW
  EXECUTE FUNCTION handle_evaluation_response();