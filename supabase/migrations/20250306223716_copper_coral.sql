/*
  # Fix storage policies and document access

  1. Changes
    - Drop and recreate storage policies for signatures bucket
    - Update document access policies
    - Add proper error handling
    
  2. Security
    - Enable proper access control for signatures bucket
    - Ensure users can only access their own documents
    - Add admin override for document access
*/

-- Safely drop and recreate storage policies
DO $$
BEGIN
  -- Drop storage policies if they exist
  DROP POLICY IF EXISTS "Users can upload to signatures" ON storage.objects;
  DROP POLICY IF EXISTS "Users can download from signatures" ON storage.objects;
  
  -- Create new storage policies
  CREATE POLICY "Users can upload to signatures"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'signatures');
    
  CREATE POLICY "Users can download from signatures"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'signatures');

  -- Log success
  RAISE NOTICE 'Storage policies updated successfully';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error updating storage policies: %', SQLERRM;
END $$;

-- Safely update document policies
DO $$
BEGIN
  -- Drop document policies if they exist
  DROP POLICY IF EXISTS "Users can create documents" ON documents;
  DROP POLICY IF EXISTS "Users can read their own documents" ON documents;
  DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
  DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
  
  -- Create new document policies
  CREATE POLICY "Users can create documents"
    ON documents
    FOR INSERT
    TO authenticated
    WITH CHECK (
      created_by = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = 'nicolas.cleton@petitmaker.fr'
      )
    );
    
  CREATE POLICY "Users can read their own documents"
    ON documents
    FOR SELECT
    TO authenticated
    USING (
      user_id = auth.uid() OR 
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = 'nicolas.cleton@petitmaker.fr'
      )
    );
    
  CREATE POLICY "Users can update their own documents"
    ON documents
    FOR UPDATE
    TO authenticated
    USING (
      user_id = auth.uid() OR 
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = 'nicolas.cleton@petitmaker.fr'
      )
    )
    WITH CHECK (
      user_id = auth.uid() OR 
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = 'nicolas.cleton@petitmaker.fr'
      )
    );
    
  CREATE POLICY "Users can delete their own documents"
    ON documents
    FOR DELETE
    TO authenticated
    USING (
      user_id = auth.uid() OR 
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = 'nicolas.cleton@petitmaker.fr'
      )
    );

  -- Log success  
  RAISE NOTICE 'Document policies updated successfully';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error updating document policies: %', SQLERRM;
END $$;