import { createClient } from '@supabase/supabase-js';

// Configuration du client Supabase
const supabaseUrl = 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMjU0MDQsImV4cCI6MjA1NTgwMTQwNH0.aY8wI1r5RW78L0yjYX5wNBD6bY0Ybqbm6JdiUeejVR4';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration');
}

// Client avec les droits anonymes (pour les utilisateurs)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client avec les droits d'administration (pour les migrations et opérations admin)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Gère les erreurs Supabase et retourne un message d'erreur convivial
 */
export const handleSupabaseError = (error) => {
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

/**
 * Vérifie si la table training_participants existe et la remplace par user_profiles si nécessaire
 */
export async function checkAndFixTrainingParticipantsTable() {
  try {
    console.log('Vérification de la table training_participants...');
    
    // Vérifier si les tables existent
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('Erreur lors de la vérification des tables:', tablesError);
      return { success: false, error: tablesError };
    }
    
    const tableNames = tables.map(t => t.table_name);
    const hasTrainingParticipants = tableNames.includes('training_participants');
    const hasUserProfiles = tableNames.includes('user_profiles');
    
    if (hasTrainingParticipants) {
      console.warn('ALERTE: La table training_participants existe et doit être remplacée par user_profiles');
      
      if (!hasUserProfiles) {
        console.log('Création de la table user_profiles basée sur training_participants...');
        
        // Exécuter la migration pour créer user_profiles à partir de training_participants
        const migrationSQL = `
          -- Créer la table user_profiles basée sur training_participants
          CREATE TABLE IF NOT EXISTS user_profiles AS 
          SELECT * FROM training_participants;
          
          -- Ajouter les contraintes nécessaires
          ALTER TABLE user_profiles ADD PRIMARY KEY (id);
          
          -- Activer RLS
          ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
          
          -- Créer les politiques de sécurité
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT FROM pg_policies 
              WHERE tablename = 'user_profiles' 
              AND policyname = 'Les utilisateurs peuvent voir leur propre profil'
            ) THEN
              CREATE POLICY "Les utilisateurs peuvent voir leur propre profil" 
              ON user_profiles FOR SELECT 
              USING (auth.uid() = user_id);
            END IF;
            
            IF NOT EXISTS (
              SELECT FROM pg_policies 
              WHERE tablename = 'user_profiles' 
              AND policyname = 'Les utilisateurs peuvent mettre à jour leur propre profil'
            ) THEN
              CREATE POLICY "Les utilisateurs peuvent mettre à jour leur propre profil" 
              ON user_profiles FOR UPDATE 
              USING (auth.uid() = user_id);
            END IF;
          END $$;
        `;
        
        const { error: migrationError } = await supabaseAdmin.rpc('query_db', { sql_query: migrationSQL });
        
        if (migrationError) {
          console.error('Erreur lors de la migration:', migrationError);
          return { success: false, error: migrationError };
        }
        
        console.log('Table user_profiles créée avec succès.');
      }
      
      // Rechercher les références à training_participants dans le code
      console.log('Attention: Des références à "training_participants" peuvent exister dans le code et doivent être remplacées par "user_profiles"');
      
      return { 
        success: true, 
        message: 'Vérification terminée. La table training_participants existe et doit être remplacée par user_profiles dans tout le code.',
        hasTrainingParticipants,
        hasUserProfiles
      };
    } else {
      console.log('La table training_participants n\'existe pas, ce qui est correct.');
      
      return { 
        success: true, 
        message: 'Vérification terminée. La table training_participants n\'existe pas.',
        hasTrainingParticipants: false,
        hasUserProfiles
      };
    }
  } catch (error) {
    console.error('Erreur lors de la vérification de la table training_participants:', error);
    return { success: false, error };
  }
}

/**
 * Exécute une requête SQL arbitraire
 */
export async function executeSQL(query) {
  try {
    const { data, error } = await supabaseAdmin.rpc('query_db', { sql_query: query });
    
    if (error) {
      console.error('Erreur lors de l\'exécution de la requête SQL:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la requête SQL:', error);
    return { success: false, error };
  }
}

/**
 * Vérifie l'existence d'une politique avant de la créer
 */
export async function createPolicyIfNotExists(tableName, policyName, policyDefinition) {
  try {
    // Vérifier si la politique existe déjà
    const checkQuery = `
      SELECT COUNT(*) 
      FROM pg_policies 
      WHERE tablename = '${tableName}' 
      AND policyname = '${policyName}'
    `;
    
    const { data: result, error: checkError } = await supabaseAdmin.rpc('query_db', { sql_query: checkQuery });
    
    if (checkError) {
      console.error(`Erreur lors de la vérification de la politique ${policyName}:`, checkError);
      return { success: false, error: checkError };
    }
    
    const policyExists = result && result[0] && result[0].count > 0;
    
    if (!policyExists) {
      // Créer la politique si elle n'existe pas
      const { error: createError } = await supabaseAdmin.rpc('query_db', { sql_query: policyDefinition });
      
      if (createError) {
        console.error(`Erreur lors de la création de la politique ${policyName}:`, createError);
        return { success: false, error: createError };
      }
      
      console.log(`Politique ${policyName} créée pour la table ${tableName}`);
      return { success: true, message: `Politique ${policyName} créée` };
    } else {
      console.log(`La politique ${policyName} existe déjà pour la table ${tableName}`);
      return { success: true, message: `La politique ${policyName} existe déjà` };
    }
  } catch (error) {
    console.error(`Erreur lors de la vérification/création de la politique ${policyName}:`, error);
    return { success: false, error };
  }
} 