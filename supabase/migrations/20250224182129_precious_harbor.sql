/*
  # Correction de l'authentification et de la création de profil

  1. Modifications
    - Ajout d'une politique pour permettre l'insertion de profils par les utilisateurs authentifiés
    - Modification de la fonction handle_new_user pour mieux gérer les données utilisateur
    - Ajout d'une politique pour la lecture des profils

  2. Sécurité
    - Maintien de la RLS
    - Vérification de l'identité de l'utilisateur pour les opérations CRUD
*/

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Créer les nouvelles politiques
CREATE POLICY "Lecture du profil"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Mise à jour du profil"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Création du profil"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Mettre à jour la fonction de création de profil
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    full_name,
    company,
    created_at,
    updated_at,
    questionnaire_completed
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    '',
    NOW(),
    NOW(),
    false
  );
  RETURN NEW;
END;
$$ language 'plpgsql';