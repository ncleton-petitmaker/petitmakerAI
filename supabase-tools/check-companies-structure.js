// Script pour vérifier et corriger la structure de la table companies dans Supabase
// Utilise les fonctions RPC pour vérifier et corriger la structure de la table

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config();

// Lire les variables d'environnement depuis le fichier .env
const envPath = path.resolve(__dirname, '../.env');
let supabaseUrl = '';
let supabaseKey = '';

try {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      if (line.startsWith('VITE_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim();
      } else if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        supabaseKey = line.split('=')[1].trim();
      }
    }
  }
  
  // Si les variables ne sont pas trouvées dans le fichier .env, essayer de les lire depuis les variables d'environnement
  if (!supabaseUrl) {
    supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  }
  if (!supabaseKey) {
    supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  }
  
  console.log('URL Supabase:', supabaseUrl ? 'Trouvée' : 'Non trouvée');
  console.log('Clé Supabase:', supabaseKey ? 'Trouvée' : 'Non trouvée');
} catch (error) {
  console.error('Erreur lors de la lecture du fichier .env:', error);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Erreur: Les variables d\'environnement pour Supabase (URL et clé) doivent être définies');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction pour vérifier la structure de la table companies
async function checkCompaniesTable() {
  console.log('=== VÉRIFICATION DE LA STRUCTURE DE LA TABLE COMPANIES ===');
  
  try {
    // Vérifier si la table companies existe en utilisant l'API Supabase
    const { data: tableData, error: tableError } = await supabase
      .from('companies')
      .select('count(*)', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('Erreur lors de la vérification de la table companies:', tableError);
      console.log('❌ La table companies n\'existe probablement pas');
      return false;
    }
    
    console.log('✅ La table companies existe');
    
    // Récupérer la structure de la table companies
    const { data: columnsData, error: columnsError } = await supabase.rpc('check_companies_structure');
    
    if (columnsError) {
      console.error('Erreur lors de la récupération de la structure de la table companies:', columnsError);
      console.log('⚠️ La fonction RPC check_companies_structure n\'existe pas, création en cours...');
      
      // Créer les fonctions RPC nécessaires
      await createExecSqlFunction();
      
      // Réessayer après la création des fonctions
      return await checkCompaniesTableBasic();
    }
    
    // Afficher les résultats
    console.log('Résultats de la vérification:');
    
    if (columnsData.table_exists) {
      // Vérifier les colonnes email et siret
      if (columnsData.email_exists) {
        console.log('✅ La colonne email existe');
        console.log('  Statistiques email:');
        console.log(`  - Total: ${columnsData.email_stats.total}`);
        console.log(`  - Non null: ${columnsData.email_stats.not_null}`);
        console.log(`  - Vides: ${columnsData.email_stats.empty}`);
        console.log(`  - Pourcentage rempli: ${((columnsData.email_stats.not_null - columnsData.email_stats.empty) / columnsData.email_stats.total * 100).toFixed(2)}%`);
      } else {
        console.log('❌ La colonne email n\'existe pas');
        return false;
      }
      
      if (columnsData.siret_exists) {
        console.log('✅ La colonne siret existe');
        console.log('  Statistiques siret:');
        console.log(`  - Total: ${columnsData.siret_stats.total}`);
        console.log(`  - Non null: ${columnsData.siret_stats.not_null}`);
        console.log(`  - Vides: ${columnsData.siret_stats.empty}`);
        console.log(`  - Pourcentage rempli: ${((columnsData.siret_stats.not_null - columnsData.siret_stats.empty) / columnsData.siret_stats.total * 100).toFixed(2)}%`);
      } else {
        console.log('❌ La colonne siret n\'existe pas');
        return false;
      }
      
      // Afficher la structure complète de la table
      console.log('\nStructure complète de la table companies:');
      console.table(columnsData.columns);
      
      return columnsData.email_exists && columnsData.siret_exists;
    } else {
      console.log('❌ La table companies n\'existe pas');
      return false;
    }
  } catch (err) {
    console.error('Exception lors de la vérification de la table companies:', err);
    return false;
  }
}

