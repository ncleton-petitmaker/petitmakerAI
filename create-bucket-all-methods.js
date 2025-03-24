// Script pour créer le bucket "organization-seals" en utilisant toutes les méthodes disponibles
// Ce script essaie plusieurs approches en séquence jusqu'à ce qu'une réussisse
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import https from 'https';
import fs from 'fs';

// Charger les variables d'environnement
config();

// URL et clé Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';

// Client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

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

// Vérifie si le bucket existe déjà
async function checkBucketExists() {
  try {
    console.log('🔍 Vérification des buckets existants...');
    
    // Méthode 1: Utilisation du SDK
    try {
      const { data: bucketsSDK, error: errorSDK } = await supabase.storage.listBuckets();
      if (errorSDK) {
        console.error('⚠️ Erreur lors de la récupération des buckets avec le SDK:', errorSDK);
      } else {
        console.log('📋 Buckets existants (SDK):', bucketsSDK.map(b => b.name));
        if (bucketsSDK.some(b => b.name === 'organization-seals')) {
          console.log('✅ Le bucket "organization-seals" existe déjà (détecté par SDK)');
          return true;
        }
      }
    } catch (sdkError) {
      console.error('⚠️ Exception lors de l\'utilisation du SDK:', sdkError);
    }
    
    // Méthode 2: Requête HTTP directe
    try {
      const listResponse = await makeRequest('GET', '/storage/v1/bucket');
      if (listResponse.statusCode === 200) {
        const buckets = listResponse.data;
        console.log('📋 Buckets existants (HTTP):', buckets.map(b => b.name));
        if (buckets.some(b => b.name === 'organization-seals')) {
          console.log('✅ Le bucket "organization-seals" existe déjà (détecté par HTTP)');
          return true;
        }
      } else {
        console.error('⚠️ Erreur lors de la récupération des buckets par HTTP:', listResponse);
      }
    } catch (httpError) {
      console.error('⚠️ Exception lors de la requête HTTP:', httpError);
    }
    
    // Méthode 3: Vérification directe du bucket spécifique
    try {
      const getBucketResponse = await makeRequest('GET', '/storage/v1/bucket/organization-seals');
      if (getBucketResponse.statusCode === 200) {
        console.log('✅ Le bucket "organization-seals" existe déjà (détecté par requête directe)');
        return true;
      }
    } catch (directError) {
      console.error('⚠️ Exception lors de la vérification directe:', directError);
    }
    
    console.log('🔍 Le bucket "organization-seals" n\'existe pas encore');
    return false;
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des buckets:', error);
    return false;
  }
}

// Méthode 1: Création via SDK Supabase
async function createBucketViaSDK() {
  try {
    console.log('🔍 Tentative de création du bucket via SDK Supabase...');
    
    const { data, error } = await supabase.storage.createBucket('organization-seals', {
      public: true,
      fileSizeLimit: 5242880 // 5MB en octets
    });
    
    if (error) {
      console.error('❌ Erreur lors de la création du bucket via SDK:', error);
      return false;
    }
    
    console.log('✅ Bucket "organization-seals" créé avec succès via SDK!', data);
    return true;
  } catch (error) {
    console.error('❌ Exception lors de la création du bucket via SDK:', error);
    return false;
  }
}

// Méthode 2: Création via HTTP direct
async function createBucketViaHTTP() {
  try {
    console.log('🔍 Tentative de création du bucket via HTTP direct...');
    
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
      console.error('❌ Erreur lors de la création du bucket via HTTP:', createResponse);
      return false;
    }
    
    console.log('✅ Bucket "organization-seals" créé avec succès via HTTP!', createResponse.data);
    return true;
  } catch (error) {
    console.error('❌ Exception lors de la création du bucket via HTTP:', error);
    return false;
  }
}

// Méthode 3: Appel de la fonction RPC
async function createBucketViaRPC() {
  try {
    console.log('🔍 Tentative de création du bucket via appel RPC...');
    
    // Appeler la fonction RPC
    const rpcResponse = await makeRequest('POST', '/rest/v1/rpc/create_bucket_organization_seals');
    
    if (rpcResponse.statusCode !== 200) {
      console.error('❌ Erreur lors de l\'appel RPC:', rpcResponse);
      return false;
    }
    
    console.log('✅ Résultat de l\'appel RPC:', rpcResponse.data);
    
    if (rpcResponse.data && rpcResponse.data.success) {
      console.log('✅ Bucket "organization-seals" créé avec succès via RPC!');
      return true;
    } else {
      console.warn('⚠️ La fonction RPC a échoué:', rpcResponse.data ? rpcResponse.data.message : 'Réponse invalide');
      return false;
    }
  } catch (error) {
    console.error('❌ Exception lors de l\'appel RPC:', error);
    return false;
  }
}

