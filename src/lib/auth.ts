import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

/**
 * Récupère la session utilisateur active depuis Supabase
 * @returns La session utilisateur ou null si aucun utilisateur n'est connecté
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Erreur lors de la récupération de la session:", error);
      return null;
    }
    
    return data.session;
  } catch (error) {
    console.error("Exception lors de la récupération de la session:", error);
    return null;
  }
}

/**
 * Récupère l'ID de l'utilisateur actuellement connecté
 * @returns ID de l'utilisateur ou null si aucun utilisateur n'est connecté
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.user?.id || null;
} 