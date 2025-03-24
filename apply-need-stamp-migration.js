import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Charger les variables d'environnement
config();

// Récupérer les informations Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Obtenir le chemin du fichier de migration
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationFilePath = path.join(__dirname, 'migrations', 'add_need_stamp_column.sql');

async function applyMigration() {
  console.log('🔄 Début de la migration pour ajouter la colonne need_stamp...');

  try {
    // Lire le contenu du fichier SQL
    const sqlContent = fs.readFileSync(migrationFilePath, 'utf8');
    console.log('📄 Fichier SQL de migration lu avec succès');
    
    // Exécuter la requête SQL via l'RPC execute_sql
    console.log('🔍 Exécution de la migration SQL...');
    const { data, error } = await supabase.rpc('execute_sql', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Erreur lors de l\'exécution de la migration SQL:', error);
      throw error;
    }
    
    console.log('✅ Migration SQL exécutée avec succès:', data);
    
    // Vérifier que la colonne a bien été ajoutée
    console.log('🔍 Vérification de l\'ajout de la colonne need_stamp...');
    const { data: columnCheckData, error: columnCheckError } = await supabase.rpc(
      'execute_sql',
      {
        sql: `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'documents'
            AND column_name = 'need_stamp';
        `
      }
    );
    
    if (columnCheckError) {
      console.error('❌ Erreur lors de la vérification de la colonne:', columnCheckError);
    } else {
      if (columnCheckData && columnCheckData.length > 0) {
        console.log('✅ Colonne need_stamp vérifiée avec succès:', columnCheckData);
      } else {
        console.error('⚠️ La colonne need_stamp n\'a pas été trouvée après la migration');
      }
    }
    
    // Vérifier les valeurs mises à jour (pour les conventions)
    console.log('🔍 Vérification des documents mis à jour...');
    const { data: documentsData, error: documentsError } = await supabase.rpc(
      'execute_sql',
      {
        sql: `
          SELECT type, need_stamp, COUNT(*) as count
          FROM public.documents
          GROUP BY type, need_stamp;
        `
      }
    );
    
    if (documentsError) {
      console.error('❌ Erreur lors de la vérification des documents:', documentsError);
    } else {
      console.log('✅ Résumé des documents par type et need_stamp:', documentsData);
    }

    console.log('🎉 Migration terminée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

// Exécuter la migration
applyMigration(); 