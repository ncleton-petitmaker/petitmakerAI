const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration du client Supabase
const supabaseUrl = 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';

// Création du client avec les droits d'administration
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Exécute une requête SQL
 */
async function executeSQL(query) {
  try {
    // Essayer d'abord avec la fonction query_db
    const { data, error } = await supabase.rpc('query_db', { sql_query: query });
    
    if (error) {
      console.error('Erreur lors de l\'exécution de la requête SQL via query_db:', error);
      
      // Si la fonction query_db n'existe pas, essayer d'exécuter directement la requête
      // Note: Cela ne fonctionnera que pour certaines requêtes simples
      if (query.trim().toLowerCase().startsWith('select')) {
        const { data: directData, error: directError } = await supabase
          .from('_temp_query')
          .select('*')
          .limit(1000);
          
        if (directError) {
          console.error('Erreur lors de l\'exécution directe de la requête SQL:', directError);
          return null;
        }
        
        return directData;
      }
      
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la requête SQL:', error);
    return null;
  }
}

/**
 * Exécute la migration SQL
 */
async function runMigration() {
  try {
    console.log('Exécution de la migration SQL...');
    
    // Lire le fichier de migration
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '00001_initial_setup.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Exécuter la migration
    const result = await executeSQL(migrationSQL);
    
    if (result === null) {
      console.error('Erreur lors de l\'exécution de la migration.');
      return;
    }
    
    console.log('Migration exécutée avec succès.');
    
    // Vérifier si la table training_participants existe
    console.log('Vérification de la table training_participants...');
    
    const tablesQuery = `
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
    `;
    
    const tables = await executeSQL(tablesQuery);
    
    if (!tables) {
      console.error('Erreur lors de la récupération des tables.');
      return;
    }
    
    console.log('Tables disponibles:', tables);
    
    const hasTrainingParticipants = tables.some(table => table.tablename === 'training_participants');
    const hasUserProfiles = tables.some(table => table.tablename === 'user_profiles');
    
    if (hasTrainingParticipants) {
      console.warn('ALERTE: La table training_participants existe et doit être remplacée par user_profiles');
      
      // Vérifier la structure de la table training_participants
      const trainingParticipantsQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'training_participants'
      `;
      
      const trainingParticipantsColumns = await executeSQL(trainingParticipantsQuery);
      
      if (trainingParticipantsColumns) {
        console.log('Structure de la table training_participants:');
        console.table(trainingParticipantsColumns);
      }
      
      // Vérifier la structure de la table user_profiles si elle existe
      if (hasUserProfiles) {
        const userProfilesQuery = `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'user_profiles'
        `;
        
        const userProfilesColumns = await executeSQL(userProfilesQuery);
        
        if (userProfilesColumns) {
          console.log('Structure de la table user_profiles:');
          console.table(userProfilesColumns);
        }
      } else {
        console.warn('La table user_profiles n\'existe pas. Elle devrait être créée pour remplacer training_participants.');
      }
    } else {
      console.log('La table training_participants n\'existe pas, ce qui est correct.');
    }
    
    // Vérifier les politiques de sécurité
    console.log('Vérification des politiques de sécurité...');
    
    const policiesQuery = `
      SELECT tablename, policyname, cmd, roles, qual
      FROM pg_policies
      ORDER BY tablename
    `;
    
    const policies = await executeSQL(policiesQuery);
    
    if (policies) {
      console.log('Politiques de sécurité:');
      console.table(policies);
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la migration:', error);
  }
}

// Exécuter la fonction
runMigration().then(() => {
  console.log('Terminé.');
  process.exit(0);
}).catch(error => {
  console.error('Erreur:', error);
  process.exit(1);
}); 