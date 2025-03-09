// Script pour configurer la table des formateurs dans Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer un client Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Les variables d\'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Lire le fichier SQL
const sqlFilePath = path.join(__dirname, 'create_trainers_table.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

// Diviser le contenu en requêtes individuelles
const queries = sqlContent
  .split(';')
  .map(query => query.trim())
  .filter(query => query.length > 0);

// Exécuter chaque requête
async function executeQueries() {
  try {
    console.log('Début de la configuration de la table des formateurs...');
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`Exécution de la requête ${i + 1}/${queries.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { query: query + ';' });
      
      if (error) {
        console.error(`Erreur lors de l'exécution de la requête ${i + 1}:`, error);
      }
    }
    
    console.log('Configuration de la table des formateurs terminée avec succès !');
  } catch (error) {
    console.error('Une erreur est survenue lors de la configuration:', error);
  }
}

// Exécuter les requêtes
executeQueries(); 