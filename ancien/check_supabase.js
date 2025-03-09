// Script pour vérifier la connexion à Supabase et l'état des tables
// Exécuter avec: node check_supabase.js

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const SUPABASE_URL = 'https://efgirjtbuzljtzpuwsue.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMjU0MDQsImV4cCI6MjA1NTgwMTQwNH0.aY8wI1r5RW78L0yjYX5wNBD6bY0Ybqbm6JdiUeejVR4';

// Créer le client Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fonction principale
async function main() {
  console.log('Vérification de la connexion à Supabase...');
  
  try {
    // Test simple de connexion
    const { data, error } = await supabase.from('_test').select('*').limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log('✅ Connexion à Supabase établie (table _test inexistante, mais c\'est normal)');
      } else {
        console.error('❌ Erreur de connexion:', error.message);
        return;
      }
    } else {
      console.log('✅ Connexion à Supabase établie');
    }
    
    // Vérifier les tables existantes
    await checkTable('user_profiles');
    await checkTable('companies');
    await checkTable('trainings');
    await checkTable('training_participants');
    
    console.log('\nRésumé des vérifications:');
    console.log('------------------------');
    console.log('Pour créer les tables manquantes, exécutez:');
    console.log('bash create_tables_individually.sh');
    
  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
  }
}

// Vérifier si une table existe
async function checkTable(tableName) {
  try {
    const { data, error } = await supabase.from(tableName).select('count').limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log(`❌ Table '${tableName}' n'existe pas`);
        return false;
      } else {
        console.error(`❌ Erreur lors de la vérification de la table '${tableName}':`, error.message);
        return false;
      }
    }
    
    console.log(`✅ Table '${tableName}' existe`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification de la table '${tableName}':`, error.message);
    return false;
  }
}

// Exécuter la fonction principale
main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
}); 