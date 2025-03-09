/*
  # Fix Attendance Sheets and Completion Certificates Buckets Policy
  
  1. Changes
    - Create attendance-sheets and completion-certificates buckets if they don't exist
    - Add policies to allow authenticated users to upload to these buckets
    
  2. Security
    - Maintain proper access control
    - Allow users to store signed documents
*/

-- Create attendance-sheets bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM storage.buckets WHERE id = 'attendance-sheets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'attendance-sheets',
      'attendance-sheets',
      true,
      52428800, -- 50MB
      ARRAY['application/pdf']::text[]
    );
  END IF;
END $$;

-- Create completion-certificates bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM storage.buckets WHERE id = 'completion-certificates') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'completion-certificates',
      'completion-certificates',
      true,
      52428800, -- 50MB
      ARRAY['application/pdf']::text[]
    );
  END IF;
END $$;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can upload to attendance-sheets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to completion-certificates" ON storage.objects;

-- Create policy to allow authenticated users to upload to attendance-sheets bucket
CREATE POLICY "Users can upload to attendance-sheets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attendance-sheets');

-- Create policy to allow anyone to view attendance-sheets
CREATE POLICY "Anyone can view attendance-sheets"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'attendance-sheets');

-- Create policy to allow authenticated users to upload to completion-certificates bucket
CREATE POLICY "Users can upload to completion-certificates"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'completion-certificates');

-- Create policy to allow anyone to view completion-certificates
CREATE POLICY "Anyone can view completion-certificates"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'completion-certificates');

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE 'Added policies to allow users to upload attendance sheets and completion certificates';
END $$;
