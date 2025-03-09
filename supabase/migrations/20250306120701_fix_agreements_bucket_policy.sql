/*
  # Fix Agreements Bucket Policy
  
  1. Changes
    - Add policy to allow authenticated users to upload to agreements bucket
    - Create agreements bucket if it doesn't exist
    
  2. Security
    - Maintain proper access control
    - Allow users to store signed agreements
*/

-- Create agreements bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM storage.buckets WHERE id = 'agreements') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'agreements',
      'agreements',
      true,
      52428800, -- 50MB
      ARRAY['application/pdf']::text[]
    );
  END IF;
END $$;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can upload to agreements" ON storage.objects;

-- Create policy to allow authenticated users to upload to agreements bucket
CREATE POLICY "Users can upload to agreements"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'agreements');

-- Create policy to allow anyone to view agreements
CREATE POLICY "Anyone can view agreements"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'agreements');

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE 'Added policies to allow users to upload agreements';
END $$; 