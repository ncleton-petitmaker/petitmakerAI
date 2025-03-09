/*
  # Add type column to questionnaire_responses table

  1. Changes
    - Add type column to questionnaire_responses table
    - Add check constraint for valid types
    - Add index on type column for better query performance
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add type column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'questionnaire_responses' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE questionnaire_responses 
    ADD COLUMN type text NOT NULL DEFAULT 'positioning';

    -- Add check constraint for valid types
    ALTER TABLE questionnaire_responses
    ADD CONSTRAINT questionnaire_responses_type_check
    CHECK (type IN ('positioning', 'initial', 'final'));

    -- Add index for better query performance
    CREATE INDEX idx_questionnaire_responses_type 
    ON questionnaire_responses(type);

    -- Update existing rows to have 'positioning' type
    UPDATE questionnaire_responses 
    SET type = 'positioning' 
    WHERE type IS NULL;
  END IF;
END $$;