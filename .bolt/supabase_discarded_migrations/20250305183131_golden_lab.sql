/*
  # Add training participants table

  1. New Tables
    - `training_participants`
      - `id` (uuid, primary key)
      - `training_id` (uuid, foreign key to trainings)
      - `participant_id` (uuid, foreign key to users)
      - `status` (text)
      - `has_signed_certificate` (boolean)
      - `signature_url` (text)
      - `signature_date` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `training_participants` table
    - Add policies for authenticated users to read their own records
    - Add policies for admin users to manage all records
*/

-- Create training_participants table
CREATE TABLE IF NOT EXISTS public.training_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID REFERENCES public.trainings(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'cancelled', 'completed')),
  has_signed_certificate BOOLEAN DEFAULT false,
  signature_url TEXT,
  signature_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(training_id, participant_id)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_training_participants_training_id ON public.training_participants(training_id);
CREATE INDEX IF NOT EXISTS idx_training_participants_participant_id ON public.training_participants(participant_id);

-- Enable RLS
ALTER TABLE public.training_participants ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own training participations"
  ON public.training_participants
  FOR SELECT
  TO authenticated
  USING (participant_id = auth.uid());

CREATE POLICY "Users can update their own training participations"
  ON public.training_participants
  FOR UPDATE
  TO authenticated
  USING (participant_id = auth.uid())
  WITH CHECK (participant_id = auth.uid());

CREATE POLICY "Admin users can manage all training participations"
  ON public.training_participants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_training_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_training_participants_updated_at
  BEFORE UPDATE ON public.training_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_training_participants_updated_at();

-- Add comment
COMMENT ON TABLE public.training_participants IS 'Stores training participation records and signature status';