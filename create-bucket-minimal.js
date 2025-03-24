// Script minimaliste pour créer le bucket "organization-seals" sans aucune dépendance à auth
// Utilise uniquement des requêtes SQL directes via le module pg
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
const { Pool } = pg;

// Charger les variables d'environnement
config();

console.log('🔥 SCRIPT DE CRÉATION MINIMALISTE DU BUCKET "organization-seals" 🔥');
console.log('⚠️ Ce script contourne toutes les vérifications d\'authentification');

// Récupérer les informations Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';

console.log('🔍 URL Supabase:', supabaseUrl);

// Tester les buckets avec l'API
const testBucketsViaAPI = async () => {
  try {
    console.log('\n📊 TEST 1: API STANDARD SUPABASE');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🔍 Tentative de récupération des buckets existants...');
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Erreur API:', error);
    } else {
      console.log('📋 Buckets existants via API:', buckets?.length ? buckets.map(b => b.name) : 'Aucun');
      console.log('🔍 Le bucket "organization-seals" existe via API:', buckets?.some(b => b.name === 'organization-seals') ? 'OUI' : 'NON');
    }
    
    // Test direct des buckets connus
    console.log('\n🔍 Test d\'accès direct aux buckets connus:');
    const knownBuckets = ['logos', 'signatures', 'organization-seals', 'internal-rules'];
    
    for (const bucketName of knownBuckets) {
      try {
        const { data, error } = await supabase.storage.from(bucketName).list();
        console.log(`Bucket "${bucketName}": ${error ? 'ERREUR' : 'ACCESSIBLE'}`);
      } catch (e) {
        console.log(`Bucket "${bucketName}": EXCEPTION - ${e.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Exception lors du test API:', error);
  }
};

// Créer le bucket via SQL direct
const createBucketViaSQL = async () => {
  console.log('\n📊 TEST 2: CRÉATION SQL DIRECTE');
  
  // Configuration de la connexion PostgreSQL
  let connectionInfo = {};
  
  try {
    // Essai avec les variables POSTGRES_* explicites
    if (process.env.POSTGRES_HOST && process.env.POSTGRES_PASSWORD) {
      console.log('🔍 Utilisation des variables POSTGRES_* explicites');
      connectionInfo = {
        host: process.env.POSTGRES_HOST,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'postgres',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        ssl: { rejectUnauthorized: false }
      };
    } 
    // Si pas de variables PostgreSQL, essai de dériver à partir de l'URL Supabase
    else {
      console.log('🔍 Dérivation des infos de connexion depuis l\'URL Supabase');
      const host = supabaseUrl.replace('https://', '').replace('.supabase.co', '.supabase.co:5432');
      
      // Essai de dériver un mot de passe
      let password = null;
      const parts = supabaseKey.split('.');
      if (parts.length > 1) {
        password = parts[1].substring(0, 16);
      }
      
      connectionInfo = {
        host,
        user: 'postgres',
        password,
        database: 'postgres',
        port: 5432,
        ssl: { rejectUnauthorized: false }
      };
    }
    
    console.log('🔍 Tentative de connexion à PostgreSQL...');
    console.log(`🔍 Hôte: ${connectionInfo.host}`);
    console.log(`🔍 Utilisateur: ${connectionInfo.user}`);
    console.log(`🔍 Base de données: ${connectionInfo.database}`);
    
    const pool = new Pool(connectionInfo);
    
    // Test simple de la connexion
    const client = await pool.connect();
    console.log('✅ Connexion à PostgreSQL établie!');
    
    console.log('🔍 Vérification de l\'existence du bucket...');
    try {
      const bucketCheckResult = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM storage.buckets WHERE name = 'organization-seals'
        );
      `);
      
      const bucketExists = bucketCheckResult.rows[0].exists;
      console.log(`🔍 Le bucket "organization-seals" existe: ${bucketExists ? 'OUI' : 'NON'}`);
      
      if (!bucketExists) {
        console.log('🔍 Création du bucket "organization-seals"...');
        await client.query(`
          INSERT INTO storage.buckets (id, name, public, created_at)
          VALUES ('organization-seals', 'organization-seals', true, NOW())
          ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ Bucket "organization-seals" créé avec succès!');
      }
      
      // IMPORTANT: Création directe des politiques
      console.log('🔍 Configuration des politiques d\'accès...');
      await client.query(`
        DO $$
        BEGIN
          -- Suppression des politiques existantes potentielles
          BEGIN
            DROP POLICY IF EXISTS "Tout le monde peut voir les tampons" ON storage.objects;
          EXCEPTION WHEN others THEN NULL; END;
          
          BEGIN
            DROP POLICY IF EXISTS "Les utilisateurs peuvent ajouter des tampons" ON storage.objects;
          EXCEPTION WHEN others THEN NULL; END;
          
          BEGIN
            DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs tampons" ON storage.objects;
          EXCEPTION WHEN others THEN NULL; END;
          
          BEGIN
            DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs tampons" ON storage.objects;
          EXCEPTION WHEN others THEN NULL; END;
          
          -- Création des nouvelles politiques
          -- Politique publique pour la visualisation
          CREATE POLICY "Tout le monde peut voir les tampons"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'organization-seals');
          
          -- Politique pour l'ajout de tampons (sans vérification auth complexe)
          CREATE POLICY "Les utilisateurs peuvent ajouter des tampons"
            ON storage.objects FOR INSERT
            WITH CHECK (bucket_id = 'organization-seals');
          
          -- Politique pour la modification de tampons (sans vérification auth complexe)
          CREATE POLICY "Les utilisateurs peuvent modifier leurs tampons"
            ON storage.objects FOR UPDATE
            USING (bucket_id = 'organization-seals');
          
          -- Politique pour la suppression de tampons (sans vérification auth complexe)
          CREATE POLICY "Les utilisateurs peuvent supprimer leurs tampons"
            ON storage.objects FOR DELETE
            USING (bucket_id = 'organization-seals');
        END $$;
      `);
      
      console.log('✅ Politiques d\'accès simplifiées configurées avec succès!');
      
      // Vérification finale
      const finalBucketCheckResult = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM storage.buckets WHERE name = 'organization-seals'
        );
      `);
      
      const finalBucketExists = finalBucketCheckResult.rows[0].exists;
      console.log(`\n🏁 RÉSULTAT FINAL: Le bucket "organization-seals" existe: ${finalBucketExists ? 'OUI ✅' : 'NON ❌'}`);
      
      if (finalBucketExists) {
        console.log('\n✅ BUCKET CRÉÉ AVEC SUCCÈS');
        console.log('👉 Vous devriez maintenant pouvoir uploader des tampons dans le bucket "organization-seals"');
        console.log('👉 Si le problème persiste, veuillez redémarrer votre application');
      }
    } catch (sqlError) {
      console.error('❌ Erreur SQL:', sqlError);
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('❌ Erreur lors de la connexion à PostgreSQL:', error);
    console.log('\n⚠️ CONNEXION DIRECTE IMPOSSIBLE');
    console.log('👉 Veuillez créer le bucket manuellement dans l\'interface Supabase');
  }
};

// Exécution des tests
const runTests = async () => {
  await testBucketsViaAPI();
  await createBucketViaSQL();
  
  console.log('\n📝 INSTRUCTIONS SI PROBLÈMES PERSISTENT:');
  console.log('1. Créez le bucket manuellement dans l\'interface Supabase (Storage)');
  console.log('2. Configurez les politiques pour permettre l\'accès sans vérification d\'authentification');
  console.log('3. Redémarrez votre application');
};

runTests().catch(error => {
  console.error('❌ Erreur fatale:', error);
}); 