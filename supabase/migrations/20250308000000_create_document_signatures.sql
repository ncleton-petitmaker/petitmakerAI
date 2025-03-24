-- Création de la table document_signatures
CREATE TABLE IF NOT EXISTS document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  signature_type TEXT NOT NULL,
  signature_url TEXT NOT NULL,
  path TEXT,
  shared_from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Création des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_document_signatures_training_id ON document_signatures(training_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_user_id ON document_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_company_id ON document_signatures(company_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_signature_type ON document_signatures(signature_type);
CREATE INDEX IF NOT EXISTS idx_document_signatures_document_type ON document_signatures(document_type);

-- Activer la protection RLS (Row Level Security)
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;

-- Ajouter des politiques RLS pour document_signatures

-- Politique pour permettre aux utilisateurs de lire leurs propres signatures
CREATE POLICY "Users can read their own signatures"
  ON document_signatures
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de lire les signatures de leur entreprise
CREATE POLICY "Users can read signatures from their company"
  ON document_signatures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND company_id = document_signatures.company_id
    )
  );

-- Politique pour permettre aux utilisateurs de lire les signatures des formations où ils sont inscrits
CREATE POLICY "Users can read signatures from trainings they attend"
  ON document_signatures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM training_participants
      WHERE participant_id = auth.uid() AND training_id = document_signatures.training_id
    )
  );

-- Politique pour permettre aux formateurs de lire les signatures des formations qu'ils animent
CREATE POLICY "Trainers can read signatures from trainings they lead"
  ON document_signatures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainings
      WHERE trainer_id = auth.uid() AND id = document_signatures.training_id
    )
  );

-- Politique pour permettre aux utilisateurs d'ajouter leurs propres signatures
CREATE POLICY "Users can insert their own signatures"
  ON document_signatures
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux formateurs d'ajouter des signatures pour leurs formations
CREATE POLICY "Trainers can insert signatures for their trainings"
  ON document_signatures
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainings
      WHERE trainer_id = auth.uid() AND id = document_signatures.training_id
    )
  );

-- Politique pour permettre aux administrateurs de gérer toutes les signatures
CREATE POLICY "Admins can manage all signatures"
  ON document_signatures
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  ); 