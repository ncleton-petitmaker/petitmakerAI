/*
  # Création des tables pour le CRM

  1. Nouvelles Tables
    - `companies` - Entreprises clientes
      - `id` (uuid, primary key)
      - `name` (text, non null)
      - `industry` (text)
      - `size` (text)
      - `address` (text)
      - `city` (text)
      - `postal_code` (text)
      - `country` (text)
      - `phone` (text)
      - `website` (text)
      - `status` (text, check constraint)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `documents` - Documents générés
      - `id` (uuid, primary key)
      - `title` (text, non null)
      - `type` (text, non null)
      - `company_id` (uuid, foreign key)
      - `file_url` (text)
      - `created_by` (uuid, foreign key)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `trainings` - Formations
      - `id` (uuid, primary key)
      - `title` (text, non null)
      - `company_id` (uuid, foreign key)
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `duration` (text)
      - `location` (text)
      - `price` (numeric)
      - `status` (text, check constraint)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `training_participants` - Participants aux formations
      - `id` (uuid, primary key)
      - `training_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for admin access
    - Add policies for user access
*/

-- Création de la table companies si elle n'existe pas déjà
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  size text,
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'France',
  phone text,
  website text,
  status text CHECK (status IN ('active', 'inactive', 'lead')) DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Création de la table documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('convention', 'attestation', 'devis', 'facture', 'programme', 'autre')),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  file_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Création de la table trainings
CREATE TABLE IF NOT EXISTS trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  start_date timestamptz,
  end_date timestamptz,
  duration text,
  location text,
  price numeric,
  status text CHECK (status IN ('new', 'confirmed', 'in_progress', 'completed', 'cancelled')) DEFAULT 'new',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Création de la table training_participants
CREATE TABLE IF NOT EXISTS training_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid REFERENCES trainings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(training_id, user_id)
);

-- Activer RLS sur toutes les tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_participants ENABLE ROW LEVEL SECURITY;

-- Politiques pour companies
CREATE POLICY "Admin users can manage companies"
  ON companies
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  ));

CREATE POLICY "Users can view their own company"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND company_id IS NOT NULL
    )
  );

-- Politiques pour documents
CREATE POLICY "Admin users can manage documents"
  ON documents
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  ));

CREATE POLICY "Users can view documents for their company"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND company_id IS NOT NULL
    )
  );

-- Politiques pour trainings
CREATE POLICY "Admin users can manage trainings"
  ON trainings
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  ));

CREATE POLICY "Users can view trainings for their company"
  ON trainings
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND company_id IS NOT NULL
    )
  );

-- Politiques pour training_participants
CREATE POLICY "Admin users can manage training participants"
  ON training_participants
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  ));

CREATE POLICY "Users can view their own training participations"
  ON training_participants
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    training_id IN (
      SELECT t.id FROM trainings t
      JOIN user_profiles up ON t.company_id = up.company_id
      WHERE up.id = auth.uid()
    )
  );

-- Créer des triggers pour mettre à jour le champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_trainings_updated_at
  BEFORE UPDATE ON trainings
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_trainings_company_id ON trainings(company_id);
CREATE INDEX IF NOT EXISTS idx_trainings_status ON trainings(status);
CREATE INDEX IF NOT EXISTS idx_trainings_dates ON trainings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_training_participants_training_id ON training_participants(training_id);
CREATE INDEX IF NOT EXISTS idx_training_participants_user_id ON training_participants(user_id);