// Script pour vérifier directement la structure de la table companies dans Supabase
// Utilise l'API Supabase standard pour accéder à la table

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
    // Vérifier si la table companies existe en récupérant un échantillon
    const { data: sampleData, error: sampleError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('Erreur lors de la récupération d\'un échantillon de la table companies:', sampleError);
      return false;
    }
    
    console.log('✅ La table companies existe et est accessible');
    
    // Récupérer le nombre total d'entreprises
    const { count, error: countError } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Erreur lors du comptage des entreprises:', countError);
    } else {
      console.log(`Nombre total d'entreprises: ${count}`);
    }
    
    // Analyser la structure de la table à partir de l'échantillon
    if (sampleData && sampleData.length > 0) {
      const sample = sampleData[0];
      console.log('\nStructure de la table companies:');
      
      // Afficher les colonnes et leurs valeurs
      const columns = Object.keys(sample);
      console.log(`Colonnes (${columns.length}): ${columns.join(', ')}`);
      
      // Vérifier spécifiquement les colonnes email et siret
      const emailExists = columns.includes('email');
      const siretExists = columns.includes('siret');
      
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
      
      // Récupérer des statistiques sur les colonnes email et siret
      if (emailExists || siretExists) {
        // Récupérer toutes les entreprises pour les statistiques
        const { data: allCompanies, error: allError } = await supabase
          .from('companies')
          .select('email, siret');
        
        if (allError) {
          console.error('Erreur lors de la récupération des données pour les statistiques:', allError);
        } else if (allCompanies && allCompanies.length > 0) {
          if (emailExists) {
            const emailStats = {
              total: allCompanies.length,
              notNull: allCompanies.filter(c => c.email !== null).length,
              empty: allCompanies.filter(c => c.email === '').length,
              valid: allCompanies.filter(c => c.email !== null && c.email !== '').length
            };
            
            console.log('\nStatistiques de la colonne email:');
            console.log(`- Total: ${emailStats.total}`);
            console.log(`- Non null: ${emailStats.notNull}`);
            console.log(`- Vides: ${emailStats.empty}`);
            console.log(`- Valides: ${emailStats.valid}`);
            console.log(`- Pourcentage rempli: ${(emailStats.valid / emailStats.total * 100).toFixed(2)}%`);
          }
          
          if (siretExists) {
            const siretStats = {
              total: allCompanies.length,
              notNull: allCompanies.filter(c => c.siret !== null).length,
              empty: allCompanies.filter(c => c.siret === '').length,
              valid: allCompanies.filter(c => c.siret !== null && c.siret !== '').length
            };
            
            console.log('\nStatistiques de la colonne siret:');
            console.log(`- Total: ${siretStats.total}`);
            console.log(`- Non null: ${siretStats.notNull}`);
            console.log(`- Vides: ${siretStats.empty}`);
            console.log(`- Valides: ${siretStats.valid}`);
            console.log(`- Pourcentage rempli: ${(siretStats.valid / siretStats.total * 100).toFixed(2)}%`);
          }
        }
      }
      
      return true;
    } else {
      console.log('⚠️ La table companies existe mais est vide');
      return true;
    }
  } catch (err) {
    console.error('Exception lors de la vérification de la table companies:', err);
    return false;
  }
}

// Fonction pour ajouter les colonnes email et siret si elles n'existent pas
async function addMissingColumns() {
  console.log('\n=== AJOUT DES COLONNES MANQUANTES ===');
  
  try {
    // Vérifier si la table companies existe en récupérant un échantillon
    const { data: sampleData, error: sampleError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('Erreur lors de la récupération d\'un échantillon de la table companies:', sampleError);
      return false;
    }
    
    // Analyser la structure de la table à partir de l'échantillon
    if (sampleData && sampleData.length > 0) {
      const sample = sampleData[0];
      const columns = Object.keys(sample);
      
      // Vérifier si les colonnes email et siret existent
      const emailExists = columns.includes('email');
      const siretExists = columns.includes('siret');
      
      // Utiliser l'API REST pour exécuter des requêtes SQL si nécessaire
      if (!emailExists || !siretExists) {
        console.log('Des colonnes sont manquantes, tentative d\'ajout via l\'API REST...');
        
        // Construire la requête SQL
        let sqlQuery = '';
        
        if (!emailExists) {
          sqlQuery += 'ALTER TABLE companies ADD COLUMN IF NOT EXISTS email TEXT; ';
        }
        
        if (!siretExists) {
          sqlQuery += 'ALTER TABLE companies ADD COLUMN IF NOT EXISTS siret TEXT; ';
        }
        
        // Exécuter la requête SQL via l'API REST
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            query: sqlQuery
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Erreur lors de l\'ajout des colonnes manquantes:', errorData);
          return false;
        }
        
        console.log('✅ Colonnes manquantes ajoutées avec succès');
        return true;
      } else {
        console.log('✅ Toutes les colonnes nécessaires existent déjà');
        return true;
      }
    } else {
      console.log('⚠️ La table companies existe mais est vide, impossible de vérifier les colonnes');
      return false;
    }
  } catch (err) {
    console.error('Exception lors de l\'ajout des colonnes manquantes:', err);
    return false;
  }
}

// Fonction principale
async function main() {
  console.log('Démarrage de la vérification de la table companies...');
  
  // Vérifier la structure de la table
  const checkResult = await checkCompaniesTable();
  
  // Si des colonnes sont manquantes, les ajouter
  if (!checkResult) {
    console.log('\nDes problèmes ont été détectés, tentative de correction...');
    const addResult = await addMissingColumns();
    
    if (addResult) {
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