// Script pour associer automatiquement les apprenants d'une entreprise à une formation
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Configuration du chemin pour le fichier .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(__dirname);
const envPath = join(rootDir, '.env');

// Charger les variables d'environnement
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('Fichier .env chargé depuis:', envPath);
} else {
  console.error(`Fichier .env introuvable à ${envPath}`);
  process.exit(1);
}

// Vérifier les variables d'environnement
console.log('Variables d\'environnement:');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Définie' : 'Non définie');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Définie' : 'Non définie');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'Définie' : 'Non définie');

// Utiliser la clé de service si disponible, sinon la clé anonyme
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!process.env.VITE_SUPABASE_URL) {
  console.error('La variable d\'environnement VITE_SUPABASE_URL n\'est pas définie');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('Aucune clé Supabase n\'est définie (SUPABASE_KEY ou VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

// Initialiser le client Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  supabaseKey
);

// Fonction pour récupérer toutes les formations
async function getTrainings() {
  const { data, error } = await supabase
    .from('trainings')
    .select('id, title, company_id');
  
  if (error) {
    console.error('Erreur lors de la récupération des formations:', error);
    return [];
  }
  
  // Récupérer les apprenants pour chaque formation
  const trainingsWithLearners = await Promise.all(data.map(async (training) => {
    const { data: learners, error: learnersError } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name')
      .eq('training_id', training.id);
    
    if (learnersError) {
      console.error(`Erreur lors de la récupération des apprenants pour la formation ${training.id}:`, learnersError);
      return { ...training, learners: [] };
    }
    
    return { ...training, learners: learners || [] };
  }));
  
  return trainingsWithLearners;
}

// Fonction pour récupérer les entreprises
async function getCompanies() {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name');
  
  if (error) {
    console.error('Erreur lors de la récupération des entreprises:', error);
    return [];
  }
  
  return data;
}

// Fonction pour associer les apprenants d'une entreprise à une formation
async function associateLearnersToTraining(trainingId, companyId) {
  // Vérifier si la formation existe
  const { data: trainingData, error: trainingError } = await supabase
    .from('trainings')
    .select('id, title')
    .eq('id', trainingId)
    .single();
  
  if (trainingError || !trainingData) {
    console.error(`Formation avec l'ID ${trainingId} non trouvée:`, trainingError);
    return false;
  }
  
  // Vérifier si l'entreprise existe
  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', companyId)
    .single();
  
  if (companyError || !companyData) {
    console.error(`Entreprise avec l'ID ${companyId} non trouvée:`, companyError);
    return false;
  }
  
  console.log(`Association des apprenants de l'entreprise "${companyData.name}" à la formation "${trainingData.title}"`);
  
  // Récupérer tous les apprenants de l'entreprise
  const { data: companyLearners, error: learnersError } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name')
    .eq('company_id', companyId);
  
  if (learnersError) {
    console.error('Erreur lors de la récupération des apprenants:', learnersError);
    return false;
  }
  
  if (!companyLearners || companyLearners.length === 0) {
    console.log(`Aucun apprenant trouvé pour l'entreprise "${companyData.name}" (ID: ${companyId})`);
    return false;
  }
  
  console.log(`${companyLearners.length} apprenants trouvés pour l'entreprise "${companyData.name}"`);
  
  // Mettre à jour le champ training_id de tous les apprenants de l'entreprise
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ training_id: trainingId })
    .eq('company_id', companyId);
  
  if (updateError) {
    console.error('Erreur lors de l\'association des apprenants:', updateError);
    return false;
  }
  
  console.log(`${companyLearners.length} apprenants associés avec succès à la formation "${trainingData.title}"`);
  console.log('Apprenants associés:');
  companyLearners.forEach(learner => {
    console.log(`  - ${learner.first_name} ${learner.last_name}`);
  });
  
  return true;
}

// Fonction principale
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node associate-learners.js [options]');
    console.log('Options:');
    console.log('  --training-id <id>    ID de la formation (obligatoire si --company-id est spécifié)');
    console.log('  --company-id <id>     ID de l\'entreprise (obligatoire si --training-id est spécifié)');
    console.log('  --list-trainings      Afficher la liste des formations');
    console.log('  --list-companies      Afficher la liste des entreprises');
    console.log('  --all                 Associer tous les apprenants de toutes les entreprises à leurs formations respectives');
    console.log('  --help, -h            Afficher ce message d\'aide');
    return;
  }
  
  if (args.includes('--list-trainings')) {
    console.log('Liste des formations:');
    const trainings = await getTrainings();
    trainings.forEach(training => {
      console.log(`  - ID: ${training.id}, Titre: ${training.title}, Entreprise ID: ${training.company_id || 'Non assignée'}`);
      if (training.learners && training.learners.length > 0) {
        console.log(`    Apprenants associés (${training.learners.length}):`);
        training.learners.forEach(learner => {
          console.log(`      * ${learner.first_name} ${learner.last_name}`);
        });
      } else {
        console.log('    Aucun apprenant associé');
      }
    });
    return;
  }
  
  if (args.includes('--list-companies')) {
    console.log('Liste des entreprises:');
    const companies = await getCompanies();
    companies.forEach(company => {
      console.log(`  - ID: ${company.id}, Nom: ${company.name}`);
    });
    return;
  }
  
  // Association basée sur les arguments
  const trainingIdIndex = args.indexOf('--training-id');
  const companyIdIndex = args.indexOf('--company-id');
  
  if (trainingIdIndex !== -1 && companyIdIndex !== -1) {
    const trainingId = args[trainingIdIndex + 1];
    const companyId = args[companyIdIndex + 1];
    
    if (!trainingId || !companyId) {
      console.error('Les arguments --training-id et --company-id nécessitent des valeurs');
      return;
    }
    
    await associateLearnersToTraining(trainingId, companyId);
    return;
  }
  
  // Association de tous les apprenants à leurs formations respectives
  if (args.includes('--all')) {
    console.log('Association de tous les apprenants à leurs formations respectives...');
    const trainings = await getTrainings();
    let successCount = 0;
    
    for (const training of trainings) {
      if (training.company_id) {
        const success = await associateLearnersToTraining(training.id, training.company_id);
        if (success) {
          successCount++;
        }
      } else {
        console.log(`Formation "${training.title}" (ID: ${training.id}) n'a pas d'entreprise associée, ignorée.`);
      }
    }
    
    console.log(`${successCount} formations traitées avec succès.`);
    return;
  }
  
  console.log('Aucune action spécifiée. Utilisez --help pour voir les options disponibles.');
}

main().catch(err => {
  console.error('Erreur non gérée:', err);
  process.exit(1);
}); 