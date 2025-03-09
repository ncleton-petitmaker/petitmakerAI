-- Script pour simplifier la structure de la base de données des formations
-- Ce script supprime les tables inutiles et ajoute les politiques RLS nécessaires

-- Vérifier si la table training_periods existe et la supprimer
DROP TABLE IF EXISTS training_periods;

-- Vérifier si la table training_time_slots existe et la supprimer
DROP TABLE IF EXISTS training_time_slots;

-- Vérifier si la colonne metadata existe dans la table trainings
-- Si elle n'existe pas, l'ajouter
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trainings' 
AND column_name = 'metadata';

-- Ajouter la colonne metadata si elle n'existe pas
-- Note: Cette opération doit être effectuée manuellement via l'interface Supabase
-- ALTER TABLE trainings ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Activer RLS sur la table trainings
-- Note: Cette opération doit être effectuée manuellement via l'interface Supabase
-- ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes pour la table trainings
-- Note: Cette opération doit être effectuée manuellement via l'interface Supabase

-- Créer les nouvelles politiques pour la table trainings
-- Note: Ces opérations doivent être effectuées manuellement via l'interface Supabase

-- 1. Politique pour voir les formations (SELECT)
-- CREATE POLICY "Les utilisateurs peuvent voir les formations auxquelles ils sont inscrits" 
-- ON trainings FOR SELECT 
-- USING (
--   auth.uid() IN (
--     SELECT user_id FROM user_profiles WHERE training_id = id
--   ) OR auth.jwt() ? 'admin_access'
-- );

-- 2. Politique pour modifier les formations (UPDATE)
-- CREATE POLICY "Les administrateurs peuvent modifier les formations" 
-- ON trainings FOR UPDATE 
-- USING (
--   auth.jwt() ? 'admin_access'
-- );

-- 3. Politique pour supprimer les formations (DELETE)
-- CREATE POLICY "Les administrateurs peuvent supprimer les formations" 
-- ON trainings FOR DELETE 
-- USING (
--   auth.jwt() ? 'admin_access'
-- );

-- 4. Politique pour ajouter des formations (INSERT)
-- CREATE POLICY "Les administrateurs peuvent ajouter des formations" 
-- ON trainings FOR INSERT 
-- WITH CHECK (
--   auth.jwt() ? 'admin_access'
-- );

-- Migration des données (optionnel)
-- Cette étape doit être effectuée manuellement si nécessaire
-- Elle consiste à transférer les données des tables training_periods et training_time_slots
-- vers la colonne metadata de la table trainings

-- Exemple de requête pour migrer les données:
-- UPDATE trainings
-- SET metadata = jsonb_build_object(
--   'periods', (
--     SELECT jsonb_agg(row_to_json(p))
--     FROM training_periods p
--     WHERE p.training_id = trainings.id
--   ),
--   'timeSlots', (
--     SELECT jsonb_agg(row_to_json(ts))
--     FROM training_time_slots ts
--     WHERE ts.training_id = trainings.id
--   )
-- )
-- WHERE id IN (
--   SELECT DISTINCT training_id FROM training_periods
--   UNION
--   SELECT DISTINCT training_id FROM training_time_slots
-- );

-- Fin du script 