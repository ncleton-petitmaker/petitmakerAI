// Script pour créer le bucket "organization-seals" en utilisant des requêtes HTTP directes
// Ce script contourne le SDK Supabase et utilise des requêtes HTTP natives
import https from 'https';
import { config } from 'dotenv';
import fs from 'fs';

// Charger les variables d'environnement
config();

// URL et clé Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';

// Extraction du domaine pour les requêtes API
const domain = supabaseUrl.replace('https://', '');

console.log('🔍 URL Supabase:', supabaseUrl);
console.log('🔍 Domaine:', domain);
console.log('🔍 Utilisation de la clé de service pour les droits administrateur');

// Fonction pour faire une requête HTTP
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: domain,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Fonction principale pour créer le bucket
async function createBucket() {
  try {
    console.log('🔍 Vérification des buckets existants...');
    
    // Liste des buckets existants
    const listResponse = await makeRequest('GET', '/storage/v1/bucket');
    
    if (listResponse.statusCode !== 200) {
      console.error('❌ Erreur lors de la récupération des buckets:', listResponse);
      throw new Error(`Erreur de statut: ${listResponse.statusCode}`);
    }
    
    const buckets = listResponse.data;
    console.log('📋 Buckets existants:', buckets.map(b => b.name));
    
    // Vérifier si le bucket existe déjà
    const bucketExists = buckets.some(b => b.name === 'organization-seals');
    console.log(`🔍 Le bucket "organization-seals" existe déjà: ${bucketExists}`);
    
    if (!bucketExists) {
      console.log('🔍 Création du bucket "organization-seals"...');
      
      // Données pour la création du bucket
      const bucketData = {
        id: 'organization-seals',
        name: 'organization-seals',
        public: true,
        file_size_limit: 5242880 // 5MB en octets
      };
      
      // Créer le bucket
      const createResponse = await makeRequest('POST', '/storage/v1/bucket', bucketData);
      
      if (createResponse.statusCode !== 200 && createResponse.statusCode !== 201) {
        console.error('❌ Erreur lors de la création du bucket:', createResponse);
        throw new Error(`Erreur de statut: ${createResponse.statusCode}`);
      }
      
      console.log('✅ Bucket "organization-seals" créé avec succès!');
      
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
      
      fs.writeFileSync('direct-bucket-policies.sql', sqlScript);
      console.log('✅ Script SQL pour les politiques écrit dans direct-bucket-policies.sql');
      console.log('⚠️ Veuillez exécuter ce script SQL dans l\'interface SQL de Supabase pour configurer les politiques.');
    }
    
    // Vérifier à nouveau les buckets pour confirmer
    const checkResponse = await makeRequest('GET', '/storage/v1/bucket');
    if (checkResponse.statusCode === 200) {
      const updatedBuckets = checkResponse.data;
      console.log('📋 Liste actualisée des buckets:', updatedBuckets.map(b => b.name));
    }
    
    console.log('✅ Processus terminé. Vous pouvez maintenant uploader des tampons dans le bucket "organization-seals".');
    
  } catch (error) {
    console.error('❌ Erreur lors du processus:', error);
  }
}

// Exécuter la fonction principale
createBucket(); 