-- Ajouter les colonnes pour la signature de la convention de formation
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS has_signed_agreement BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS agreement_signature_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS agreement_signature_date TIMESTAMP WITH TIME ZONE;

-- Ajouter les colonnes pour la signature de la feuille d'émargement
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS has_signed_attendance BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS attendance_signature_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS attendance_signature_date TIMESTAMP WITH TIME ZONE; 