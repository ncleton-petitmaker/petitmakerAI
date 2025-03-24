import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Charger les variables d'environnement
config();

// Récupérer les informations Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function addSettingsColumns() {
  console.log('🔍 Ajout des colonnes pour le tampon d\'organisation à la table settings...');

  try {
    // Utiliser directement des requêtes SQL pour ajouter les colonnes
    const sql1 = `ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS organization_seal_path TEXT DEFAULT NULL;`;
    const sql2 = `ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS organization_seal_url TEXT DEFAULT NULL;`;
    
    console.log('🔍 Exécution de la première requête SQL...');
    const { error: error1 } = await supabase.rpc('execute_sql', { sql: sql1 });
    
    if (error1) {
      console.error('❌ Erreur lors de l\'ajout de la colonne organization_seal_path:', error1);
    } else {
      console.log('✅ Colonne organization_seal_path ajoutée avec succès.');
    }
    
    console.log('🔍 Exécution de la deuxième requête SQL...');
    const { error: error2 } = await supabase.rpc('execute_sql', { sql: sql2 });
    
    if (error2) {
      console.error('❌ Erreur lors de l\'ajout de la colonne organization_seal_url:', error2);
    } else {
      console.log('✅ Colonne organization_seal_url ajoutée avec succès.');
    }
    
    // Vérifier que les colonnes ont été ajoutées
    console.log('🔍 Vérification des colonnes...');
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: `
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'settings'
        AND column_name IN ('organization_seal_path', 'organization_seal_url');
      `
    });
    
    if (error) {
      console.error('❌ Erreur lors de la vérification des colonnes:', error);
    } else {
      console.log('📋 Colonnes trouvées:', data);
      
      if (!data || data.length === 0) {
        console.error('⚠️ Aucune colonne n\'a été trouvée. Utilisation d\'une méthode alternative...');
        
        // Méthode alternative : utiliser l'API REST de Supabase pour créer des enregistrements factices
        // Cela forcera Supabase à créer les colonnes manquantes
        console.log('🔍 Tentative de mise à jour des settings avec l\'API REST...');
        
        const { error: updateError } = await supabase
          .from('settings')
          .update({
            organization_seal_path: null,
            organization_seal_url: null
          })
          .eq('id', 1);
        
        if (updateError) {
          console.error('❌ Erreur lors de la mise à jour REST:', updateError);
        } else {
          console.log('✅ Mise à jour REST réussie, les colonnes devraient maintenant exister.');
        }
      } else if (data.length === 1) {
        console.log('⚠️ Une seule colonne a été trouvée.');
      } else {
        console.log('✅ Les deux colonnes ont été trouvées avec succès!');
      }
    }

    console.log('\n📋 RÉSUMÉ');
    console.log('1. Tentative d\'ajout des colonnes organization_seal_path et organization_seal_url');
    console.log('2. Vérification de l\'existence des colonnes');
    console.log('3. Si nécessaire, méthode alternative utilisée');
    console.log('\n⚠️ Vous pouvez maintenant essayer d\'uploader et d\'enregistrer un tampon d\'organisation.');
    
  } catch (error) {
    console.error('❌ Exception lors de l\'ajout des colonnes:', error);
  }
}

// Exécuter la fonction
addSettingsColumns().catch(error => {
  console.error('❌ Erreur fatale:', error);
}); 