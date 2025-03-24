// Script pour créer le bucket "organization-seals" dans Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Vérifiez les variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erreur: Variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY requises');
  process.exit(1);
}

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction pour créer le bucket
async function createOrganizationSealsBucket() {
  try {
    // Vérifier si le bucket existe déjà
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      throw new Error(`Erreur lors de la vérification des buckets existants: ${listError.message}`);
    }
    
    const bucketName = 'organization-seals';
    const bucketExists = existingBuckets.some(bucket => bucket.name === bucketName);
    
    if (bucketExists) {
      console.log(`Le bucket "${bucketName}" existe déjà.`);
      return;
    }
    
    // Créer le bucket s'il n'existe pas
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: false,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'],
      fileSizeLimit: 5 * 1024 * 1024 // 5MB
    });
    
    if (error) {
      throw new Error(`Erreur lors de la création du bucket: ${error.message}`);
    }
    
    console.log(`Bucket "${bucketName}" créé avec succès!`);
    
    // Ajouter la politique RLS pour autoriser l'accès public aux fichiers
    const { error: policyError } = await supabase.storage.from(bucketName).createSignedUrl('dummy.txt', 60);
    
    if (policyError && !policyError.message.includes('not found')) {
      console.warn(`Attention: Impossible de tester la création d'URL signées: ${policyError.message}`);
    }
    
    console.log(`Configuration du bucket "${bucketName}" terminée.`);
    
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

// Exécuter la fonction
createOrganizationSealsBucket(); 