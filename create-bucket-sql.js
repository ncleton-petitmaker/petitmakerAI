// Script pour créer le bucket "organization-seals" en exécutant du SQL directement via pg
// Cette approche contourne complètement l'API Supabase
import { config } from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

// Charger les variables d'environnement
config();

// Récupérer les variables d'environnement pour la connexion
const supabaseUrl = process.env.SUPABASE_URL || 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';
const pgPassword = process.env.POSTGRES_PASSWORD;
const pgHost = process.env.POSTGRES_HOST || supabaseUrl.replace('https://', '').replace('.supabase.co', '.supabase.co:5432');
const pgUser = process.env.POSTGRES_USER || 'postgres';
const pgDatabase = process.env.POSTGRES_DB || 'postgres';

console.log('🔍 Tentative de connexion directe à la base de données PostgreSQL...');
console.log('🔍 Hôte:', pgHost);
console.log('🔍 Utilisateur:', pgUser);
console.log('🔍 Base de données:', pgDatabase);

// Si aucun mot de passe n'est fourni, on essaie d'extraire une partie de la clé Supabase
let password = pgPassword;
if (!password && supabaseKey) {
  // Note: Cette logique est spéculative et peut ne pas fonctionner
  // La clé Supabase n'est pas nécessairement liée au mot de passe PostgreSQL
  console.log('⚠️ Aucun mot de passe PostgreSQL fourni. Tentative de dérivation depuis la clé Supabase.');
  const parts = supabaseKey.split('.');
  if (parts.length > 1) {
    password = parts[1].substring(0, 16);
  }
}

if (!password) {
  console.error('❌ Mot de passe PostgreSQL requis. Veuillez définir POSTGRES_PASSWORD dans .env');
  process.exit(1);
}

// Configuration de la connexion PostgreSQL
const pool = new Pool({
  host: pgHost,
  user: pgUser,
  password: password,
  database: pgDatabase,
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

// Fonction pour vérifier si le bucket existe
async function checkBucketExists() {
  const client = await pool.connect();
  try {
    console.log('🔍 Vérification de l\'existence du bucket "organization-seals"...');
    
    const result = await client.query(`
      SELECT * FROM storage.buckets 
      WHERE name = 'organization-seals'
    `);
    
    const exists = result.rows.length > 0;
    console.log(`🔍 Le bucket "organization-seals" ${exists ? 'existe' : 'n\'existe pas'}`);
    return exists;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du bucket:', error);
    return false;
  } finally {
    client.release();
  }
}

// Fonction pour créer le bucket
async function createBucket() {
  const client = await pool.connect();
  try {
    // Vérifier si le bucket existe déjà
    const exists = await checkBucketExists();
    if (exists) {
      console.log('✅ Le bucket existe déjà, création des politiques uniquement...');
    } else {
      console.log('🔍 Création du bucket "organization-seals"...');
      
      // Créer le bucket
      await client.query(`
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('organization-seals', 'organization-seals', true)
      `);
      
      console.log('✅ Bucket "organization-seals" créé avec succès!');
    }
    
    // Définir les politiques d'accès
    console.log('🔍 Configuration des politiques d\'accès...');
    
    // Supprimer les politiques existantes pour éviter les doublons
    await client.query(`
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
      END $$;
    `);
    
    // Créer les nouvelles politiques
    await client.query(`
      -- Politique pour permettre à tout le monde de voir les tampons
      CREATE POLICY "Tout le monde peut voir les tampons"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'organization-seals');
    `);
    
    await client.query(`
      -- Politique pour permettre aux utilisateurs authentifiés d'ajouter des tampons
      CREATE POLICY "Les utilisateurs peuvent ajouter des tampons"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'organization-seals' AND auth.role() = 'authenticated');
    `);
    
    await client.query(`
      -- Politique pour permettre aux utilisateurs de modifier leurs propres tampons
      CREATE POLICY "Les utilisateurs peuvent modifier leurs tampons"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'organization-seals' AND auth.role() = 'authenticated');
    `);
    
    await client.query(`
      -- Politique pour permettre aux utilisateurs de supprimer leurs propres tampons
      CREATE POLICY "Les utilisateurs peuvent supprimer leurs tampons"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'organization-seals' AND auth.role() = 'authenticated');
    `);
    
    console.log('✅ Politiques d\'accès configurées avec succès!');
    
    // Vérifier que tout a fonctionné
    const bucketExists = await checkBucketExists();
    if (bucketExists) {
      console.log('✅ Bucket "organization-seals" créé et configuré avec succès!');
      console.log('✅ Vous pouvez maintenant uploader des tampons dans ce bucket.');
    } else {
      console.error('❌ Problème lors de la création du bucket. Veuillez vérifier les erreurs.');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la création du bucket ou des politiques:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Exécuter la fonction principale
createBucket().catch(error => {
  console.error('❌ Erreur fatale:', error);
  pool.end();
}); 