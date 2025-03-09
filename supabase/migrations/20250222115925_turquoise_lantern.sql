/*
  # Configure storage security
  
  1. Security Setup
    - Enable RLS on storage.objects table
    - Add policy for public read access to the public bucket
    
  2. Changes
    - Skip bucket creation as it already exists
    - Focus on security configuration only
*/

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public Access'
  ) THEN
    CREATE POLICY "Public Access"
    ON storage.objects FOR SELECT
    TO public
    USING ( bucket_id = 'public' );
  END IF;
END $$;