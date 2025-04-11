import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.27.0';

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
    
    // Find emails that need to be sent today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    // 1. Get all active email templates with scheduling
    const { data: templates, error: templatesError } = await supabase
      .from('email_templates')
      .select()
      .eq('status', true)
      .not('schedule_type', 'is', null)
      .not('schedule_days', 'is', null);
    
    if (templatesError) {
      return new Response(JSON.stringify({ error: templatesError.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // 2. Get all trainings
    const { data: trainings, error: trainingsError } = await supabase
      .from('trainings')
      .select('id, title, start_date, end_date, trainer_name, location, duration');
    
    if (trainingsError) {
      return new Response(JSON.stringify({ error: trainingsError.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // 3. Find which emails need to be sent today
    const emailsToSend = [];
    
    for (const training of trainings) {
      if (!training.start_date || !training.end_date) continue;
      
      const startDate = new Date(training.start_date);
      const endDate = new Date(training.end_date);
      
      for (const template of templates) {
        // Calculate send date based on scheduling type
        let sendDate;
        
        if (template.schedule_type === 'before_training_start') {
          // X days before the start of training
          sendDate = new Date(startDate);
          sendDate.setDate(sendDate.getDate() - template.schedule_days);
        } else if (template.schedule_type === 'after_training_end') {
          // X days after the end of training
          sendDate = new Date(endDate);
          sendDate.setDate(sendDate.getDate() + template.schedule_days);
        }
        
        // Check if send date is today
        if (sendDate && sendDate.toISOString().split('T')[0] === todayStr) {
          // Get all participants for this training
          const { data: participants, error: participantsError } = await supabase
            .from('user_profiles')
            .select('id, first_name, last_name, email, company, company_id')
            .eq('training_id', training.id);
          
          if (participantsError) {
            console.error(`Error fetching participants for training ${training.id}:`, participantsError);
            continue;
          }
          
          // For each participant, check if email was already sent
          for (const participant of participants) {
            // Skip participants without email
            if (!participant.email) continue;
            
            // Check if this email was already sent to this participant
            const { data: sentEmails, error: sentEmailsError } = await supabase
              .from('sent_emails')
              .select()
              .eq('template_id', template.id)
              .eq('learner_id', participant.id)
              .eq('training_id', training.id);
            
            if (sentEmailsError) {
              console.error(`Error checking sent emails for participant ${participant.id}:`, sentEmailsError);
              continue;
            }
            
            // If email hasn't been sent yet, add to the list
            if (!sentEmails || sentEmails.length === 0) {
              emailsToSend.push({
                template_id: template.id,
                training_id: training.id,
                learner_id: participant.id
              });
            }
          }
        }
      }
    }
    
    // If there are no emails to send, return early
    if (emailsToSend.length === 0) {
      return new Response(JSON.stringify({ message: 'No scheduled emails to send today' }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Send all the emails by calling the send-email function
    const results = [];
    
    for (const email of emailsToSend) {
      try {
        const response = await fetch(
          `${req.url.split('/scheduled-emails')[0]}/send-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.get('Authorization') || '',
            },
            body: JSON.stringify({
              templateId: email.template_id,
              trainingId: email.training_id,
              learnerId: email.learner_id,
            }),
          }
        );
        
        const result = await response.json();
        results.push({
          ...email,
          success: result.success,
          error: result.error,
        });
      } catch (error) {
        console.error('Error sending scheduled email:', error);
        results.push({
          ...email,
          success: false,
          error: error.message,
        });
      }
    }
    
    // Count successes and failures
    const successes = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success).length;
    
    return new Response(
      JSON.stringify({
        success: failures === 0,
        summary: `${successes} scheduled emails sent successfully, ${failures} failed`,
        total: emailsToSend.length,
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
    console.error('Unexpected error processing scheduled emails:', error);
    
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