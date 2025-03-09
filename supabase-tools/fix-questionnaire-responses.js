import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  { auth: { persistSession: false } }
);

async function fixQuestionnaireResponses() {
  console.log('Début de la correction des réponses aux questionnaires...');

  try {
    // 1. Récupérer toutes les réponses
    const { data: responses, error: fetchError } = await supabase
      .from('questionnaire_responses')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;
    console.log(`Nombre initial de réponses: ${responses.length}`);

    // 2. Identifier les doublons
    const uniqueKeys = new Map();
    const duplicates = [];
    const toKeep = [];

    responses.forEach(response => {
      const key = `${response.user_id}:${response.type}:${response.template_id || 0}`;
      
      if (!uniqueKeys.has(key)) {
        uniqueKeys.set(key, response.id);
        toKeep.push(response.id);
      } else {
        duplicates.push(response.id);
      }
    });

    console.log(`Nombre de réponses uniques: ${toKeep.length}`);
    console.log(`Nombre de doublons à supprimer: ${duplicates.length}`);

    // 3. Supprimer les doublons
    if (duplicates.length > 0) {
      const { error: deleteError } = await supabase
        .from('questionnaire_responses')
        .delete()
        .in('id', duplicates);

      if (deleteError) throw deleteError;
      console.log('Doublons supprimés avec succès');
    }

    // 4. Vérifier le résultat final
    const { data: finalResponses, error: finalError } = await supabase
      .from('questionnaire_responses')
      .select('*');

    if (finalError) throw finalError;
    console.log(`Nombre final de réponses: ${finalResponses.length}`);

    // 5. Afficher les réponses restantes
    console.log('\nRéponses restantes:');
    finalResponses.forEach(response => {
      console.log(`ID: ${response.id}, User: ${response.user_id}, Type: ${response.type}, Template: ${response.template_id || 'N/A'}, Date: ${response.created_at}`);
    });

  } catch (error) {
    console.error('Erreur:', error);
  }
}

fixQuestionnaireResponses(); 