// Méthode 4: Insertion dans la table storage_buckets_manual
async function createBucketViaManualTable() {
  try {
    console.log('🔍 Tentative de création du bucket via table storage_buckets_manual...');
    
    // Vérifier si la table existe
    const tableCheckResponse = await makeRequest('GET', '/rest/v1/storage_buckets_manual?limit=1');
    
    if (tableCheckResponse.statusCode !== 200) {
      console.warn('⚠️ La table storage_buckets_manual n\'existe pas ou n\'est pas accessible');
      return false;
    }
    
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
    
    if (insertResponse.statusCode !== 201) {
      console.error('❌ Erreur lors de l\'insertion dans storage_buckets_manual:', insertResponse);
      return false;
    }
    
    console.log('✅ Enregistrement inséré avec succès dans storage_buckets_manual:', insertResponse.data);
    console.log('⏳ Attente de 2 secondes pour laisser le trigger s\'exécuter...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Vérifier si le bucket a été créé
    if (await checkBucketExists()) {
      console.log('✅ Bucket "organization-seals" créé avec succès via table manuelle!');
      return true;
    } else {
      console.warn('⚠️ L\'insertion a réussi mais le bucket n\'a pas été créé automatiquement');
      return false;
    }
  } catch (error) {
    console.error('❌ Exception lors de la création via table manuelle:', error);
    return false;
  }
}

// Méthode 5: Création des politiques d'accès
async function createPolicies() {
  try {
    console.log('🔍 Création des politiques d\'accès pour le bucket "organization-seals"...');
    
    // Script SQL pour les politiques
    const sqlScript = `
      -- Créer les politiques pour le bucket organization-seals
      -- Politique pour permettre à tout le monde de voir les tampons
      DO $$
      BEGIN
        -- Suppression des politiques existantes si elles existent
        BEGIN
          DROP POLICY IF EXISTS "Tout le monde peut voir les tampons" ON storage.objects;
        EXCEPTION WHEN others THEN
          -- Ignorer les erreurs
        END;
        
        BEGIN
          DROP POLICY IF EXISTS "Les utilisateurs peuvent ajouter des tampons" ON storage.objects;
        EXCEPTION WHEN others THEN
          -- Ignorer les erreurs
        END;
        
        BEGIN
          DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs tampons" ON storage.objects;
        EXCEPTION WHEN others THEN
          -- Ignorer les erreurs
        END;
        
        BEGIN
          DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs tampons" ON storage.objects;
        EXCEPTION WHEN others THEN
          -- Ignorer les erreurs
        END;
        
        -- Créer les nouvelles politiques
        CREATE POLICY "Tout le monde peut voir les tampons"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'organization-seals');
        
        CREATE POLICY "Les utilisateurs peuvent ajouter des tampons"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'organization-seals' AND auth.role() = 'authenticated');
        
        CREATE POLICY "Les utilisateurs peuvent modifier leurs tampons"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'organization-seals' AND auth.role() = 'authenticated');
        
        CREATE POLICY "Les utilisateurs peuvent supprimer leurs tampons"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'organization-seals' AND auth.role() = 'authenticated');
      END $$;
    `;
    
    // Écrire le SQL dans un fichier
    fs.writeFileSync('all-methods-policies.sql', sqlScript);
    console.log('✅ Script SQL pour les politiques écrit dans all-methods-policies.sql');
    console.log('⚠️ Veuillez exécuter ce script SQL dans l\'interface SQL de Supabase pour configurer les politiques.');
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la création des politiques:', error);
    return false;
  }
}

// Fonction principale qui essaie toutes les méthodes
async function createBucketAllMethods() {
  try {
    console.log('🚀 Démarrage du processus de création du bucket "organization-seals"...');
    
    // Vérifier si le bucket existe déjà
    if (await checkBucketExists()) {
      console.log('✅ Le bucket existe déjà, création des politiques uniquement...');
      await createPolicies();
      return;
    }
    
    // Essayer la méthode 1
    console.log('\n📌 MÉTHODE 1: SDK SUPABASE');
    if (await createBucketViaSDK()) {
      console.log('✅ Méthode 1 réussie! Création des politiques...');
      await createPolicies();
      return;
    }
    
    // Essayer la méthode 2
    console.log('\n📌 MÉTHODE 2: HTTP DIRECT');
    if (await createBucketViaHTTP()) {
      console.log('✅ Méthode 2 réussie! Création des politiques...');
      await createPolicies();
      return;
    }
    
    // Essayer la méthode 3
    console.log('\n📌 MÉTHODE 3: FONCTION RPC');
    if (await createBucketViaRPC()) {
      console.log('✅ Méthode 3 réussie! Création des politiques...');
      await createPolicies();
      return;
    }
    
    // Essayer la méthode 4
    console.log('\n📌 MÉTHODE 4: TABLE MANUELLE AVEC TRIGGER');
    if (await createBucketViaManualTable()) {
      console.log('✅ Méthode 4 réussie! Création des politiques...');
      await createPolicies();
      return;
    }
    
    // Si toutes les méthodes ont échoué
    console.error('❌ Toutes les méthodes ont échoué. Voici les étapes manuelles à suivre:');
    console.error('1. Connectez-vous à l\'interface Supabase et naviguez vers "Storage"');
    console.error('2. Créez un nouveau bucket nommé "organization-seals"');
    console.error('3. Exécutez le script all-methods-policies.sql dans l\'éditeur SQL');
    
  } catch (error) {
    console.error('❌ Erreur générale lors du processus:', error);
  } finally {
    // Vérifier une dernière fois si le bucket existe
    const finalExists = await checkBucketExists();
    console.log(`\n🏁 Résultat final: Le bucket "organization-seals" ${finalExists ? 'existe' : 'n\'existe pas'}`);
    
    if (finalExists) {
      console.log('✅ Vous pouvez maintenant uploader des tampons dans le bucket "organization-seals"');
    }
  }
}

// Exécuter la fonction principale
createBucketAllMethods(); 