// Script pour appeler la fonction RPC create_bucket_organization_seals
// Cette fonction a été créée comme SECURITY DEFINER dans Supabase
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
console.log('🔍 Utilisation de la clé de service pour l\'appel RPC');

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

// Fonction principale pour appeler la fonction RPC
async function callRPCFunction() {
  try {
    console.log('🔍 Vérification des buckets existants avant l\'appel RPC...');
    
    // Liste des buckets existants avant
    const listBeforeResponse = await makeRequest('GET', '/storage/v1/bucket');
    
    if (listBeforeResponse.statusCode === 200) {
      const bucketsBefore = listBeforeResponse.data;
      console.log('📋 Buckets existants avant:', bucketsBefore.map(b => b.name));
      
      // Vérifier si le bucket existe déjà
      const bucketExists = bucketsBefore.some(b => b.name === 'organization-seals');
      console.log(`🔍 Le bucket "organization-seals" existe déjà: ${bucketExists}`);
      
      if (bucketExists) {
        console.log('✅ Le bucket existe déjà, pas besoin de le créer');
        return;
      }
    } else {
      console.log('⚠️ Impossible de récupérer la liste des buckets:', listBeforeResponse);
    }
    
    console.log('🔍 Appel de la fonction RPC create_bucket_organization_seals...');
    
    // Appeler la fonction RPC
    const rpcResponse = await makeRequest('POST', '/rest/v1/rpc/create_bucket_organization_seals');
    
    if (rpcResponse.statusCode === 200) {
      console.log('✅ Réponse de la fonction RPC:', rpcResponse.data);
      
      if (rpcResponse.data.success) {
        console.log('✅ La fonction RPC a créé le bucket avec succès!');
      } else {
        console.log('⚠️ La fonction RPC a rencontré un problème:', rpcResponse.data.message);
      }
    } else {
      console.error('❌ Erreur lors de l\'appel RPC:', rpcResponse);
    }
    
    // Vérifier les buckets après l'appel RPC
    console.log('🔍 Vérification des buckets après l\'appel RPC...');
    
    const listAfterResponse = await makeRequest('GET', '/storage/v1/bucket');
    
    if (listAfterResponse.statusCode === 200) {
      const bucketsAfter = listAfterResponse.data;
      console.log('📋 Buckets existants après:', bucketsAfter.map(b => b.name));
      
      if (bucketsAfter.some(b => b.name === 'organization-seals')) {
        console.log('✅ Le bucket "organization-seals" a été créé avec succès!');
      } else {
        console.log('⚠️ Le bucket "organization-seals" n\'a pas été créé.');
      }
    } else {
      console.error('❌ Erreur lors de la vérification des buckets après:', listAfterResponse);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du processus:', error);
  }
}

// Exécuter la fonction principale
callRPCFunction(); 