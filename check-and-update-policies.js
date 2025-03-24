import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Charger les variables d'environnement
config();

// Récupérer les informations Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndUpdatePolicies() {
  console.log('🔍 Vérification des politiques du bucket "organization-seals"...');

  // Vérifier si le bucket existe
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error('❌ Erreur lors de la récupération des buckets:', bucketsError);
    return;
  }

  const bucketExists = buckets.some(b => b.name === 'organization-seals');
  if (!bucketExists) {
    console.error('❌ Le bucket "organization-seals" n\'existe pas. Veuillez le créer d\'abord.');
    return;
  }

  console.log('✅ Le bucket "organization-seals" existe.');

  // Vérifier l'accès au bucket
  try {
    const { data: filesList, error: listError } = await supabase.storage
      .from('organization-seals')
      .list();

    if (listError) {
      console.error('❌ Erreur lors de l\'accès au bucket:', listError);
    } else {
      console.log(`✅ Accès au bucket réussi. ${filesList.length} fichiers trouvés.`);
      filesList.forEach(file => {
        console.log(`- ${file.name} (${Math.round(file.metadata.size / 1024)} KB)`);
      });
    }
  } catch (error) {
    console.error('❌ Exception lors de l\'accès au bucket:', error);
  }

  // Mettre à jour les politiques du bucket
  try {
    console.log('🔍 Mise à jour des politiques du bucket...');
    const { error: rpcError } = await supabase.rpc('execute_sql', {
      sql: `
        -- Supprimer les politiques existantes potentielles
        DROP POLICY IF EXISTS "Tout le monde peut voir les tampons" ON storage.objects;
        DROP POLICY IF EXISTS "Les utilisateurs peuvent ajouter des tampons" ON storage.objects;
        DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs tampons" ON storage.objects;
        DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs tampons" ON storage.objects;
        
        -- Création des nouvelles politiques ultra-permissives
        -- Politique pour permettre à tout le monde de voir les tampons
        CREATE POLICY "Tout le monde peut voir les tampons"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'organization-seals');
        
        -- Politique pour permettre à tout le monde d'ajouter des tampons
        CREATE POLICY "Les utilisateurs peuvent ajouter des tampons"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'organization-seals');
        
        -- Politique pour permettre à tout le monde de modifier des tampons
        CREATE POLICY "Les utilisateurs peuvent modifier leurs tampons"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'organization-seals');
        
        -- Politique pour permettre à tout le monde de supprimer des tampons
        CREATE POLICY "Les utilisateurs peuvent supprimer leurs tampons"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'organization-seals');
        
        -- S'assurer que le bucket est public
        UPDATE storage.buckets
        SET public = true
        WHERE name = 'organization-seals';
      `
    });

    if (rpcError) {
      console.error('❌ Erreur lors de la mise à jour des politiques:', rpcError);
      
      // Tenter une méthode alternative
      console.log('🔍 Tentative avec une méthode alternative...');
      const { error: sqlError } = await supabase.from('rpc').select('*').rpc('execute_sql', {
        sql: `
          DO $$
          BEGIN
            -- Supprimer les politiques existantes potentielles
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
            
            -- Création des nouvelles politiques ultra-permissives
            -- Politique pour permettre à tout le monde de voir les tampons
            CREATE POLICY "Tout le monde peut voir les tampons"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'organization-seals');
            
            -- Politique pour permettre à tout le monde d'ajouter des tampons
            CREATE POLICY "Les utilisateurs peuvent ajouter des tampons"
            ON storage.objects FOR INSERT
            WITH CHECK (bucket_id = 'organization-seals');
            
            -- Politique pour permettre à tout le monde de modifier des tampons
            CREATE POLICY "Les utilisateurs peuvent modifier leurs tampons"
            ON storage.objects FOR UPDATE
            USING (bucket_id = 'organization-seals');
            
            -- Politique pour permettre à tout le monde de supprimer des tampons
            CREATE POLICY "Les utilisateurs peuvent supprimer leurs tampons"
            ON storage.objects FOR DELETE
            USING (bucket_id = 'organization-seals');
            
            -- S'assurer que le bucket est public
            UPDATE storage.buckets
            SET public = true
            WHERE name = 'organization-seals';
          END $$;
        `
      });
      
      if (sqlError) {
        console.error('❌ Échec de la méthode alternative:', sqlError);
      } else {
        console.log('✅ Politiques mises à jour avec succès (méthode alternative)');
      }
    } else {
      console.log('✅ Politiques mises à jour avec succès');
    }
  } catch (error) {
    console.error('❌ Exception lors de la mise à jour des politiques:', error);
  }

  console.log('🔍 Vérification finale du bucket...');
  // Vérifier que le bucket est bien public
  try {
    const { data: bucket, error: bucketError } = await supabase.rpc('execute_sql', {
      sql: `SELECT public FROM storage.buckets WHERE name = 'organization-seals';`
    });

    if (bucketError) {
      console.error('❌ Erreur lors de la vérification du statut public:', bucketError);
    } else {
      console.log(`✅ Statut public du bucket: ${bucket && bucket[0] ? bucket[0].public : 'inconnu'}`);
    }
  } catch (error) {
    console.error('❌ Exception lors de la vérification du statut public:', error);
  }

  console.log('\n📋 INSTRUCTIONS SUPPLÉMENTAIRES:');
  console.log('1. Supprimez les anciens tampons contenant des IDs utilisateurs dans le chemin');
  console.log('2. Uploadez à nouveau votre tampon d\'organisation avec un nom simplifié');
  console.log('3. Rafraîchissez votre application et vérifiez que le tampon s\'affiche correctement\n');
}

// Exécuter la fonction
checkAndUpdatePolicies().catch(error => {
  console.error('❌ Erreur fatale:', error);
}); 