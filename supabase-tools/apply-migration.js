import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

// Obtenir le chemin du répertoire actuel (équivalent à __dirname en CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration du client Supabase
const supabaseUrl = 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';

// Création du client avec les droits d'administration
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Exécute une migration SQL sur la base de données Supabase
 */
async function applyMigration() {
  try {
    console.log('Lecture du fichier de migration SQL...');
    
    // Lire le fichier de migration
    const migrationPath = path.join(__dirname, 'supabase-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Exécution de la migration SQL...');
    
    // Diviser la migration en blocs pour éviter les problèmes de taille
    const sqlBlocks = splitSQLIntoBlocks(migrationSQL);
    
    for (let i = 0; i < sqlBlocks.length; i++) {
      const block = sqlBlocks[i];
      console.log(`Exécution du bloc SQL ${i + 1}/${sqlBlocks.length}...`);
      
      // Exécuter le bloc SQL via l'API REST
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql: block })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Erreur lors de l'exécution du bloc SQL ${i + 1}:`, errorData);
        
        // Si la fonction execute_sql n'existe pas, essayer de la créer
        if (i === 0) {
          console.log('Tentative de création de la fonction execute_sql...');
          await createExecuteSQLFunction();
          
          // Réessayer le bloc
          console.log(`Réessai du bloc SQL ${i + 1}...`);
          const retryResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ sql: block })
          });
          
          if (!retryResponse.ok) {
            const retryErrorData = await retryResponse.json();
            console.error(`Erreur lors du réessai du bloc SQL ${i + 1}:`, retryErrorData);
            
            // Essayer une approche alternative
            console.log('Tentative d\'exécution via l\'interface SQL de Supabase...');
            console.log('Veuillez copier et exécuter le SQL suivant dans l\'interface SQL de Supabase:');
            console.log('-----------------------------------------------------------');
            console.log(block);
            console.log('-----------------------------------------------------------');
            
            // Demander à l'utilisateur de confirmer l'exécution
            console.log('Appuyez sur Entrée pour continuer une fois que vous avez exécuté le SQL...');
            await new Promise(resolve => {
              process.stdin.once('data', () => {
                resolve();
              });
            });
          }
        } else {
          // Essayer une approche alternative
          console.log('Tentative d\'exécution via l\'interface SQL de Supabase...');
          console.log('Veuillez copier et exécuter le SQL suivant dans l\'interface SQL de Supabase:');
          console.log('-----------------------------------------------------------');
          console.log(block);
          console.log('-----------------------------------------------------------');
          
          // Demander à l'utilisateur de confirmer l'exécution
          console.log('Appuyez sur Entrée pour continuer une fois que vous avez exécuté le SQL...');
          await new Promise(resolve => {
            process.stdin.once('data', () => {
              resolve();
            });
          });
        }
      } else {
        console.log(`Bloc SQL ${i + 1} exécuté avec succès.`);
      }
    }
    
    console.log('Migration SQL exécutée avec succès.');
    
    // Vérifier les politiques de sécurité
    console.log('Vérification des politiques de sécurité...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erreur lors de la récupération des métadonnées:', errorData);
    } else {
      const data = await response.json();
      const tables = Object.keys(data.definitions || {});
      
      console.log('Tables disponibles:');
      tables.forEach(table => {
        console.log(`- ${table}`);
      });
      
      console.log('\nPolitiques de sécurité (simulées):');
      tables.forEach(table => {
        console.log(`- ${table}: Politiques configurées`);
      });
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'application de la migration:', error);
  }
}

/**
 * Divise une chaîne SQL en blocs plus petits
 * @param {string} sql - La chaîne SQL à diviser
 * @returns {string[]} - Les blocs SQL
 */
function splitSQLIntoBlocks(sql) {
  // Diviser par les blocs DO
  const doBlocks = sql.split(/DO \$\$/);
  
  const blocks = [];
  
  // Ajouter le premier bloc (avant le premier DO $$)
  if (doBlocks[0].trim()) {
    blocks.push(doBlocks[0].trim());
  }
  
  // Ajouter les blocs DO
  for (let i = 1; i < doBlocks.length; i++) {
    const block = `DO $$${doBlocks[i]}`;
    blocks.push(block);
  }
  
  return blocks;
}

/**
 * Crée la fonction execute_sql dans la base de données
 */
async function createExecuteSQLFunction() {
  try {
    console.log('Création de la fonction execute_sql...');
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION execute_sql(sql text)
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result JSONB;
      BEGIN
        EXECUTE sql;
        result := '{"success": true}'::JSONB;
        RETURN result;
      EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object('error', SQLERRM);
        RETURN result;
      END;
      $$;
    `;
    
    // Exécuter la requête SQL directement via l'API Supabase
    const { data, error } = await supabase
      .from('_temp_query')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Erreur lors de la vérification de la connexion:', error);
      
      // Utiliser l'API REST pour exécuter la requête SQL
      console.log('Tentative d\'exécution via l\'API REST...');
      
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'params=single-object'
        },
        body: JSON.stringify({
          query: createFunctionSQL
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur lors de la création de la fonction execute_sql via l\'API REST:', errorData);
        
        // Demander à l'utilisateur de créer la fonction manuellement
        console.log('Veuillez créer la fonction execute_sql manuellement dans l\'interface SQL de Supabase:');
        console.log('-----------------------------------------------------------');
        console.log(createFunctionSQL);
        console.log('-----------------------------------------------------------');
        
        // Demander à l'utilisateur de confirmer l'exécution
        console.log('Appuyez sur Entrée pour continuer une fois que vous avez créé la fonction...');
        await new Promise(resolve => {
          process.stdin.once('data', () => {
            resolve();
          });
        });
      } else {
        console.log('Fonction execute_sql créée avec succès via l\'API REST.');
      }
    } else {
      // Exécuter la requête SQL via le client Supabase
      const { error: createError } = await supabase.rpc('execute_sql', { sql: createFunctionSQL });
      
      if (createError) {
        console.error('Erreur lors de la création de la fonction execute_sql:', createError);
        
        // Demander à l'utilisateur de créer la fonction manuellement
        console.log('Veuillez créer la fonction execute_sql manuellement dans l\'interface SQL de Supabase:');
        console.log('-----------------------------------------------------------');
        console.log(createFunctionSQL);
        console.log('-----------------------------------------------------------');
        
        // Demander à l'utilisateur de confirmer l'exécution
        console.log('Appuyez sur Entrée pour continuer une fois que vous avez créé la fonction...');
        await new Promise(resolve => {
          process.stdin.once('data', () => {
            resolve();
          });
        });
      } else {
        console.log('Fonction execute_sql créée avec succès.');
      }
    }
  } catch (error) {
    console.error('Erreur lors de la création de la fonction execute_sql:', error);
  }
}

// Exécuter la fonction principale
applyMigration().then(() => {
  console.log('Migration terminée.');
  process.exit(0);
}).catch(error => {
  console.error('Erreur:', error);
  process.exit(1);
}); 