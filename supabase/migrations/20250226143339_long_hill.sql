/*
  # Add score column to evaluation_responses

  1. Changes
    - Add score column to evaluation_responses table
    - Add constraint to ensure score is between 0 and 100
*/

-- Add score column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'evaluation_responses' 
    AND column_name = 'score'
  ) THEN
    ALTER TABLE evaluation_responses
    ADD COLUMN score integer CHECK (score >= 0 AND score <= 100);
  END IF;
END $$;