import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Charger les variables d'environnement
config();

// Récupérer les informations Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function addNeedStampColumn() {
  console.log('🔄 Début de l\'ajout de la colonne need_stamp...');

  try {
    // Étape 1: Vérifier si la colonne existe déjà
    console.log('🔍 Vérification si la colonne existe déjà...');
    const { data: columnExists, error: columnCheckError } = await supabase
      .from('documents')
      .select('need_stamp')
      .limit(1)
      .maybeSingle();
    
    if (!columnCheckError) {
      console.log('✅ La colonne need_stamp existe déjà:', columnExists);
      return;
    }
    
    console.log('🔍 La colonne need_stamp n\'existe pas encore, ajout en cours...');
    
    // Étape 2: Exécuter l'instruction ALTER TABLE pour ajouter la colonne
    const addColumnSQL = `
      ALTER TABLE public.documents 
      ADD COLUMN need_stamp BOOLEAN DEFAULT false;
    `;
    
    // Exécuter SQL directement via une requête POSTGRES nommée
    console.log('🔧 Ajout de la colonne need_stamp...');
    
    // Utiliser une RPC définie pour exécuter du SQL
    const { error: addColumnError } = await supabase.rpc('pg_execute', { 
      query: addColumnSQL 
    });
    
    if (addColumnError) {
      console.error('❌ Erreur lors de l\'ajout de la colonne:', addColumnError);
      
      // Si pg_execute n'existe pas, utilisons execute_sql à la place
      const { error: altError } = await supabase.rpc('execute_sql', { 
        sql: addColumnSQL
      });
      
      if (altError) {
        console.error('❌ Erreur alternative:', altError);
        throw new Error('Impossible d\'ajouter la colonne need_stamp');
      } else {
        console.log('✅ Colonne ajoutée avec succès en utilisant execute_sql');
      }
    } else {
      console.log('✅ Colonne ajoutée avec succès en utilisant pg_execute');
    }
    
    // Étape 3: Mettre à jour les documents de type "convention"
    console.log('🔧 Mise à jour des documents de type "convention"...');
    
    const updateResult = await supabase
      .from('documents')
      .update({ need_stamp: true })
      .eq('type', 'convention');
    
    if (updateResult.error) {
      console.error('❌ Erreur lors de la mise à jour des documents:', updateResult.error);
    } else {
      console.log('✅ Documents de type "convention" mis à jour avec succès');
    }
    
    // Étape 4: Vérifier que la colonne a été ajoutée
    console.log('🔍 Vérification finale...');
    
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('id, type, need_stamp')
      .limit(5);
    
    if (fetchError) {
      console.error('❌ Erreur lors de la vérification finale:', fetchError);
    } else {
      console.log('✅ Échantillon de documents après mise à jour:', documents);
    }
    
    console.log('🎉 Ajout de la colonne need_stamp terminé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de la colonne need_stamp:', error);
  }
}

// Exécuter la fonction
addNeedStampColumn(); 