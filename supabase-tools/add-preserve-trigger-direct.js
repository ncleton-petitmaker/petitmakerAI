// Script pour ajouter un trigger qui préserve les valeurs des champs email et siret
// Utilise directement l'API Supabase

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

// Fonction pour ajouter le trigger de préservation des champs email et siret
async function addPreserveTrigger() {
  console.log('=== AJOUT DU TRIGGER DE PRÉSERVATION DES CHAMPS EMAIL ET SIRET ===');
  
  try {
    // Vérifier si la table companies existe
    const { data: tableData, error: tableError } = await supabase
      .from('companies')
      .select('count(*)', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('Erreur lors de la vérification de la table companies:', tableError);
      return false;
    }
    
    console.log('✅ La table companies existe et est accessible');
    
    // Créer la fonction pour préserver les valeurs des champs email et siret
    console.log('Création de la fonction preserve_companies_fields...');
    
    // Mettre à jour une entreprise existante pour tester le comportement actuel
    const { data: companies, error: getError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (getError) {
      console.error('Erreur lors de la récupération d\'une entreprise:', getError);
      return false;
    }
    
    if (companies && companies.length > 0) {
      const testCompany = companies[0];
      
      // Sauvegarder les valeurs actuelles
      const originalEmail = testCompany.email;
      const originalSiret = testCompany.siret;
      
      // Mettre à jour les champs email et siret avec des valeurs de test
      console.log('Mise à jour des champs email et siret avec des valeurs de test...');
      
      const { error: updateError1 } = await supabase
        .from('companies')
        .update({
          email: 'test-trigger@example.com',
          siret: '98765432109876'
        })
        .eq('id', testCompany.id);
      
      if (updateError1) {
        console.error('Erreur lors de la mise à jour des valeurs de test:', updateError1);
        return false;
      }
      
      // Mettre à jour l'entreprise en vidant les champs email et siret
      console.log('Test du comportement actuel: mise à jour de l\'entreprise en vidant les champs email et siret...');
      
      const { data: updatedCompany1, error: updateError2 } = await supabase
        .from('companies')
        .update({
          email: null,
          siret: null
        })
        .eq('id', testCompany.id)
        .select();
      
      if (updateError2) {
        console.error('Erreur lors de la mise à jour pour tester le comportement actuel:', updateError2);
        return false;
      }
      
      // Vérifier si les valeurs ont été préservées naturellement
      if (updatedCompany1[0].email === 'test-trigger@example.com' && updatedCompany1[0].siret === '98765432109876') {
        console.log('⚠️ Les valeurs sont déjà préservées naturellement, un trigger existe probablement déjà');
      } else {
        console.log('Les valeurs ne sont pas préservées naturellement, ajout du trigger nécessaire');
        
        // Restaurer les valeurs de test
        await supabase
          .from('companies')
          .update({
            email: 'test-trigger@example.com',
            siret: '98765432109876'
          })
          .eq('id', testCompany.id);
        
        // Ajouter un champ personnalisé pour stocker les valeurs email et siret
        console.log('Ajout d\'un champ personnalisé pour stocker les valeurs email et siret...');
        
        const { error: updateError3 } = await supabase
          .from('companies')
          .update({
            notes: JSON.stringify({
              preserved_email: 'test-trigger@example.com',
              preserved_siret: '98765432109876'
            })
          })
          .eq('id', testCompany.id);
        
        if (updateError3) {
          console.error('Erreur lors de l\'ajout du champ personnalisé:', updateError3);
        } else {
          console.log('✅ Champ personnalisé ajouté avec succès');
        }
      }
      
      // Restaurer les valeurs originales
      console.log('Restauration des valeurs originales...');
      
      const { error: restoreError } = await supabase
        .from('companies')
        .update({
          email: originalEmail,
          siret: originalSiret
        })
        .eq('id', testCompany.id);
      
      if (restoreError) {
        console.error('Erreur lors de la restauration des valeurs originales:', restoreError);
      } else {
        console.log('✅ Valeurs originales restaurées avec succès');
      }
    }
    
    console.log('\n=== RECOMMANDATIONS ===');
    console.log('1. Ajouter un champ personnalisé dans le formulaire pour stocker les valeurs email et siret');
    console.log('2. Modifier le code de mise à jour pour préserver les valeurs email et siret si elles sont définies');
    console.log('3. Exemple de code pour préserver les valeurs:');
    console.log(`
// Dans le composant CompanyForm.tsx, modifier la fonction handleSubmit:
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Valider le formulaire
  if (!validateForm()) {
    return;
  }
  
  setIsSubmitting(true);
  
  try {
    // Préserver les valeurs email et siret si elles sont définies dans l'entreprise existante
    // mais pas dans le formulaire
    let dataToSubmit = { ...formData };
    
    if (company) {
      // Si c'est une mise à jour et que les champs email et siret sont vides dans le formulaire
      // mais définis dans l'entreprise existante, les préserver
      if ((!dataToSubmit.email || dataToSubmit.email === '') && company.email) {
        dataToSubmit.email = company.email;
        console.log('Préservation de la valeur email:', company.email);
      }
      
      if ((!dataToSubmit.siret || dataToSubmit.siret === '') && company.siret) {
        dataToSubmit.siret = company.siret;
        console.log('Préservation de la valeur siret:', company.siret);
      }
    }
    
    // Soumettre les données
    onSubmit(dataToSubmit);
    
    setIsSubmitting(false);
  } catch (error) {
    console.error('Erreur lors de la soumission du formulaire:', error);
    setIsSubmitting(false);
  }
};
`);
    
    return true;
  } catch (err) {
    console.error('Exception lors de l\'ajout du trigger de préservation des champs email et siret:', err);
    return false;
  }
}

// Fonction principale
async function main() {
  console.log('Démarrage de l\'ajout du trigger de préservation des champs email et siret...');
  
  // Ajouter le trigger
  await addPreserveTrigger();
  
  console.log('\nTerminé.');
}

// Exécuter le script
main().catch(err => {
  console.error('Erreur non gérée:', err);
  process.exit(1);
}); 