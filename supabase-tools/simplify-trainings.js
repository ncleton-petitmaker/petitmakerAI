import { fileURLToPath } from 'url';
import path from 'path';
import readline from 'readline';

// Obtenir le chemin du répertoire actuel en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Crée une interface de lecture pour les interactions utilisateur
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Pose une question à l'utilisateur et attend sa réponse
 */
async function askQuestion(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

/**
 * Fonction principale pour simplifier la structure des trainings
 */
async function simplifyTrainings() {
  try {
    console.log('Début de la simplification des trainings...');
    const rl = createReadlineInterface();
    
    // Étape 1: Vérifier si les tables existent
    console.log('\nÉtape 1: Vérification des tables...');
    console.log('Nous allons vérifier si les tables training_periods et training_time_slots existent.');
    
    const periodsExists = await askQuestion(rl, 'La table training_periods existe-t-elle? (o/n) ');
    const timeSlotsExists = await askQuestion(rl, 'La table training_time_slots existe-t-elle? (o/n) ');
    
    const hasPeriods = periodsExists.toLowerCase() === 'o';
    const hasTimeSlots = timeSlotsExists.toLowerCase() === 'o';
    
    console.log(`Table training_periods: ${hasPeriods ? 'existe' : 'n\'existe pas'}`);
    console.log(`Table training_time_slots: ${hasTimeSlots ? 'existe' : 'n\'existe pas'}`);
    
    // Étape 2: Vérifier si la colonne metadata existe dans la table trainings
    console.log('\nÉtape 2: Vérification de la colonne metadata...');
    const metadataExists = await askQuestion(rl, 'La colonne metadata existe-t-elle dans la table trainings? (o/n) ');
    
    if (metadataExists.toLowerCase() !== 'o') {
      console.log('❌ La colonne metadata n\'existe pas dans la table trainings.');
      console.log('Cette colonne doit être ajoutée manuellement via l\'interface Supabase.');
      console.log('Exécutez la requête SQL suivante dans l\'éditeur SQL de Supabase:');
      console.log('ALTER TABLE trainings ADD COLUMN metadata JSONB DEFAULT \'{}\';');
      
      const answer = await askQuestion(rl, 'Avez-vous ajouté la colonne metadata? (o/n) ');
      if (answer.toLowerCase() !== 'o') {
        console.log('Opération annulée. Veuillez ajouter la colonne metadata avant de continuer.');
        rl.close();
        return;
      }
    } else {
      console.log('✅ La colonne metadata existe dans la table trainings.');
    }
    
    // Étape 3: Migrer les données si nécessaire
    if (hasPeriods || hasTimeSlots) {
      console.log('\nÉtape 3: Migration des données...');
      console.log('Des données doivent être migrées des tables training_periods et/ou training_time_slots vers la colonne metadata.');
      console.log('Cette opération doit être effectuée manuellement via l\'interface Supabase.');
      console.log('Exécutez la requête SQL suivante dans l\'éditeur SQL de Supabase:');
      
      let migrationSQL = 'UPDATE trainings\nSET metadata = jsonb_build_object(\n';
      
      if (hasPeriods) {
        migrationSQL += "  'periods', (\n    SELECT jsonb_agg(row_to_json(p))\n    FROM training_periods p\n    WHERE p.training_id = trainings.id\n  )";
      }
      
      if (hasPeriods && hasTimeSlots) {
        migrationSQL += ',\n';
      }
      
      if (hasTimeSlots) {
        migrationSQL += "  'timeSlots', (\n    SELECT jsonb_agg(row_to_json(ts))\n    FROM training_time_slots ts\n    WHERE ts.training_id = trainings.id\n  )";
      }
      
      migrationSQL += '\n)\nWHERE id IN (\n';
      
      if (hasPeriods) {
        migrationSQL += '  SELECT DISTINCT training_id FROM training_periods';
      }
      
      if (hasPeriods && hasTimeSlots) {
        migrationSQL += '\n  UNION\n';
      }
      
      if (hasTimeSlots) {
        migrationSQL += '  SELECT DISTINCT training_id FROM training_time_slots';
      }
      
      migrationSQL += '\n);';
      
      console.log(migrationSQL);
      
      const answer = await askQuestion(rl, 'Avez-vous migré les données? (o/n) ');
      if (answer.toLowerCase() !== 'o') {
        console.log('Opération annulée. Veuillez migrer les données avant de continuer.');
        rl.close();
        return;
      }
    } else {
      console.log('\nÉtape 3: Migration des données...');
      console.log('✅ Aucune donnée à migrer car les tables n\'existent pas.');
    }
    
    // Étape 4: Configurer les politiques RLS
    console.log('\nÉtape 4: Configuration des politiques RLS...');
    console.log('Les politiques RLS doivent être configurées manuellement via l\'interface Supabase.');
    console.log('Assurez-vous que RLS est activé sur la table trainings et que les politiques suivantes sont créées:');
    console.log('\n1. Politique pour voir les formations (SELECT):');
    console.log('Nom: "Les utilisateurs peuvent voir les formations auxquelles ils sont inscrits"');
    console.log('Opération: SELECT');
    console.log('Utilisation: auth.uid() IN (SELECT user_id FROM user_profiles WHERE training_id = id) OR auth.jwt() ? \'admin_access\'');
    
    console.log('\n2. Politique pour modifier les formations (UPDATE):');
    console.log('Nom: "Les administrateurs peuvent modifier les formations"');
    console.log('Opération: UPDATE');
    console.log('Utilisation: auth.jwt() ? \'admin_access\'');
    
    console.log('\n3. Politique pour supprimer les formations (DELETE):');
    console.log('Nom: "Les administrateurs peuvent supprimer les formations"');
    console.log('Opération: DELETE');
    console.log('Utilisation: auth.jwt() ? \'admin_access\'');
    
    console.log('\n4. Politique pour ajouter des formations (INSERT):');
    console.log('Nom: "Les administrateurs peuvent ajouter des formations"');
    console.log('Opération: INSERT');
    console.log('Vérification: auth.jwt() ? \'admin_access\'');
    
    const answer = await askQuestion(rl, 'Avez-vous configuré les politiques RLS? (o/n) ');
    if (answer.toLowerCase() !== 'o') {
      console.log('Opération annulée. Veuillez configurer les politiques RLS avant de continuer.');
      rl.close();
      return;
    }
    
    // Étape 5: Supprimer les tables inutiles
    if (hasPeriods || hasTimeSlots) {
      console.log('\nÉtape 5: Suppression des tables inutiles...');
      console.log('Les tables training_periods et training_time_slots doivent être supprimées manuellement via l\'interface Supabase.');
      console.log('Exécutez les requêtes SQL suivantes dans l\'éditeur SQL de Supabase:');
      
      if (hasPeriods) {
        console.log('DROP TABLE IF EXISTS training_periods;');
      }
      
      if (hasTimeSlots) {
        console.log('DROP TABLE IF EXISTS training_time_slots;');
      }
      
      const answer = await askQuestion(rl, 'Avez-vous supprimé les tables? (o/n) ');
      if (answer.toLowerCase() !== 'o') {
        console.log('Opération annulée. Veuillez supprimer les tables avant de continuer.');
        rl.close();
        return;
      }
    } else {
      console.log('\nÉtape 5: Suppression des tables inutiles...');
      console.log('✅ Aucune table à supprimer car elles n\'existent pas.');
    }
    
    console.log('\nSimplification des trainings terminée avec succès!');
    console.log('Récapitulatif:');
    console.log('1. Les tables training_periods et training_time_slots ont été supprimées.');
    console.log('2. La colonne metadata a été ajoutée à la table trainings.');
    console.log('3. Les données ont été migrées vers la colonne metadata.');
    console.log('4. Les politiques RLS ont été configurées pour la table trainings.');
    
    rl.close();
  } catch (error) {
    console.error('Erreur lors de la simplification des trainings:', error);
  }
}

// Exécuter la fonction principale
simplifyTrainings().then(() => {
  console.log('Script terminé.');
}).catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
}); 