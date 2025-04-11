import { supabase } from '../../../supabase-tools/supabase-client';
import { replaceTemplateVariables } from './emailSenderService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Récupérer les emails à envoyer en fonction des dates de formation
 * @returns {Promise} - La réponse de l'API
 */
export async function getScheduledEmails() {
  try {
    const today = new Date();
    
    // 1. Récupérer tous les modèles d'emails actifs avec planification
    const { data: templates, error: templatesError } = await supabase
      .from('email_templates')
      .select()
      .eq('status', true)
      .not('schedule_type', 'is', null)
      .not('schedule_days', 'is', null);
    
    if (templatesError) throw templatesError;
    
    // 2. Récupérer toutes les formations
    const { data: trainings, error: trainingsError } = await supabase
      .from('trainings')
      .select('id, title, start_date, end_date, trainer_name, location, duration');
    
    if (trainingsError) throw trainingsError;
    
    // 3. Construire la liste des emails à envoyer
    const emailsToSend = [];
    
    for (const training of trainings) {
      if (!training.start_date || !training.end_date) continue;
      
      const startDate = new Date(training.start_date);
      const endDate = new Date(training.end_date);
      
      // Récupérer tous les participants de cette formation
      const { data: participants, error: participantsError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, company, company_id')
        .eq('training_id', training.id);
      
      if (participantsError) throw participantsError;
      
      for (const template of templates) {
        // Calculer la date d'envoi en fonction du type de planification
        let sendDate;
        
        if (template.schedule_type === 'before_training_start') {
          // X jours avant le début de la formation
          sendDate = new Date(startDate);
          sendDate.setDate(sendDate.getDate() - template.schedule_days);
        } else if (template.schedule_type === 'after_training_end') {
          // X jours après la fin de la formation
          sendDate = new Date(endDate);
          sendDate.setDate(sendDate.getDate() + template.schedule_days);
        }
        
        // Vérifier si la date d'envoi est aujourd'hui
        if (sendDate && 
            sendDate.getDate() === today.getDate() && 
            sendDate.getMonth() === today.getMonth() && 
            sendDate.getFullYear() === today.getFullYear()) {
          
          // Ajouter un email à envoyer pour chaque participant
          for (const participant of participants) {
            // Vérifier si l'email a déjà été envoyé
            const { data: sentEmails, error: sentEmailsError } = await supabase
              .from('sent_emails')
              .select()
              .eq('template_id', template.id)
              .eq('learner_id', participant.id)
              .eq('training_id', training.id);
            
            if (sentEmailsError) throw sentEmailsError;
            
            // Si l'email n'a pas déjà été envoyé, l'ajouter à la liste
            if (!sentEmails || sentEmails.length === 0) {
              emailsToSend.push({
                template,
                training,
                participant
              });
            }
          }
        }
      }
    }
    
    return { success: true, data: emailsToSend };
  } catch (error) {
    console.error('Erreur lors de la récupération des emails planifiés:', error);
    return { success: false, error };
  }
}

/**
 * Envoyer les emails planifiés pour aujourd'hui
 * @returns {Promise} - La réponse de l'API
 */
export async function sendScheduledEmails() {
  try {
    // Cette fonction devra être implémentée avec la logique d'API Edge Function
    const { data, error } = await supabase.functions.invoke('send-scheduled-emails');
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de l\'envoi des emails planifiés:', error);
    return { success: false, error };
  }
}

/**
 * Préparer les variables pour un template d'email
 * @param {Object} template - Le modèle d'email
 * @param {Object} training - Les données de la formation
 * @param {Object} participant - Les données du participant
 * @returns {Object} - Les variables remplies
 */
export function prepareEmailVariables(template, training, participant) {
  const today = new Date();
  const formattedDate = format(today, 'dd/MM/yyyy', { locale: fr });
  
  // Informations de l'apprenant
  const learnerFirstName = participant?.first_name || '';
  const learnerLastName = participant?.last_name || '';
  const learnerFullName = `${learnerFirstName} ${learnerLastName}`.trim();
  const learnerEmail = participant?.email || '';
  const companyName = participant?.company || '';
  
  // Informations de la formation
  const trainingTitle = training?.title || '';
  const trainingStartDate = training?.start_date 
    ? format(new Date(training.start_date), 'dd/MM/yyyy', { locale: fr })
    : '';
  const trainingEndDate = training?.end_date 
    ? format(new Date(training.end_date), 'dd/MM/yyyy', { locale: fr })
    : '';
  const trainingDuration = training?.duration || '';
  const trainingLocation = typeof training?.location === 'string' 
    ? training.location 
    : JSON.stringify(training?.location || '');
  const trainerName = training?.trainer_name || '';
  
  return {
    learner_first_name: learnerFirstName,
    learner_last_name: learnerLastName,
    learner_full_name: learnerFullName,
    learner_email: learnerEmail,
    company_name: companyName,
    training_title: trainingTitle,
    training_start_date: trainingStartDate,
    training_end_date: trainingEndDate,
    training_duration: trainingDuration,
    training_location: trainingLocation,
    trainer_name: trainerName,
    current_date: formattedDate
  };
} 