// Fonction pour vérifier la structure de la table companies de manière basique
async function checkCompaniesTableBasic() {
  console.log('=== VÉRIFICATION BASIQUE DE LA TABLE COMPANIES ===');
  
  try {
    // Vérifier si la table companies existe
    const { data: tableData, error: tableError } = await supabase
      .from('companies')
      .select('count(*)', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('Erreur lors de la vérification de la table companies:', tableError);
      console.log('❌ La table companies n\'existe probablement pas');
      return false;
    }
    
    console.log('✅ La table companies existe');
    
    // Récupérer un échantillon de données pour vérifier les colonnes
    const { data: sampleData, error: sampleError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('Erreur lors de la récupération d\'un échantillon de données:', sampleError);
      return false;
    }
    
    if (sampleData && sampleData.length > 0) {
      const sample = sampleData[0];
      
      // Vérifier si les colonnes email et siret existent
      const emailExists = 'email' in sample;
      const siretExists = 'siret' in sample;
      
      if (emailExists) {
        console.log('✅ La colonne email existe');
      } else {
        console.log('❌ La colonne email n\'existe pas');
      }
      
      if (siretExists) {
        console.log('✅ La colonne siret existe');
      } else {
        console.log('❌ La colonne siret n\'existe pas');
      }
      
      return emailExists && siretExists;
    } else {
      console.log('⚠️ Aucune donnée dans la table companies, impossible de vérifier les colonnes');
      return false;
    }
  } catch (err) {
    console.error('Exception lors de la vérification basique de la table companies:', err);
    return false;
  }
}

// Fonction pour corriger la structure de la table companies
async function fixCompaniesTable() {
  console.log('\n=== CORRECTION DE LA STRUCTURE DE LA TABLE COMPANIES ===');
  
  try {
    // Vérifier si la fonction RPC fix_companies_structure existe
    const { data: functionData, error: functionError } = await supabase.rpc('fix_companies_structure');
    
    if (functionError) {
      console.error('Erreur lors de l\'appel à la fonction fix_companies_structure:', functionError);
      console.log('⚠️ La fonction RPC fix_companies_structure n\'existe pas, utilisation de la méthode alternative...');
      
      return await fixCompaniesTableBasic();
    }
    
    // Afficher les résultats
    console.log('Résultats de la correction:');
    
    if (functionData.success) {
      if (functionData.email_added) {
        console.log('✅ La colonne email a été ajoutée');
      } else {
        console.log('ℹ️ La colonne email existait déjà');
      }
      
      if (functionData.siret_added) {
        console.log('✅ La colonne siret a été ajoutée');
      } else {
        console.log('ℹ️ La colonne siret existait déjà');
      }
      
      if (functionData.trigger_created) {
        console.log('✅ Le trigger de préservation des champs a été créé');
      } else {
        console.log('ℹ️ Le trigger de préservation des champs existait déjà');
      }
      
      if (functionData.policy_created) {
        console.log('✅ La politique RLS pour les champs email et siret a été créée');
      } else {
        console.log('ℹ️ La politique RLS pour les champs email et siret existait déjà');
      }
      
      console.log('\n✅ Correction de la table companies terminée avec succès');
      return true;
    } else {
      console.error('❌ Échec de la correction:', functionData.error);
      return false;
    }
  } catch (err) {
    console.error('Exception lors de la correction de la table companies:', err);
    return false;
  }
}

