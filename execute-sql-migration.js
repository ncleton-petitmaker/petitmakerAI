import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Charger les variables d'environnement
config();

// Équivalent de __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Récupérer les informations Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSqlMigration() {
  console.log('🔍 Exécution de la migration SQL pour ajouter les colonnes de tampon...');

  // Essayer d'abord avec le script complet
  let sqlFilePath = path.join(__dirname, 'migrations', 'add_organization_seal_columns.sql');
  
  // Si le fichier n'existe pas, essayer avec le script simplifié
  if (!fs.existsSync(sqlFilePath)) {
    console.log(`⚠️ Le fichier SQL complet n'existe pas à ${sqlFilePath}`);
    sqlFilePath = path.join(__dirname, 'migrations', 'alter_settings_columns.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`❌ Aucun fichier SQL n'a été trouvé.`);
      
      // Utiliser une requête SQL en dur comme solution de secours
      console.log('🔍 Utilisation d\'une requête SQL en dur comme solution de secours...');
      
      const fallbackSql = `
        -- Version de secours pour ajouter les colonnes
        ALTER TABLE public.settings 
        ADD COLUMN IF NOT EXISTS organization_seal_path TEXT DEFAULT NULL;
        
        ALTER TABLE public.settings 
        ADD COLUMN IF NOT EXISTS organization_seal_url TEXT DEFAULT NULL;
      `;
      
      await executeQuery(fallbackSql);
      return;
    }
  }
  
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  console.log('📄 Contenu SQL à exécuter:', sqlContent);
  
  await executeQuery(sqlContent);
}

async function executeQuery(sql) {
  try {
    console.log('🔍 Exécution du script SQL...');
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: sql
    });

    if (error) {
      console.error('❌ Erreur lors de l\'exécution du script SQL:', error);
      
      // Tentative alternative avec des requêtes séparées
      console.log('🔍 Tentative alternative avec des requêtes séparées...');
      
      // Ajouter la colonne organization_seal_path
      const { error: pathError } = await supabase.rpc('execute_sql', {
        sql: `ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS organization_seal_path TEXT DEFAULT NULL;`
      });
      
      if (pathError) {
        console.error('❌ Erreur lors de l\'ajout de la colonne organization_seal_path:', pathError);
      } else {
        console.log('✅ Colonne organization_seal_path ajoutée avec succès.');
      }
      
      // Ajouter la colonne organization_seal_url
      const { error: urlError } = await supabase.rpc('execute_sql', {
        sql: `ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS organization_seal_url TEXT DEFAULT NULL;`
      });
      
      if (urlError) {
        console.error('❌ Erreur lors de l\'ajout de la colonne organization_seal_url:', urlError);
      } else {
        console.log('✅ Colonne organization_seal_url ajoutée avec succès.');
      }
    } else {
      console.log('✅ Script SQL exécuté avec succès!');
      console.log('📋 Résultat:', data);
    }
    
    // Vérifier que les colonnes existent maintenant
    console.log('🔍 Vérification finale des colonnes...');
    const { data: verifyData, error: verifyError } = await supabase.rpc('execute_sql', {
      sql: `
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'settings'
        AND column_name IN ('organization_seal_path', 'organization_seal_url');
      `
    });
    
    if (verifyError) {
      console.error('❌ Erreur lors de la vérification finale:', verifyError);
    } else {
      console.log('📋 Colonnes trouvées:', verifyData);
      
      if (!verifyData || verifyData.length === 0) {
        console.error('⚠️ Aucune des colonnes n\'a été trouvée. La migration a échoué.');
      } else if (verifyData.length === 1) {
        console.log('⚠️ Une seule colonne a été trouvée. La migration est partiellement réussie.');
      } else {
        console.log('✅ Les deux colonnes ont été trouvées. La migration est un succès!');
      }
    }
  } catch (error) {
    console.error('❌ Exception lors de l\'exécution de la migration:', error);
  }
}

// Exécuter la fonction
executeSqlMigration().catch(error => {
  console.error('❌ Erreur fatale:', error);
}); 