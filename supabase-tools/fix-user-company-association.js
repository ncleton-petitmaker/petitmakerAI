// Script pour vérifier et corriger l'association entre l'utilisateur et l'entreprise Petitmaker
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

// Fonction pour vérifier et corriger l'association utilisateur-entreprise
async function fixUserCompanyAssociation() {
  console.log('=== VÉRIFICATION ET CORRECTION DE L\'ASSOCIATION UTILISATEUR-ENTREPRISE ===');
  
  try {
    // Récupérer l'entreprise Petitmaker
    console.log('Recherche de l\'entreprise Petitmaker...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .eq('name', 'Petitmaker');
    
    if (companiesError) {
      console.error('Erreur lors de la recherche de l\'entreprise:', companiesError);
      return false;
    }
    
    if (!companies || companies.length === 0) {
      console.log('❌ Entreprise Petitmaker non trouvée');
      
      // Créer l'entreprise si elle n'existe pas
      console.log('Création de l\'entreprise Petitmaker...');
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert([
          {
            name: 'Petitmaker',
            status: 'active',
            email: 'contact@petitmaker.com',
            siret: '12345678901234'
          }
        ])
        .select();
      
      if (createError) {
        console.error('Erreur lors de la création de l\'entreprise:', createError);
        return false;
      }
      
      console.log('✅ Entreprise Petitmaker créée avec succès:', newCompany[0]);
      var companyId = newCompany[0].id;
    } else {
      console.log('✅ Entreprise Petitmaker trouvée:', companies[0]);
      var companyId = companies[0].id;
    }
    
    // Récupérer l'utilisateur Nicolas Cléton
    console.log('Recherche de l\'utilisateur Nicolas Cléton...');
    const { data: userProfiles, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('first_name', 'Nicoolas')
      .eq('last_name', 'Cléton');
    
    if (userError) {
      console.error('Erreur lors de la recherche de l\'utilisateur:', userError);
      return false;
    }
    
    if (!userProfiles || userProfiles.length === 0) {
      console.log('❌ Utilisateur Nicolas Cléton non trouvé');
      return false;
    }
    
    console.log('✅ Utilisateur Nicolas Cléton trouvé:', userProfiles[0]);
    
    // Vérifier si l'utilisateur est déjà associé à l'entreprise
    if (userProfiles[0].company_id === companyId) {
      console.log('✅ L\'utilisateur est déjà correctement associé à l\'entreprise Petitmaker');
      return true;
    }
    
    // Mettre à jour l'association utilisateur-entreprise
    console.log('Mise à jour de l\'association utilisateur-entreprise...');
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ company_id: companyId })
      .eq('id', userProfiles[0].id);
    
    if (updateError) {
      console.error('Erreur lors de la mise à jour de l\'association:', updateError);
      return false;
    }
    
    console.log('✅ Association utilisateur-entreprise mise à jour avec succès');
    
    // Vérifier si l'utilisateur a le statut d'administrateur
    if (userProfiles[0].is_admin) {
      console.log('✅ L\'utilisateur a déjà le statut d\'administrateur');
    } else {
      console.log('Mise à jour du statut d\'administrateur de l\'utilisateur...');
      const { error: updateAdminError } = await supabase
        .from('user_profiles')
        .update({ is_admin: true })
        .eq('id', userProfiles[0].id);
      
      if (updateAdminError) {
        console.error('Erreur lors de la mise à jour du statut d\'administrateur:', updateAdminError);
        return false;
      }
      
      console.log('✅ Statut d\'administrateur mis à jour avec succès');
    }
    
    return true;
  } catch (err) {
    console.error('Exception lors de la vérification et correction de l\'association utilisateur-entreprise:', err);
    return false;
  }
}

// Fonction principale
async function main() {
  console.log('Démarrage de la vérification et correction de l\'association utilisateur-entreprise...');
  
  const result = await fixUserCompanyAssociation();
  
  if (result) {
    console.log('\n✅ Opération terminée avec succès');
  } else {
    console.log('\n❌ Des erreurs se sont produites lors de l\'opération');
  }
  
  console.log('\nTerminé.');
}

// Exécuter le script
main().catch(err => {
  console.error('Erreur non gérée:', err);
  process.exit(1);
}); 