// Fonction pour corriger la structure de la table companies de manière basique
async function fixCompaniesTableBasic() {
  console.log('\n=== CORRECTION BASIQUE DE LA TABLE COMPANIES ===');
  
  try {
    // Vérifier si la table companies existe
    const { data: tableData, error: tableError } = await supabase
      .from('companies')
      .select('count(*)', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('Erreur lors de la vérification de la table companies:', tableError);
      console.log('❌ La table companies n\'existe probablement pas');
      return false;
    }
    
    // Récupérer un échantillon de données pour vérifier les colonnes
    const { data: sampleData, error: sampleError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('Erreur lors de la récupération d\'un échantillon de données:', sampleError);
      return false;
    }
    
    let emailExists = false;
    let siretExists = false;
    
    if (sampleData && sampleData.length > 0) {
      const sample = sampleData[0];
      
      // Vérifier si les colonnes email et siret existent
      emailExists = 'email' in sample;
      siretExists = 'siret' in sample;
    }
    
    // Ajouter les colonnes manquantes
    let success = true;
    
    if (!emailExists) {
      console.log('Ajout de la colonne email...');
      
      try {
        // Utiliser l'API REST pour exécuter une requête SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          },
          body: JSON.stringify({
            sql_query: 'ALTER TABLE companies ADD COLUMN IF NOT EXISTS email TEXT;'
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Erreur lors de l\'ajout de la colonne email:', errorData);
          success = false;
        } else {
          console.log('✅ La colonne email a été ajoutée');
        }
      } catch (err) {
        console.error('Exception lors de l\'ajout de la colonne email:', err);
        success = false;
      }
    } else {
      console.log('ℹ️ La colonne email existait déjà');
    }
    
    if (!siretExists) {
      console.log('Ajout de la colonne siret...');
      
      try {
        // Utiliser l'API REST pour exécuter une requête SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          },
          body: JSON.stringify({
            sql_query: 'ALTER TABLE companies ADD COLUMN IF NOT EXISTS siret TEXT;'
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Erreur lors de l\'ajout de la colonne siret:', errorData);
          success = false;
        } else {
          console.log('✅ La colonne siret a été ajoutée');
        }
      } catch (err) {
        console.error('Exception lors de l\'ajout de la colonne siret:', err);
        success = false;
      }
    } else {
      console.log('ℹ️ La colonne siret existait déjà');
    }
    
    if (success) {
      console.log('\n✅ Correction basique de la table companies terminée avec succès');
    } else {
      console.log('\n⚠️ Correction basique de la table companies terminée avec des avertissements');
    }
    
    return success;
  } catch (err) {
    console.error('Exception lors de la correction basique de la table companies:', err);
    return false;
  }
}

// Fonction pour créer la fonction RPC exec_sql si elle n'existe pas
async function createExecSqlFunction() {
  console.log('\n=== CRÉATION DES FONCTIONS RPC ===');
  
  try {
    // Lire le fichier SQL
    const sqlFilePath = path.join(__dirname, 'create-exec-sql-function.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Exécuter le SQL via l'API REST de Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        sql_query: sqlContent
      })
    });
    
    if (!response.ok) {
      // Si la fonction exec_sql n'existe pas, utiliser une autre approche
      console.log('La fonction exec_sql n\'existe pas encore, utilisation de l\'API REST...');
      
      // Utiliser l'API REST pour exécuter le SQL
      const restResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          query: sqlContent
        })
      });
      
      if (!restResponse.ok) {
        const errorData = await restResponse.json();
        console.error('Erreur lors de la création des fonctions RPC via l\'API REST:', errorData);
        return false;
      }
    }
    
    console.log('✅ Fonctions RPC créées avec succès');
    return true;
  } catch (err) {
    console.error('Exception lors de la création des fonctions RPC:', err);
    return false;
  }
}

// Fonction principale
async function main() {
  console.log('Démarrage de la vérification et correction de la table companies...');
  
  // Vérifier la structure de la table
  const checkResult = await checkCompaniesTable();
  
  // Si la vérification a échoué ou a détecté des problèmes, corriger la table
  if (!checkResult) {
    console.log('\nDes problèmes ont été détectés, tentative de correction...');
    const fixResult = await fixCompaniesTable();
    
    if (fixResult) {
      // Vérifier à nouveau après la correction
      console.log('\nVérification après correction:');
      await checkCompaniesTable();
    }
  } else {
    console.log('\n✅ La structure de la table companies est correcte');
  }
  
  console.log('\nTerminé.');
}

// Exécuter le script
main().catch(err => {
  console.error('Erreur non gérée:', err);
  process.exit(1);
}); 