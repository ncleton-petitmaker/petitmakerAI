import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.27.0';

// Google OAuth 2.0 configuration
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Scopes we need for sending emails and accessing Gmail
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    
    // Handle CORS for browser clients
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
    
    // Generate authorization URL for Google OAuth
    if (path === 'auth-url') {
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', GOOGLE_SCOPES.join(' '));
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      
      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Handle OAuth callback to exchange code for tokens
    if (path === 'callback') {
      const code = url.searchParams.get('code');
      
      if (!code) {
        return new Response(JSON.stringify({ error: 'No code provided' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Exchange the authorization code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });
      
      const tokens = await tokenResponse.json();
      
      if (tokens.error) {
        return new Response(JSON.stringify({ error: tokens.error }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Get user email information
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      
      const userInfo = await userInfoResponse.json();
      
      // Save tokens to settings table
      const { error: updateError } = await supabase
        .from('settings')
        .update({
          google_oauth_enabled: true,
          google_oauth_refresh_token: tokens.refresh_token,
          google_oauth_access_token: tokens.access_token,
          google_oauth_token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          google_email_sender: userInfo.email,
        })
        .eq('id', 1);
      
      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Redirect to frontend admin page
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${url.origin}/admin/settings?oauth_success=true`,
        },
      });
    }
    
    // Endpoint to check OAuth status
    if (path === 'status') {
      const { data, error } = await supabase
        .from('settings')
        .select('google_oauth_enabled, google_email_sender')
        .eq('id', 1)
        .single();
      
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      
      return new Response(JSON.stringify({ 
        connected: data.google_oauth_enabled,
        email: data.google_email_sender
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Endpoint to disconnect Google OAuth
    if (path === 'disconnect' && req.method === 'POST') {
      const { error } = await supabase
        .from('settings')
        .update({
          google_oauth_enabled: false,
          google_oauth_refresh_token: null,
          google_oauth_access_token: null,
          google_oauth_token_expiry: null,
          google_email_sender: null,
        })
        .eq('id', 1);
      
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // If no path matches
    return new Response(JSON.stringify({ error: 'Not found' }), { 
      status: 404,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}); 