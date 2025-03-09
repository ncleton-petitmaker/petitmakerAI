-- Script pour configurer les politiques RLS pour la table trainings
-- Ce script active RLS et configure les politiques appropriées

-- Activer RLS sur la table trainings
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir les formations auxquelles ils sont inscrits" ON trainings;
DROP POLICY IF EXISTS "Les administrateurs peuvent modifier les formations" ON trainings;
DROP POLICY IF EXISTS "Les administrateurs peuvent supprimer les formations" ON trainings;
DROP POLICY IF EXISTS "Les administrateurs peuvent ajouter des formations" ON trainings;
DROP POLICY IF EXISTS "Administrateurs peuvent voir toutes les formations" ON trainings;
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs formations" ON trainings;
DROP POLICY IF EXISTS "Administrateurs peuvent modifier les formations" ON trainings;
DROP POLICY IF EXISTS "Administrateurs peuvent supprimer des formations" ON trainings;
DROP POLICY IF EXISTS "Administrateurs peuvent ajouter des formations" ON trainings;

-- Politique pour la lecture (SELECT) - Tout le monde peut voir les formations
CREATE POLICY "Tout le monde peut voir les formations" 
ON trainings FOR SELECT 
USING (true);

-- Politique pour la modification (UPDATE) - Seuls les administrateurs peuvent modifier les formations
CREATE POLICY "Les administrateurs peuvent modifier les formations" 
ON trainings FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE is_admin = true
  )
);

-- Politique pour la suppression (DELETE) - Seuls les administrateurs peuvent supprimer des formations
CREATE POLICY "Les administrateurs peuvent supprimer les formations" 
ON trainings FOR DELETE 
USING (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE is_admin = true
  )
);

-- Politique pour l'insertion (INSERT) - Seuls les administrateurs peuvent ajouter des formations
CREATE POLICY "Les administrateurs peuvent ajouter des formations" 
ON trainings FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE is_admin = true
  )
);

-- Fin du script 