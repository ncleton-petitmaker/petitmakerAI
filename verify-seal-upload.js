import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Charger les variables d'environnement
config();

// Récupérer les informations Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySealUpload() {
  console.log('🔍 Vérification du processus d\'upload et d\'enregistrement du tampon d\'organisation...');

  try {
    // Étape 1: Vérifier que les colonnes existent
    console.log('🔍 Vérification des colonnes dans la table settings...');
    const { data: columnsData, error: columnsError } = await supabase.rpc('execute_sql', {
      sql: `
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'settings'
        AND column_name IN ('organization_seal_path', 'organization_seal_url');
      `
    });
    
    if (columnsError) {
      console.error('❌ Erreur lors de la vérification des colonnes:', columnsError);
      return;
    }
    
    if (!columnsData || columnsData.length === 0) {
      console.error('❌ Les colonnes organization_seal_path et organization_seal_url n\'existent pas.');
      console.log('⚠️ Veuillez exécuter le script add-settings-columns.js pour ajouter les colonnes.');
      return;
    }
    
    console.log('✅ Colonnes trouvées:', columnsData);
    
    // Étape 2: Vérifier que le bucket existe
    console.log('🔍 Vérification du bucket organization-seals...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Erreur lors de la vérification des buckets:', bucketsError);
      return;
    }
    
    const bucketExists = buckets.some(b => b.name === 'organization-seals');
    if (!bucketExists) {
      console.error('❌ Le bucket organization-seals n\'existe pas.');
      console.log('⚠️ Veuillez exécuter le script check-and-update-policies.js pour créer le bucket.');
      return;
    }
    
    console.log('✅ Le bucket organization-seals existe.');
    
    // Étape 3: Vérifier les fichiers existants dans le bucket
    console.log('🔍 Vérification des fichiers dans le bucket organization-seals...');
    const { data: files, error: filesError } = await supabase.storage
      .from('organization-seals')
      .list();
      
    if (filesError) {
      console.error('❌ Erreur lors de la liste des fichiers:', filesError);
      return;
    }
    
    console.log('✅ Fichiers trouvés dans le bucket:', files);
    
    // Étape 4: Vérifier les paramètres actuels
    console.log('🔍 Vérification des paramètres actuels...');
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('organization_seal_path, organization_seal_url')
      .limit(1);
      
    if (settingsError) {
      console.error('❌ Erreur lors de la récupération des paramètres:', settingsError);
      return;
    }
    
    console.log('✅ Paramètres actuels:', settings);
    
    // Étape 5: Tester une mise à jour simulée (sans uploader de fichier)
    console.log('🔍 Test de mise à jour des paramètres...');
    
    // Utiliser un chemin et une URL existants s'ils sont disponibles
    const existingFile = files && files.length > 0 ? files[0] : null;
    let testPath = null;
    let testUrl = null;
    
    if (existingFile) {
      testPath = existingFile.name;
      const { data: urlData } = await supabase.storage
        .from('organization-seals')
        .getPublicUrl(testPath);
        
      testUrl = urlData.publicUrl;
      
      console.log('✅ Utilisation du fichier existant:', {
        path: testPath,
        url: testUrl
      });
    } else {
      // Valeurs factices pour le test
      testPath = 'test_seal_' + Date.now() + '.png';
      testUrl = `https://efgirjtbuzljtzpuwsue.supabase.co/storage/v1/object/public/organization-seals/${testPath}`;
      
      console.log('✅ Utilisation de valeurs factices:', {
        path: testPath,
        url: testUrl
      });
    }
    
    // Tenter la mise à jour
    const { error: updateError } = await supabase
      .from('settings')
      .update({
        organization_seal_path: testPath,
        organization_seal_url: testUrl
      })
      .eq('id', 1);
      
    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour des paramètres:', updateError);
      
      // Vérifier si c'est un problème de colonne
      if (updateError.message.includes('column') || updateError.message.includes('field')) {
        console.error('⚠️ Les colonnes semblent exister dans le schéma mais ne sont pas accessibles.');
        console.log('⚠️ Essayez de redémarrer l\'application et/ou de rafraîchir le cache du schéma de Supabase.');
      }
    } else {
      console.log('✅ Mise à jour des paramètres réussie!');
      
      // Vérifier que la mise à jour a bien été effectuée
      const { data: verifySettings } = await supabase
        .from('settings')
        .select('organization_seal_path, organization_seal_url')
        .limit(1);
        
      console.log('✅ Paramètres après mise à jour:', verifySettings);
    }
    
    console.log('\n📋 RÉSUMÉ');
    console.log('1. Vérification des colonnes dans la table settings');
    console.log('2. Vérification du bucket organization-seals');
    console.log('3. Vérification des fichiers existants dans le bucket');
    console.log('4. Vérification des paramètres actuels');
    console.log('5. Test de mise à jour des paramètres');
    
    console.log('\n👉 Essayez maintenant d\'uploader et d\'enregistrer un tampon d\'organisation dans l\'interface utilisateur.');
  } catch (error) {
    console.error('❌ Exception lors de la vérification:', error);
  }
}

// Exécuter la fonction
verifySealUpload().catch(error => {
  console.error('❌ Erreur fatale:', error);
}); 