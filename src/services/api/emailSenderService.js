import { supabase } from '../../../supabase-tools/supabase-client';

/**
 * Vérifier la connexion Google
 * @returns {Promise} - La réponse de l'API
 */
export async function checkGoogleConnection() {
  try {
    const { data, error } = await supabase.functions.invoke('google-oauth', {
      path: 'status'
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de la vérification de la connexion Google:', error);
    return { success: false, error };
  }
}

/**
 * Connecter l'application à un compte Google
 * @returns {Promise} - La réponse de l'API avec l'URL d'autorisation OAuth
 */
export async function connectToGoogle() {
  try {
    const { data, error } = await supabase.functions.invoke('google-oauth', {
      path: 'auth-url'
    });

    if (error) throw error;
    return { success: true, data: { authUrl: data.url } };
  } catch (error) {
    console.error('Erreur lors de la connexion à Google:', error);
    return { success: false, error };
  }
}

/**
 * Déconnecter l'application d'un compte Google
 * @returns {Promise} - La réponse de l'API
 */
export async function disconnectFromGoogle() {
  try {
    const { data, error } = await supabase.functions.invoke('google-oauth', {
      path: 'disconnect',
      method: 'POST'
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de la déconnexion de Google:', error);
    return { success: false, error };
  }
}

/**
 * Envoyer un email de test pour vérifier la configuration
 * @param {string} templateId - L'ID du modèle d'email à utiliser
 * @param {string} testEmail - L'adresse email de test
 * @returns {Promise} - La réponse de l'API
 */
export async function sendTestEmail(templateId, testEmail) {
  try {
    // Cette fonction devra être implémentée avec la logique d'API Edge Function
    const { data, error } = await supabase.functions.invoke('send-test-email', {
      body: { templateId, testEmail }
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de test:', error);
    return { success: false, error };
  }
}

/**
 * Envoyer un email à un apprenant spécifique
 * @param {string} templateId - L'ID du modèle d'email à utiliser
 * @param {string} learnerId - L'ID de l'apprenant
 * @param {string} trainingId - L'ID de la formation
 * @returns {Promise} - La réponse de l'API
 */
export async function sendEmailToLearner(templateId, learnerId, trainingId) {
  try {
    // Cette fonction devra être implémentée avec la logique d'API Edge Function
    const { data, error } = await supabase.functions.invoke('send-email-to-learner', {
      body: { templateId, learnerId, trainingId }
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email à l\'apprenant:', error);
    return { success: false, error };
  }
}

/**
 * Envoyer un email à tous les apprenants d'une formation
 * @param {string} templateId - L'ID du modèle d'email à utiliser
 * @param {string} trainingId - L'ID de la formation
 * @returns {Promise} - La réponse de l'API
 */
export async function sendEmailToTrainingLearners(templateId, trainingId) {
  try {
    // Cette fonction devra être implémentée avec la logique d'API Edge Function
    const { data, error } = await supabase.functions.invoke('send-email-to-training-learners', {
      body: { templateId, trainingId }
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de l\'envoi des emails aux apprenants de la formation:', error);
    return { success: false, error };
  }
}

/**
 * Remplacer les variables dans un modèle d'email avec les valeurs réelles
 * @param {string} template - Le contenu du modèle d'email avec variables
 * @param {Object} variables - Les valeurs à substituer
 * @returns {string} - Le contenu avec les variables remplacées
 */
export function replaceTemplateVariables(template, variables) {
  if (!template) return '';
  
  let result = template;
  
  // Remplacer toutes les variables (format: {{variable}})
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value || '');
  }
  
  return result;
}

/**
 * Obtenir la liste des variables disponibles pour les modèles d'emails
 * @returns {Array} - Liste des variables disponibles avec leur description
 */
export function getAvailableTemplateVariables() {
  return [
    { key: 'learner_first_name', description: 'Prénom de l\'apprenant' },
    { key: 'learner_last_name', description: 'Nom de l\'apprenant' },
    { key: 'learner_full_name', description: 'Nom complet de l\'apprenant' },
    { key: 'learner_email', description: 'Email de l\'apprenant' },
    { key: 'company_name', description: 'Nom de l\'entreprise de l\'apprenant' },
    { key: 'training_title', description: 'Titre de la formation' },
    { key: 'training_start_date', description: 'Date de début de la formation' },
    { key: 'training_end_date', description: 'Date de fin de la formation' },
    { key: 'training_duration', description: 'Durée de la formation' },
    { key: 'training_location', description: 'Lieu de la formation' },
    { key: 'trainer_name', description: 'Nom du formateur' },
    { key: 'current_date', description: 'Date actuelle' }
  ];
} 