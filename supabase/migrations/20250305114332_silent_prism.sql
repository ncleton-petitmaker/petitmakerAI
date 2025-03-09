/*
  # Fix storage buckets and permissions

  1. New Buckets
    - 'Photos de profil' for user profile photos
    - 'Images' for general images
    - 'internal_rules' for internal rules documents
    - 'logos' for company logos
    - 'signatures' for signatures

  2. Security
    - Enable public read access for all buckets
    - Add policies for authenticated users to manage their own files
    - Add policies for admins to manage all files
*/

-- Function to create bucket if not exists
CREATE OR REPLACE FUNCTION create_bucket_if_not_exists(bucket_name text, is_public boolean)
RETURNS void AS $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    bucket_name,
    bucket_name,
    is_public,
    52428800, -- 50MB limit
    CASE 
      WHEN bucket_name = 'internal_rules' THEN ARRAY['application/pdf']::text[]
      ELSE ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']::text[]
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
END;
$$ LANGUAGE plpgsql;

-- Create buckets
SELECT create_bucket_if_not_exists('Photos de profil', true);
SELECT create_bucket_if_not_exists('Images', true);
SELECT create_bucket_if_not_exists('internal_rules', true);
SELECT create_bucket_if_not_exists('logos', true);
SELECT create_bucket_if_not_exists('signatures', true);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = user_id AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Profile photos policies
  DROP POLICY IF EXISTS "Users can upload their own profile photo" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;
  
  -- Images policies
  DROP POLICY IF EXISTS "Admin users can manage images" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
  
  -- Internal rules policies
  DROP POLICY IF EXISTS "Admin users can manage internal rules" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view internal rules" ON storage.objects;
  
  -- Logos policies
  DROP POLICY IF EXISTS "Admin users can manage logos" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
  
  -- Signatures policies
  DROP POLICY IF EXISTS "Admin users can manage signatures" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view signatures" ON storage.objects;
END $$;

-- Create policies for profile photos bucket
CREATE POLICY "Users can upload their own profile photo"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'Photos de profil' 
  AND (auth.uid() = SPLIT_PART(name, '/', 1)::uuid OR is_admin(auth.uid()))
)
WITH CHECK (
  bucket_id = 'Photos de profil'
  AND (auth.uid() = SPLIT_PART(name, '/', 1)::uuid OR is_admin(auth.uid()))
);

CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Photos de profil');

-- Create policies for images bucket
CREATE POLICY "Admin users can manage images"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'Images' 
  AND is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'Images'
  AND is_admin(auth.uid())
);

CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Images');

-- Create policies for internal rules bucket
CREATE POLICY "Admin users can manage internal rules"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'internal_rules' 
  AND is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'internal_rules'
  AND is_admin(auth.uid())
);

CREATE POLICY "Anyone can view internal rules"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'internal_rules');

-- Create policies for logos bucket
CREATE POLICY "Admin users can manage logos"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'logos' 
  AND is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'logos'
  AND is_admin(auth.uid())
);

CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

-- Create policies for signatures bucket
CREATE POLICY "Admin users can manage signatures"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'signatures' 
  AND is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'signatures'
  AND is_admin(auth.uid())
);

CREATE POLICY "Anyone can view signatures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'signatures');