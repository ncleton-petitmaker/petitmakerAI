import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Obtenir le chemin du répertoire actuel en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration du client Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';

/**
 * Fonction pour exécuter une commande SQL via l'API REST de Supabase
 */
async function executeSQLViaREST(sql) {
  try {
    console.log('Exécution de la commande SQL via API REST...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: sql
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur lors de l\'exécution de la commande SQL:', errorText);
      return { success: false, error: new Error(errorText) };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Exception lors de l\'exécution de la commande SQL:', error);
    return { success: false, error };
  }
}

/**
 * Fonction pour exécuter les commandes SQL du fichier
 */
async function configureTrainingsRLS() {
  try {
    console.log('Configuration des politiques RLS pour la table trainings...');
    
    // Lire le fichier SQL
    const sqlFilePath = path.join(__dirname, 'configure-trainings-rls.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Diviser le contenu en blocs SQL individuels
    const sqlBlocks = sqlContent.split(';')
      .map(block => block.trim())
      .filter(block => block.length > 0);
    
    console.log(`Exécution de ${sqlBlocks.length} blocs SQL...`);
    
    // Exécuter chaque bloc SQL
    for (let i = 0; i < sqlBlocks.length; i++) {
      const block = sqlBlocks[i];
      console.log(`\nExécution du bloc SQL ${i + 1}/${sqlBlocks.length}:`);
      console.log('-----------------------------------');
      console.log(block);
      console.log('-----------------------------------');
      
      // Exécuter la commande SQL
      const { success, error } = await executeSQLViaREST(block);
      
      if (!success) {
        console.error(`Erreur lors de l'exécution du bloc SQL ${i + 1}:`, error);
        
        // Afficher les instructions manuelles
        console.log('\nVeuillez exécuter manuellement cette commande SQL dans l\'interface Supabase:');
        console.log(block);
        
        // Demander à l'utilisateur s'il souhaite continuer
        const readline = (await import('readline')).default.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          readline.question('Avez-vous exécuté la commande manuellement? (o/n) ', resolve);
        });
        
        readline.close();
        
        if (answer.toLowerCase() !== 'o') {
          console.log('Configuration interrompue par l\'utilisateur.');
          return;
        }
      } else {
        console.log(`Bloc SQL ${i + 1} exécuté avec succès.`);
      }
    }
    
    console.log('\nConfiguration des politiques RLS terminée avec succès!');
    console.log('Les politiques suivantes ont été configurées:');
    console.log('1. Tout le monde peut voir les formations');
    console.log('2. Les administrateurs peuvent modifier les formations');
    console.log('3. Les administrateurs peuvent supprimer les formations');
    console.log('4. Les administrateurs peuvent ajouter des formations');
    
    console.log('\nVous pouvez maintenant enregistrer des formations sans problème.');
    
  } catch (error) {
    console.error('Erreur lors de la configuration des politiques RLS:', error);
  }
}

// Exécuter la fonction principale
configureTrainingsRLS().then(() => {
  console.log('Script terminé.');
}).catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
}); 