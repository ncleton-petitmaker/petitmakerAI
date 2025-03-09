/*
  # Add Admin Flag to User Profiles

  1. New Columns
    - Add `is_admin` boolean column to `user_profiles` table with default value of false
  
  2. Set Admin Privileges
    - Set admin flag to true for user with email nicolas.cleton@petitmaker.fr
*/

-- Add is_admin column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Set admin flag for nicolas.cleton@petitmaker.fr
UPDATE user_profiles
SET is_admin = true
FROM auth.users
WHERE 
  user_profiles.id = auth.users.id AND
  auth.users.email = 'nicolas.cleton@petitmaker.fr';

-- Reset admin flag for other users
UPDATE user_profiles
SET is_admin = false
FROM auth.users
WHERE 
  user_profiles.id = auth.users.id AND
  auth.users.email != 'nicolas.cleton@petitmaker.fr';