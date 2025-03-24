// Script pour créer le bucket "organization-seals" dans Supabase
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';

// Charger les variables d'environnement
config();

// URL et clé Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Utilisation de la clé de service pour les droits admin

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Les variables SUPABASE_URL et SUPABASE_KEY doivent être définies dans le fichier .env');
  process.exit(1);
}

console.log('🔍 Connexion à Supabase avec la clé de service...');
console.log(`🔍 URL: ${supabaseUrl}`);
console.log(`🔍 Clé: ${supabaseKey.substring(0, 10)}...`);

// Création du client Supabase avec la clé de service
const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction principale
async function createBucket() {
  try {
    console.log('🔍 Vérification des buckets existants...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Erreur lors de la récupération des buckets:', bucketsError);
      throw bucketsError;
    }
    
    console.log('📋 Buckets existants:', buckets.map(b => b.name));
    
    // Vérifier si le bucket existe déjà
    const bucketExists = buckets.some(b => b.name === 'organization-seals');
    console.log(`🔍 Le bucket "organization-seals" existe déjà: ${bucketExists}`);
    
    if (!bucketExists) {
      console.log('🔍 Création du bucket "organization-seals"...');
      const { data, error } = await supabase.storage.createBucket('organization-seals', {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (error) {
        console.error('❌ Erreur lors de la création du bucket:', error);
        throw error;
      }
      
      console.log('✅ Bucket "organization-seals" créé avec succès!');
      
      // Ajouter les politiques RLS pour le bucket
      console.log('🔍 Configuration des politiques RLS...');
      
      // Écrire le script SQL pour les politiques
      const sqlScript = `
        -- Créer les politiques pour le bucket organization-seals
        -- Politique pour permettre à tout le monde de voir les tampons
        CREATE POLICY "Tout le monde peut voir les tampons"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'organization-seals');
        
        -- Politique pour permettre aux utilisateurs authentifiés d'ajouter des tampons
        CREATE POLICY "Les utilisateurs peuvent ajouter des tampons"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'organization-seals' AND auth.role() = 'authenticated');
        
        -- Politique pour permettre aux utilisateurs de modifier leurs propres tampons
        CREATE POLICY "Les utilisateurs peuvent modifier leurs tampons"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'organization-seals' AND auth.role() = 'authenticated');
        
        -- Politique pour permettre aux utilisateurs de supprimer leurs propres tampons
        CREATE POLICY "Les utilisateurs peuvent supprimer leurs tampons"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'organization-seals' AND auth.role() = 'authenticated');
      `;
      
      fs.writeFileSync('create-bucket-policies.sql', sqlScript);
      console.log('✅ Script SQL pour les politiques écrit dans create-bucket-policies.sql');
      console.log('⚠️ Veuillez exécuter ce script SQL dans l\'interface SQL de Supabase pour configurer les politiques.');
    }
    
    console.log('✅ Vous pouvez maintenant uploader des tampons dans le bucket "organization-seals".');
    
    // Vérifier à nouveau les buckets pour confirmer
    const { data: updatedBuckets } = await supabase.storage.listBuckets();
    console.log('📋 Liste actualisée des buckets:', updatedBuckets.map(b => b.name));
    
  } catch (error) {
    console.error('❌ Erreur lors de la création du bucket:', error);
  }
}

// Exécuter la fonction principale
createBucket(); 