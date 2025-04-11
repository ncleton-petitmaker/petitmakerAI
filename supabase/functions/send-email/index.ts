import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.27.0';

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper function to refresh the access token
async function refreshAccessToken(refreshToken: string) {
  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || '';
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Error refreshing token: ${data.error}`);
  }
  
  return data;
}

// Helper function to replace template variables
function replaceTemplateVariables(template: string, variables: Record<string, string>) {
  if (!template) return '';
  
  let result = template;
  
  // Replace all variables (format: {{variable}})
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value || '');
  }
  
  return result;
}

// Helper function to prepare email variables
async function prepareEmailVariables(template: any, training: any, participant: any) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('fr-FR');
  
  // Learner information
  const learnerFirstName = participant?.first_name || '';
  const learnerLastName = participant?.last_name || '';
  const learnerFullName = `${learnerFirstName} ${learnerLastName}`.trim();
  const learnerEmail = participant?.email || '';
  const companyName = participant?.company || '';
  
  // Training information
  const trainingTitle = training?.title || '';
  const trainingStartDate = training?.start_date 
    ? new Date(training.start_date).toLocaleDateString('fr-FR')
    : '';
  const trainingEndDate = training?.end_date 
    ? new Date(training.end_date).toLocaleDateString('fr-FR')
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

// Helper function to encode email for Gmail API
function encodeEmail({
  to,
  subject,
  body,
  from,
  attachmentData = null
}: {
  to: string;
  subject: string;
  body: string;
  from: string;
  attachmentData?: {
    filename: string;
    contentType: string;
    base64Data: string;
  } | null;
}) {
  const emailLines = [];
  
  // Add headers
  emailLines.push(`From: ${from}`);
  emailLines.push(`To: ${to}`);
  emailLines.push(`Subject: ${subject}`);
  
  // Create a unique boundary for multipart
  const boundary = `boundary_${Date.now().toString(16)}`;
  
  if (attachmentData) {
    // If we have an attachment, create a multipart email
    emailLines.push('MIME-Version: 1.0');
    emailLines.push(`Content-Type: multipart/mixed; boundary=${boundary}`);
    emailLines.push('');
    
    // Add HTML part
    emailLines.push(`--${boundary}`);
    emailLines.push('Content-Type: text/html; charset=utf-8');
    emailLines.push('');
    emailLines.push(body);
    
    // Add attachment part
    emailLines.push(`--${boundary}`);
    emailLines.push(`Content-Type: ${attachmentData.contentType}`);
    emailLines.push('Content-Transfer-Encoding: base64');
    emailLines.push(`Content-Disposition: attachment; filename=${attachmentData.filename}`);
    emailLines.push('');
    emailLines.push(attachmentData.base64Data);
    
    // End multipart
    emailLines.push(`--${boundary}--`);
  } else {
    // Simple HTML email without attachment
    emailLines.push('MIME-Version: 1.0');
    emailLines.push('Content-Type: text/html; charset=utf-8');
    emailLines.push('');
    emailLines.push(body);
  }
  
  // Convert email to base64URL format for Gmail API
  const email = emailLines.join('\r\n');
  return btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Main function to handle requests
serve(async (req) => {
  try {
    // Handle CORS for browser clients
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
    
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Get the request body
    const requestData = await req.json();
    const { templateId, learnerId, trainingId, testEmail } = requestData;
    
    if (!templateId) {
      return new Response(JSON.stringify({ error: 'Template ID is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Get Google OAuth credentials from settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('google_oauth_enabled, google_oauth_refresh_token, google_oauth_access_token, google_oauth_token_expiry, google_email_sender')
      .eq('id', 1)
      .single();
    
    if (settingsError || !settings.google_oauth_enabled) {
      return new Response(JSON.stringify({ 
        error: settingsError?.message || 'Google OAuth not enabled'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Get the email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*, files(*)')
      .eq('id', templateId)
      .single();
    
    if (templateError) {
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Prepare variables and participants differently based on whether it's a test email
    let variables = {};
    let recipients = [];
    
    if (testEmail) {
      // Pour les emails de test
      if (requestData.use_test_data) {
        // Récupérer une formation aléatoire disponible
        const { data: randomTraining, error: trainingError } = await supabase
          .from('trainings')
          .select('*')
          .limit(1);
        
        if (trainingError || !randomTraining || randomTraining.length === 0) {
          console.error("Erreur lors de la récupération d'une formation aléatoire:", trainingError);
          
          // Utiliser des données fictives en cas d'erreur
          variables = {
            learner_first_name: 'Test',
            learner_last_name: 'Utilisateur',
            learner_full_name: 'Test Utilisateur',
            learner_email: testEmail,
            company_name: 'Entreprise Test',
            training_title: 'Formation Test',
            training_start_date: new Date().toLocaleDateString('fr-FR'),
            training_end_date: new Date().toLocaleDateString('fr-FR'),
            training_duration: '14h',
            training_location: 'Paris',
            trainer_name: 'Formateur Test',
            current_date: new Date().toLocaleDateString('fr-FR')
          };
        } else {
          const training = randomTraining[0];
          
          // Récupérer un participant aléatoire pour cette formation
          const { data: randomParticipant, error: participantError } = await supabase
            .from('user_profiles')
            .select('*')
            .limit(1);
          
          if (participantError || !randomParticipant || randomParticipant.length === 0) {
            console.error('Erreur lors de la récupération d\'un participant aléatoire:', participantError);
            
            // Utiliser des données de formation réelles mais participant fictif
            variables = {
              learner_first_name: 'Test',
              learner_last_name: 'Utilisateur',
              learner_full_name: 'Test Utilisateur',
              learner_email: testEmail,
              company_name: 'Entreprise Test',
              training_title: training.title || 'Formation Test',
              training_start_date: training.start_date 
                ? new Date(training.start_date).toLocaleDateString('fr-FR')
                : new Date().toLocaleDateString('fr-FR'),
              training_end_date: training.end_date 
                ? new Date(training.end_date).toLocaleDateString('fr-FR')
                : new Date().toLocaleDateString('fr-FR'),
              training_duration: training.duration || '14h',
              training_location: typeof training.location === 'string' 
                ? training.location 
                : JSON.stringify(training.location || 'Paris'),
              trainer_name: training.trainer_name || 'Formateur Test',
              current_date: new Date().toLocaleDateString('fr-FR')
            };
          } else {
            const participant = randomParticipant[0];
            
            // Préparer les variables avec les données réelles
            variables = await prepareEmailVariables(template, training, participant);
          }
        }
      } else {
        // Ancien comportement pour la rétrocompatibilité
        variables = {
          learner_first_name: 'Test',
          learner_last_name: 'User',
          learner_full_name: 'Test User',
          learner_email: testEmail,
          company_name: 'Test Company',
          training_title: 'Test Formation',
          training_start_date: new Date().toLocaleDateString('fr-FR'),
          training_end_date: new Date().toLocaleDateString('fr-FR'),
          training_duration: '14h',
          training_location: 'Paris',
          trainer_name: 'Formateur Test',
          current_date: new Date().toLocaleDateString('fr-FR')
        };
      }
      
      // Toujours envoyer à l'adresse de test indiquée
      recipients = [{ email: testEmail, id: 'test' }];
    } else if (learnerId && trainingId) {
      // For a single learner
      const { data: learner, error: learnerError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, company, company_id')
        .eq('id', learnerId)
        .single();
        
      if (learnerError) {
        return new Response(JSON.stringify({ error: 'Learner not found' }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      
      const { data: training, error: trainingError } = await supabase
        .from('trainings')
        .select('id, title, start_date, end_date, trainer_name, location, duration')
        .eq('id', trainingId)
        .single();
        
      if (trainingError) {
        return new Response(JSON.stringify({ error: 'Training not found' }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      
      variables = await prepareEmailVariables(template, training, learner);
      recipients = [{ email: learner.email, id: learner.id }];
    } else if (trainingId) {
      // For all learners in a training
      const { data: learners, error: learnersError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, company, company_id')
        .eq('training_id', trainingId);
        
      if (learnersError) {
        return new Response(JSON.stringify({ error: 'Could not fetch learners' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      
      const { data: training, error: trainingError } = await supabase
        .from('trainings')
        .select('id, title, start_date, end_date, trainer_name, location, duration')
        .eq('id', trainingId)
        .single();
        
      if (trainingError) {
        return new Response(JSON.stringify({ error: 'Training not found' }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      
      recipients = learners.map(learner => ({ email: learner.email, id: learner.id }));
      
      // For batch emails, we'll compute variables per recipient later
      variables = { training };
    } else {
      return new Response(JSON.stringify({ error: 'Either learnerId or trainingId is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Check if we need to refresh the access token
    let accessToken = settings.google_oauth_access_token;
    const tokenExpiry = new Date(settings.google_oauth_token_expiry);
    
    if (tokenExpiry < new Date()) {
      try {
        const tokens = await refreshAccessToken(settings.google_oauth_refresh_token);
        
        // Update tokens in database
        await supabase
          .from('settings')
          .update({
            google_oauth_access_token: tokens.access_token,
            google_oauth_token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          })
          .eq('id', 1);
        
        accessToken = tokens.access_token;
      } catch (error) {
        console.error('Error refreshing token:', error);
        return new Response(JSON.stringify({ error: 'Failed to refresh access token' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }
    
    // Get attachment data if there's one
    let attachmentData = null;
    if (template.file_id && template.files) {
      // For real implementation, you'd need to fetch the file from storage
      // This is a placeholder for the actual implementation
      const file = template.files;
      
      try {
        const fileResponse = await fetch(file.url);
        const fileArrayBuffer = await fileResponse.arrayBuffer();
        const fileBase64 = btoa(
          new Uint8Array(fileArrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte), ''
          )
        );
        
        const filenameParts = file.name.split('.');
        const extension = filenameParts.pop();
        
        let contentType = 'application/octet-stream';
        if (extension === 'pdf') contentType = 'application/pdf';
        else if (extension === 'doc' || extension === 'docx') contentType = 'application/msword';
        
        attachmentData = {
          filename: file.name,
          contentType,
          base64Data: fileBase64
        };
      } catch (error) {
        console.error('Error fetching attachment:', error);
        // Continue without attachment if there's an error
      }
    }
    
    // Send emails to all recipients
    const emailPromises = recipients.map(async (recipient) => {
      try {
        // For batch emails, compute variables for each recipient
        let recipientVariables = variables;
        
        if (trainingId && !learnerId && !testEmail) {
          const { data: learner } = await supabase
            .from('user_profiles')
            .select('id, first_name, last_name, email, company, company_id')
            .eq('id', recipient.id)
            .single();
            
          const { data: training } = await supabase
            .from('trainings')
            .select('id, title, start_date, end_date, trainer_name, location, duration')
            .eq('id', trainingId)
            .single();
            
          recipientVariables = await prepareEmailVariables(template, training, learner);
        }
        
        // Replace template variables in subject and body
        const subject = replaceTemplateVariables(template.subject, recipientVariables);
        const body = replaceTemplateVariables(template.body, recipientVariables);
        
        // Encode the email for Gmail API
        const encodedEmail = encodeEmail({
          to: recipient.email,
          from: settings.google_email_sender,
          subject,
          body,
          attachmentData
        });
        
        // Send the email using Gmail API
        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: encodedEmail }),
        });
        
        const result = await response.json();
        
        if (response.ok) {
          // Log success to sent_emails table
          await supabase
            .from('sent_emails')
            .insert({
              template_id: templateId,
              learner_id: recipient.id !== 'test' ? recipient.id : null,
              training_id: trainingId || null,
              sent_at: new Date().toISOString(),
            });
          
          // Update email_history in user_profiles
          if (recipient.id !== 'test') {
            // Get current email history
            const { data: userProfile } = await supabase
              .from('user_profiles')
              .select('email_history')
              .eq('id', recipient.id)
              .single();
            
            const emailHistory = userProfile.email_history || [];
            emailHistory.push({
              template_id: templateId,
              template_name: template.name,
              subject: subject,
              sent_at: new Date().toISOString(),
            });
            
            // Update user profile with new email history
            await supabase
              .from('user_profiles')
              .update({ email_history: emailHistory })
              .eq('id', recipient.id);
          }
          
          return { success: true, recipient: recipient.email };
        } else {
          // Log error to sent_emails and email_error tables
          await supabase
            .from('sent_emails')
            .insert({
              template_id: templateId,
              learner_id: recipient.id !== 'test' ? recipient.id : null,
              training_id: trainingId || null,
              sent_at: new Date().toISOString(),
              error_message: result.error?.message || 'Unknown error',
            });
          
          await supabase
            .from('email_error')
            .insert({
              template_id: templateId,
              learner_id: recipient.id !== 'test' ? recipient.id : null,
              training_id: trainingId || null,
              error_message: result.error?.message || 'Unknown error',
            });
          
          return { 
            success: false, 
            recipient: recipient.email, 
            error: result.error?.message || 'Unknown error'
          };
        }
      } catch (error) {
        // Log unexpected errors
        console.error(`Error sending email to ${recipient.email}:`, error);
        
        await supabase
          .from('email_error')
          .insert({
            template_id: templateId,
            learner_id: recipient.id !== 'test' ? recipient.id : null,
            training_id: trainingId || null,
            error_message: error.message,
          });
        
        return { 
          success: false, 
          recipient: recipient.email, 
          error: error.message 
        };
      }
    });
    
    // Wait for all emails to be sent
    const results = await Promise.all(emailPromises);
    
    // Count successes and failures
    const successes = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success).length;
    
    return new Response(
      JSON.stringify({
        success: failures === 0,
        summary: `${successes} emails sent successfully, ${failures} failed`,
        results
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}); 