import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_KEY environment variables.');
  process.exit(1);
}

console.log('Supabase URL and key found:', supabaseUrl);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

async function checkResponses() {
  console.log('Checking questionnaire responses...');

  // 1. Fetch all questionnaire responses
  const { data: responses, error: responsesError } = await supabase
    .from('questionnaire_responses')
    .select('*');

  if (responsesError) {
    console.error('Error fetching questionnaire responses:', responsesError);
    return;
  }

  console.log(`Found ${responses.length} total questionnaire responses.`);

  // 2. Group responses by type
  const groupedByType = {};
  responses.forEach(response => {
    if (!groupedByType[response.type]) {
      groupedByType[response.type] = [];
    }
    groupedByType[response.type].push(response);
  });

  // 3. Print detailed information
  for (const [type, typeResponses] of Object.entries(groupedByType)) {
    console.log(`\n--- Type: ${type} (${typeResponses.length} responses) ---`);
    
    // Group responses by user
    const groupedByUser = {};
    typeResponses.forEach(response => {
      if (!groupedByUser[response.user_id]) {
        groupedByUser[response.user_id] = [];
      }
      groupedByUser[response.user_id].push(response);
    });
    
    for (const [userId, userResponses] of Object.entries(groupedByUser)) {
      console.log(`\nUser ${userId} has ${userResponses.length} responses:`);
      
      userResponses.forEach((response, index) => {
        console.log(`  Response #${index + 1}:`);
        console.log(`    ID: ${response.id}`);
        console.log(`    Template ID: ${response.template_id}`);
        console.log(`    Created at: ${new Date(response.created_at).toLocaleString()}`);
        console.log(`    Score: ${response.score}`);
        console.log(`    Response has ${Object.keys(response.responses || {}).length} answers`);
      });

      // Fetch user information
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, email')
        .eq('id', userId)
        .single();

      if (userError) {
        console.log(`    User info: Error retrieving - ${userError.message}`);
      } else if (userData) {
        console.log(`    User info: ${userData.first_name} ${userData.last_name} (${userData.email || 'No email'})`);
      } else {
        console.log(`    User info: Not found`);
      }
    }
  }
}

// Run the function
checkResponses()
  .catch(err => console.error('Error in check script:', err))
  .finally(() => console.log('Check completed.')); 