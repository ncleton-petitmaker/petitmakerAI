// Script pour vérifier et créer le bucket "organization-seals" dans Supabase
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Charger les variables d'environnement
config();

// Vérification des variables d'environnement
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('Erreur: NEXT_PUBLIC_SUPABASE_URL non défini dans les variables d\'environnement');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Erreur: Aucune clé Supabase n\'est définie (SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

// Création du client Supabase
console.log('Initialisation du client Supabase avec l\'URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction principale
async function checkAndCreateBucket() {
  try {
    console.log('Vérification des buckets existants...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Erreur lors de la récupération des buckets:', bucketsError);
      process.exit(1);
    }
    
    console.log('Buckets disponibles:', buckets.map(b => b.name));
    
    // Vérifier si le bucket "organization-seals" existe
    const organizationSealsBucketExists = buckets.some(b => b.name === 'organization-seals');
    console.log('Le bucket "organization-seals" existe:', organizationSealsBucketExists);
    
    // Créer le bucket s'il n'existe pas
    if (!organizationSealsBucketExists) {
      console.log('Création du bucket "organization-seals"...');
      
      const { data: createData, error: createError } = await supabase.storage.createBucket('organization-seals', {
        public: true
      });
      
      if (createError) {
        console.error('Erreur lors de la création du bucket:', createError);
        process.exit(1);
      }
      
      console.log('Le bucket "organization-seals" a été créé avec succès!');
      
      // Création de la politique pour permettre aux utilisateurs authentifiés de lire les fichiers
      console.log('Création des politiques pour le bucket...');
      
      // Politique pour permettre aux utilisateurs authentifiés d'ajouter des fichiers
      const { error: insertPolicyError } = await supabase.storage.from('organization-seals').createPolicy('authenticated_insert', {
        role: 'authenticated',
        definition: { type: 'INSERT', action: 'ALL' }
      });
      
      if (insertPolicyError) {
        console.error('Erreur lors de la création de la politique d\'insertion:', insertPolicyError);
      } else {
        console.log('Politique d\'insertion créée avec succès');
      }
      
      // Politique pour permettre à tous de lire les fichiers
      const { error: selectPolicyError } = await supabase.storage.from('organization-seals').createPolicy('public_select', {
        role: '*',
        definition: { type: 'SELECT', action: 'ALL' }
      });
      
      if (selectPolicyError) {
        console.error('Erreur lors de la création de la politique de lecture:', selectPolicyError);
      } else {
        console.log('Politique de lecture créée avec succès');
      }
    }
    
    // Vérification finale
    const { data: updatedBuckets } = await supabase.storage.listBuckets();
    console.log('Liste des buckets après opération:', updatedBuckets.map(b => b.name));
    
  } catch (error) {
    console.error('Exception lors de l\'exécution du script:', error);
    process.exit(1);
  }
}

// Exécution de la fonction principale
checkAndCreateBucket(); 