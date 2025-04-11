import { supabase } from '../../../supabase-tools/supabase-client';

/**
 * Créer un nouveau modèle d'email
 * @param {Object} templateData - Les données du modèle d'email
 * @returns {Promise} - La réponse de l'API
 */
export async function createEmailTemplate(templateData) {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .insert(templateData)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de la création du modèle d\'email:', error);
    return { success: false, error };
  }
}

/**
 * Récupérer un modèle d'email par son ID
 * @param {string} templateId - L'ID du modèle d'email
 * @returns {Promise} - La réponse de l'API
 */
export async function getEmailTemplate(templateId) {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*, files(*)')
      .eq('id', templateId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de la récupération du modèle d\'email:', error);
    return { success: false, error };
  }
}

/**
 * Mettre à jour un modèle d'email
 * @param {string} templateId - L'ID du modèle d'email
 * @param {Object} templateData - Les nouvelles données du modèle d'email
 * @returns {Promise} - La réponse de l'API
 */
export async function updateEmailTemplate(templateId, templateData) {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .update(templateData)
      .eq('id', templateId)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du modèle d\'email:', error);
    return { success: false, error };
  }
}

/**
 * Supprimer un modèle d'email
 * @param {string} templateId - L'ID du modèle d'email
 * @returns {Promise} - La réponse de l'API
 */
export async function deleteEmailTemplate(templateId) {
  try {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la suppression du modèle d\'email:', error);
    return { success: false, error };
  }
}

/**
 * Récupérer la liste de tous les modèles d'emails
 * @returns {Promise} - La réponse de l'API
 */
export async function listEmailTemplates() {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*, files(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de la récupération des modèles d\'email:', error);
    return { success: false, error };
  }
}

/**
 * Récupérer la liste de tous les modèles d'emails actifs
 * @returns {Promise} - La réponse de l'API
 */
export async function listActiveEmailTemplates() {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*, files(*)')
      .eq('status', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de la récupération des modèles d\'email actifs:', error);
    return { success: false, error };
  }
}

/**
 * Récupérer l'historique des emails envoyés pour un apprenant donné
 * @param {string} learnerId - L'ID de l'apprenant
 * @returns {Promise} - La réponse de l'API
 */
export async function getLearnerEmailsHistory(learnerId) {
  try {
    const { data, error } = await supabase
      .from('sent_emails')
      .select('*, email_templates(*), trainings(*)')
      .eq('learner_id', learnerId)
      .order('sent_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique des emails:', error);
    return { success: false, error };
  }
}

/**
 * Récupérer tous les rapports d'erreurs d'email
 * @returns {Promise} - La réponse de l'API
 */
export async function getEmailErrorReport() {
  try {
    const { data, error } = await supabase
      .from('email_error')
      .select('*, email_templates(*), user_profiles(id, first_name, last_name, email), trainings(id, title)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de la récupération des rapports d\'erreur:', error);
    return { success: false, error };
  }
}

/**
 * Envoyer un email de test
 * @param {string|null} templateId - L'ID du modèle d'email (peut être null pour les modèles en création)
 * @param {string} testEmail - L'adresse email de test
 * @param {Object|null} templateData - Les données du modèle pour les nouveaux modèles
 * @returns {Promise} - La réponse de l'API
 */
export async function sendTestEmail(templateId, testEmail, templateData = null) {
  try {
    console.log('Envoi email de test - Paramètres:', { templateId, testEmail, templateData });
    
    // Si nous avons un templateId, nous utilisons le modèle existant
    // Sinon, nous utilisons les données fournies pour simuler un modèle
    const payload = templateId 
      ? { 
          template_id: templateId, 
          test_email: testEmail,
          use_test_data: true  // Indique à l'API d'utiliser des données de test pour les variables
        }
      : { 
          test_email: testEmail,
          template_data: {
            ...templateData,
          },
          use_test_data: true  // Indique à l'API d'utiliser des données de test pour les variables
        };
    
    console.log('Charge utile préparée pour l\'API:', payload);
    
    // Appel à une API edge function ou équivalent
    const { data, error } = await supabase.functions.invoke('send-test-email', {
      body: payload
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de test:', error);
    return { success: false, error: error.message || 'Une erreur est survenue' };
  }
} 