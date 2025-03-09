/*
  # Suppression de toutes les données de démo

  1. Nettoyage des données
    - Suppression de toutes les données fictives des tables
    - Préservation de la structure des tables
  
  2. Sécurité
    - Maintien des politiques RLS
    - Maintien des index pour les performances
*/

-- Suppression de toutes les données des tables principales
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE training_participants CASCADE;
TRUNCATE TABLE trainings CASCADE;
TRUNCATE TABLE documents CASCADE;
TRUNCATE TABLE companies CASCADE;

-- Réinitialisation des séquences si nécessaire
ALTER SEQUENCE IF EXISTS notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS training_participants_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS trainings_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS documents_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS companies_id_seq RESTART WITH 1;

-- Suppression des données utilisateur fictives
DELETE FROM user_profiles 
WHERE first_name IN ('Jean', 'Marie', 'Thomas', 'Sophie', 'Lucas')
   OR last_name IN ('Dupont', 'Lambert', 'Martin', 'Dubois', 'Petit');

-- Suppression des notifications fictives
DELETE FROM notifications 
WHERE message LIKE '%Tech Solutions%' 
   OR message LIKE '%Jean Dupont%'
   OR message LIKE '%Marie Lambert%';