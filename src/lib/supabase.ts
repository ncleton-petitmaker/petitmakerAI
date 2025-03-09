import { createClient } from '@supabase/supabase-js';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a Supabase client with retries and timeouts
const createClientWithRetry = (url: string, key: string) => {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  const client = createSupabaseClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'petitmaker-auth',
    flowType: 'pkce'
  },
  global: {
    fetch: async (url, options) => {
      let lastError;
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fetch(url, {
            ...options,
            signal: AbortSignal.timeout(10000), // 10 second timeout
          });
          return response;
        } catch (error) {
          lastError = error;
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
          }
        }
      }
      throw lastError;
    }
  }
});

  return client;
};

export const supabase = createClientWithRetry(supabaseUrl, supabaseAnonKey);

// Handle auth state change
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    // Clear local storage
    window.localStorage.removeItem('petitmaker-auth');
    window.localStorage.removeItem('supabase.auth.token');
  }
});

// Add error handling helper
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  
  if (error?.message?.includes('Failed to fetch')) {
    return 'Erreur de connexion au serveur. Veuillez vérifier votre connexion internet et réessayer.';
  }
  
  if (error?.code === 'PGRST116') {
    return 'Ressource non trouvée.';
  }
  
  if (error?.code === '42501') {
    return 'Accès non autorisé.';
  }
  
  return error?.message || 'Une erreur est survenue. Veuillez réessayer.';
};