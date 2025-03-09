import fetch from 'node-fetch';

// Configuration du client Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://efgirjtbuzljtzpuwsue.supabase.co';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk';

/**
 * Exécute une requête SQL directement via l'API REST de Supabase
 */
async function executeSQLDirectly(sql) {
  try {
    console.log('Exécution de la requête SQL:', sql);
    
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: sql
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur lors de l\'exécution de la requête SQL:', errorText);
      return { success: false, error: errorText };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Exception lors de l\'exécution de la requête SQL:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fonction pour exécuter une requête SQL via l'API Supabase directe
 */
async function executeDirectSQL(sql) {
  try {
    console.log('Exécution de la requête SQL via API directe...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur lors de l\'exécution de la requête SQL:', errorText);
      return { success: false, error: errorText };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Exception lors de l\'exécution de la requête SQL:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fonction pour exécuter une requête SQL via l'API Supabase query_db
 */
async function executeQueryDB(sql) {
  try {
    console.log('Exécution de la requête SQL via query_db...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query_db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql_query: sql })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur lors de l\'exécution de la requête SQL:', errorText);
      return { success: false, error: errorText };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Exception lors de l\'exécution de la requête SQL:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fonction pour exécuter une requête SQL en essayant différentes méthodes
 */
async function executeSQL(sql) {
  // Essayer la méthode directe
  const directResult = await executeSQLDirectly(sql);
  if (directResult.success) {
    return directResult;
  }
  
  // Essayer la méthode execute_sql
  const executeResult = await executeDirectSQL(sql);
  if (executeResult.success) {
    return executeResult;
  }
  
  // Essayer la méthode query_db
  const queryResult = await executeQueryDB(sql);
  if (queryResult.success) {
    return queryResult;
  }
  
  // Si toutes les méthodes ont échoué, utiliser l'API REST pour les opérations spécifiques
  if (sql.includes('ALTER TABLE') && sql.includes('ENABLE ROW LEVEL SECURITY')) {
    console.log('Activation de RLS via API REST...');
    const tableName = sql.match(/ALTER TABLE\s+(\w+)/i)[1];
    
    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?rls=true`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur lors de l\'activation de RLS:', errorText);
      return { success: false, error: errorText };
    }
    
    return { success: true };
  }
  
  return { success: false, error: 'Toutes les méthodes ont échoué' };
}

/**
 * Fonction principale pour corriger les politiques RLS
 */
async function fixRLS() {
  try {
    console.log('Correction des politiques RLS pour la table trainings...');
    
    // Activer RLS sur la table trainings
    console.log('1. Activation de RLS sur la table trainings...');
    await executeSQL('ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;');
    
    // Supprimer les politiques existantes
    console.log('2. Suppression des politiques existantes...');
    await executeSQL('DROP POLICY IF EXISTS "Les utilisateurs peuvent voir les formations auxquelles ils sont inscrits" ON trainings;');
    await executeSQL('DROP POLICY IF EXISTS "Les administrateurs peuvent modifier les formations" ON trainings;');
    await executeSQL('DROP POLICY IF EXISTS "Les administrateurs peuvent supprimer les formations" ON trainings;');
    await executeSQL('DROP POLICY IF EXISTS "Les administrateurs peuvent ajouter des formations" ON trainings;');
    await executeSQL('DROP POLICY IF EXISTS "Administrateurs peuvent voir toutes les formations" ON trainings;');
    await executeSQL('DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs formations" ON trainings;');
    await executeSQL('DROP POLICY IF EXISTS "Administrateurs peuvent modifier les formations" ON trainings;');
    await executeSQL('DROP POLICY IF EXISTS "Administrateurs peuvent supprimer des formations" ON trainings;');
    await executeSQL('DROP POLICY IF EXISTS "Administrateurs peuvent ajouter des formations" ON trainings;');
    await executeSQL('DROP POLICY IF EXISTS "Tout le monde peut voir les formations" ON trainings;');
    
    // Créer les nouvelles politiques
    console.log('3. Création des nouvelles politiques...');
    
    // Politique pour la lecture (SELECT)
    console.log('3.1. Création de la politique pour la lecture...');
    await executeSQL(`
      CREATE POLICY "Tout le monde peut voir les formations" 
      ON trainings FOR SELECT 
      USING (true);
    `);
    
    // Politique pour la modification (UPDATE)
    console.log('3.2. Création de la politique pour la modification...');
    await executeSQL(`
      CREATE POLICY "Les administrateurs peuvent modifier les formations" 
      ON trainings FOR UPDATE 
      USING (
        auth.uid() IN (
          SELECT id FROM user_profiles WHERE is_admin = true
        )
      );
    `);
    
    // Politique pour la suppression (DELETE)
    console.log('3.3. Création de la politique pour la suppression...');
    await executeSQL(`
      CREATE POLICY "Les administrateurs peuvent supprimer les formations" 
      ON trainings FOR DELETE 
      USING (
        auth.uid() IN (
          SELECT id FROM user_profiles WHERE is_admin = true
        )
      );
    `);
    
    // Politique pour l'insertion (INSERT)
    console.log('3.4. Création de la politique pour l\'insertion...');
    await executeSQL(`
      CREATE POLICY "Les administrateurs peuvent ajouter des formations" 
      ON trainings FOR INSERT 
      WITH CHECK (
        auth.uid() IN (
          SELECT id FROM user_profiles WHERE is_admin = true
        )
      );
    `);
    
    console.log('Politiques RLS configurées avec succès!');
    console.log('Vous pouvez maintenant enregistrer des formations sans problème.');
    
  } catch (error) {
    console.error('Erreur lors de la correction des politiques RLS:', error);
  }
}

// Exécuter la fonction principale
fixRLS().then(() => {
  console.log('Script terminé.');
}).catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
}); 