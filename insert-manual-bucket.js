// Script pour insérer un enregistrement dans la table storage_buckets_manual
// Ce script utilise l'API REST de Supabase pour contourner les restrictions d'accès direct
import { config } from 'dotenv';
import https from 'https';

// Charger les variables d'environnement
config();

// URL et clé Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';

// Extraction du domaine pour les requêtes API
const domain = supabaseUrl.replace('https://', '');

console.log('🔍 URL Supabase:', supabaseUrl);
console.log('🔍 Domaine:', domain);
console.log('🔍 Utilisation de la clé de service pour les opérations');

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
        'apikey': supabaseKey,
        'Prefer': 'return=representation'
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

// Fonction pour vérifier si la table storage_buckets_manual existe
async function checkTableExists() {
  try {
    console.log('🔍 Vérification de l\'existence de la table storage_buckets_manual...');
    
    // Utiliser l'API REST pour vérifier la table
    const response = await makeRequest('GET', '/rest/v1/storage_buckets_manual?limit=1');
    
    if (response.statusCode === 200) {
      console.log('✅ La table storage_buckets_manual existe.');
      return true;
    } else {
      console.log('❌ La table storage_buckets_manual n\'existe pas ou n\'est pas accessible:', response);
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la table:', error);
    return false;
  }
}

// Fonction pour insérer dans la table storage_buckets_manual
async function insertManualBucket() {
  try {
    // Vérifier si la table existe
    const tableExists = await checkTableExists();
    
    if (!tableExists) {
      console.log('⚠️ Veuillez exécuter le script SQL create_storage_buckets_manual_table.sql avant de continuer.');
      return;
    }
    
    console.log('🔍 Insertion d\'un enregistrement pour le bucket "organization-seals"...');
    
    // Données pour l'insertion
    const bucketData = {
      id: 'organization-seals',
      name: 'organization-seals',
      owner: null,
      public: true,
      file_size_limit: 5242880, // 5MB en octets
      created_at: new Date().toISOString(),
      processed: false
    };
    
    // Insérer dans la table storage_buckets_manual
    const insertResponse = await makeRequest('POST', '/rest/v1/storage_buckets_manual', bucketData);
    
    if (insertResponse.statusCode === 201) {
      console.log('✅ Enregistrement inséré avec succès dans storage_buckets_manual:', insertResponse.data);
      console.log('⏳ Le trigger devrait maintenant créer automatiquement le bucket dans storage.buckets');
    } else {
      console.error('❌ Erreur lors de l\'insertion dans storage_buckets_manual:', insertResponse);
    }
    
    // Vérifier si le bucket a été créé (après un court délai pour laisser le temps au trigger de s'exécuter)
    console.log('⏳ Attente de 2 secondes pour laisser le trigger s\'exécuter...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Vérifier les buckets de stockage
    const bucketsResponse = await makeRequest('GET', '/storage/v1/bucket');
    
    if (bucketsResponse.statusCode === 200) {
      const buckets = bucketsResponse.data;
      console.log('📋 Buckets existants après insertion:', buckets.map(b => b.name));
      
      if (buckets.some(b => b.name === 'organization-seals')) {
        console.log('✅ Le bucket "organization-seals" a été créé avec succès par le trigger!');
      } else {
        console.log('⚠️ Le bucket "organization-seals" n\'a pas été créé automatiquement.');
        console.log('⚠️ Vérifiez les logs du serveur Supabase pour voir les erreurs potentielles du trigger.');
      }
    } else {
      console.error('❌ Erreur lors de la vérification des buckets:', bucketsResponse);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du processus:', error);
  }
}

// Exécuter la fonction principale
insertManualBucket(); 