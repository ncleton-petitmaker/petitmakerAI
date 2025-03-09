import { createClient } from '@supabase/supabase-js';

// Configuration du client Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';

// Création du client avec les droits d'administration
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Fonction pour vérifier si une table existe
 */
async function tableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .single();
    
    if (error) {
      console.log(`La table ${tableName} n'existe pas ou n'est pas accessible.`);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error(`Erreur lors de la vérification de la table ${tableName}:`, error);
    return false;
  }
}

/**
 * Fonction pour vérifier si RLS est activé sur une table
 */
async function isRLSEnabled(tableName) {
  try {
    // Cette requête ne fonctionnera que si vous avez les droits d'accès à pg_tables
    const { data, error } = await supabase
      .from('pg_tables')
      .select('rowsecurity')
      .eq('schemaname', 'public')
      .eq('tablename', tableName)
      .single();
    
    if (error) {
      console.log(`Impossible de vérifier si RLS est activé sur la table ${tableName}.`);
      return null;
    }
    
    return data?.rowsecurity || false;
  } catch (error) {
    console.error(`Erreur lors de la vérification de RLS sur la table ${tableName}:`, error);
    return null;
  }
}

/**
 * Fonction pour activer RLS sur une table
 */
async function enableRLS(tableName) {
  try {
    console.log(`Activation de RLS sur la table ${tableName}...`);
    
    // Cette opération doit être effectuée via l'interface Supabase
    console.log(`Pour activer RLS sur la table ${tableName}, exécutez la commande SQL suivante dans l'interface Supabase:`);
    console.log(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`);
    
    return true;
  } catch (error) {
    console.error(`Erreur lors de l'activation de RLS sur la table ${tableName}:`, error);
    return false;
  }
}

/**
 * Fonction pour créer une politique RLS
 */
async function createPolicy(tableName, policyName, operation, using) {
  try {
    console.log(`Création de la politique "${policyName}" sur la table ${tableName}...`);
    
    // Cette opération doit être effectuée via l'interface Supabase
    console.log(`Pour créer la politique "${policyName}" sur la table ${tableName}, exécutez la commande SQL suivante dans l'interface Supabase:`);
    
    let sql = `CREATE POLICY "${policyName}" ON ${tableName} FOR ${operation} `;
    
    if (operation === 'INSERT') {
      sql += `WITH CHECK (${using});`;
    } else {
      sql += `USING (${using});`;
    }
    
    console.log(sql);
    
    return true;
  } catch (error) {
    console.error(`Erreur lors de la création de la politique "${policyName}" sur la table ${tableName}:`, error);
    return false;
  }
}

/**
 * Fonction pour supprimer une politique RLS
 */
async function dropPolicy(tableName, policyName) {
  try {
    console.log(`Suppression de la politique "${policyName}" sur la table ${tableName}...`);
    
    // Cette opération doit être effectuée via l'interface Supabase
    console.log(`Pour supprimer la politique "${policyName}" sur la table ${tableName}, exécutez la commande SQL suivante dans l'interface Supabase:`);
    console.log(`DROP POLICY IF EXISTS "${policyName}" ON ${tableName};`);
    
    return true;
  } catch (error) {
    console.error(`Erreur lors de la suppression de la politique "${policyName}" sur la table ${tableName}:`, error);
    return false;
  }
}

/**
 * Fonction principale pour configurer les politiques RLS pour la table trainings
 */
async function fixTrainingsRLS() {
  try {
    console.log('Vérification et configuration des politiques RLS pour la table trainings...');
    
    // Vérifier si la table trainings existe
    const exists = await tableExists('trainings');
    if (!exists) {
      console.error('La table trainings n\'existe pas. Impossible de configurer les politiques RLS.');
      return;
    }
    
    console.log('La table trainings existe.');
    
    // Activer RLS sur la table trainings
    await enableRLS('trainings');
    
    // Supprimer les politiques existantes
    await dropPolicy('trainings', 'Les utilisateurs peuvent voir les formations auxquelles ils sont inscrits');
    await dropPolicy('trainings', 'Les administrateurs peuvent modifier les formations');
    await dropPolicy('trainings', 'Les administrateurs peuvent supprimer les formations');
    await dropPolicy('trainings', 'Les administrateurs peuvent ajouter des formations');
    await dropPolicy('trainings', 'Administrateurs peuvent voir toutes les formations');
    await dropPolicy('trainings', 'Utilisateurs peuvent voir leurs formations');
    await dropPolicy('trainings', 'Administrateurs peuvent modifier les formations');
    await dropPolicy('trainings', 'Administrateurs peuvent supprimer des formations');
    await dropPolicy('trainings', 'Administrateurs peuvent ajouter des formations');
    await dropPolicy('trainings', 'Tout le monde peut voir les formations');
    
    // Créer les nouvelles politiques
    await createPolicy('trainings', 'Tout le monde peut voir les formations', 'SELECT', 'true');
    await createPolicy('trainings', 'Les administrateurs peuvent modifier les formations', 'UPDATE', 'auth.uid() IN (SELECT id FROM user_profiles WHERE is_admin = true)');
    await createPolicy('trainings', 'Les administrateurs peuvent supprimer les formations', 'DELETE', 'auth.uid() IN (SELECT id FROM user_profiles WHERE is_admin = true)');
    await createPolicy('trainings', 'Les administrateurs peuvent ajouter des formations', 'INSERT', 'auth.uid() IN (SELECT id FROM user_profiles WHERE is_admin = true)');
    
    console.log('\nConfiguration des politiques RLS terminée.');
    console.log('Veuillez exécuter les commandes SQL affichées ci-dessus dans l\'interface Supabase.');
    console.log('\nUne fois ces commandes exécutées, vous pourrez enregistrer des formations sans problème.');
    
  } catch (error) {
    console.error('Erreur lors de la configuration des politiques RLS:', error);
  }
}

// Exécuter la fonction principale
fixTrainingsRLS().then(() => {
  console.log('Script terminé.');
}).catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
}); 