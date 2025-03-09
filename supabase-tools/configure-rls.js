import {
  listTables,
  createPolicy,
  enableRLS
} from './supabase-direct.js';

/**
 * Configure les politiques de sécurité RLS pour toutes les tables
 */
async function configureRLS() {
  try {
    console.log('Configuration des politiques de sécurité RLS...');
    
    // 1. Lister toutes les tables
    const tablesResult = await listTables();
    
    if (!tablesResult.success) {
      console.error('Erreur lors de la récupération des tables.');
      return;
    }
    
    const tables = tablesResult.tables;
    
    if (!tables || tables.length === 0) {
      console.log('Aucune table trouvée dans la base de données.');
      return;
    }
    
    // 2. Activer RLS sur toutes les tables et configurer les politiques
    for (const table of tables) {
      const tableName = table.tablename;
      
      // Ignorer les tables système
      if (tableName.startsWith('pg_') || tableName.startsWith('_')) {
        continue;
      }
      
      console.log(`\nConfiguration de RLS pour la table ${tableName}...`);
      
      // Activer RLS sur la table
      const enableResult = await enableRLS(tableName);
      
      if (!enableResult.success) {
        console.error(`Erreur lors de l'activation de RLS pour la table ${tableName}:`, enableResult.error);
        console.log(`Message: ${enableResult.message}`);
        console.log('Continuez manuellement via l\'interface Supabase.');
        continue;
      }
      
      console.log(`RLS activé pour la table ${tableName}.`);
      
      // Configurer les politiques en fonction du type de table
      if (tableName === 'companies') {
        // Politiques pour la table companies
        await configureCompaniesRLS(tableName);
      } else if (tableName === 'user_profiles' || tableName === 'profiles') {
        // Politiques pour les tables de profils utilisateurs
        await configureUserProfilesRLS(tableName);
      } else {
        // Politiques génériques pour les autres tables
        await configureGenericRLS(tableName);
      }
    }
    
    console.log('\nConfiguration des politiques RLS terminée.');
  } catch (error) {
    console.error('Erreur lors de la configuration des politiques RLS:', error);
  }
}

/**
 * Configure les politiques RLS pour la table companies
 * @param {string} tableName - Le nom de la table
 */
async function configureCompaniesRLS(tableName) {
  // Politique pour la lecture (SELECT)
  await createPolicy(tableName, 'Les administrateurs peuvent voir toutes les entreprises', {
    operation: 'SELECT',
    using: "auth.jwt() ? 'admin_access' OR auth.jwt() ? 'company_access'",
    roles: 'authenticated'
  });
  
  // Politique pour la modification (UPDATE)
  await createPolicy(tableName, 'Les administrateurs peuvent modifier toutes les entreprises', {
    operation: 'UPDATE',
    using: "auth.jwt() ? 'admin_access'",
    roles: 'authenticated'
  });
  
  // Politique pour la suppression (DELETE)
  await createPolicy(tableName, 'Les administrateurs peuvent supprimer des entreprises', {
    operation: 'DELETE',
    using: "auth.jwt() ? 'admin_access'",
    roles: 'authenticated'
  });
  
  // Politique pour l'insertion (INSERT)
  await createPolicy(tableName, 'Les administrateurs peuvent ajouter des entreprises', {
    operation: 'INSERT',
    check: "auth.jwt() ? 'admin_access'",
    roles: 'authenticated'
  });
}

/**
 * Configure les politiques RLS pour les tables de profils utilisateurs
 * @param {string} tableName - Le nom de la table
 */
async function configureUserProfilesRLS(tableName) {
  // Politique pour la lecture (SELECT)
  await createPolicy(tableName, 'Les utilisateurs peuvent voir leur propre profil', {
    operation: 'SELECT',
    using: "auth.uid() = user_id OR auth.jwt() ? 'admin_access'",
    roles: 'authenticated'
  });
  
  // Politique pour la modification (UPDATE)
  await createPolicy(tableName, 'Les utilisateurs peuvent mettre à jour leur propre profil', {
    operation: 'UPDATE',
    using: "auth.uid() = user_id OR auth.jwt() ? 'admin_access'",
    roles: 'authenticated'
  });
  
  // Politique pour l'insertion (INSERT)
  await createPolicy(tableName, 'Les utilisateurs peuvent créer leur propre profil', {
    operation: 'INSERT',
    check: "auth.uid() = user_id OR auth.jwt() ? 'admin_access'",
    roles: 'authenticated'
  });
  
  // Politique pour la suppression (DELETE)
  await createPolicy(tableName, 'Les administrateurs peuvent supprimer des profils', {
    operation: 'DELETE',
    using: "auth.jwt() ? 'admin_access'",
    roles: 'authenticated'
  });
}

/**
 * Configure des politiques RLS génériques pour une table
 * @param {string} tableName - Le nom de la table
 */
async function configureGenericRLS(tableName) {
  // Politique pour la lecture (SELECT) - Accessible aux utilisateurs authentifiés
  await createPolicy(tableName, `Lecture pour utilisateurs authentifiés - ${tableName}`, {
    operation: 'SELECT',
    using: 'true',
    roles: 'authenticated'
  });
  
  // Politique pour la modification (UPDATE) - Réservée aux administrateurs
  await createPolicy(tableName, `Modification réservée aux administrateurs - ${tableName}`, {
    operation: 'UPDATE',
    using: "auth.jwt() ? 'admin_access'",
    roles: 'authenticated'
  });
  
  // Politique pour l'insertion (INSERT) - Réservée aux administrateurs
  await createPolicy(tableName, `Insertion réservée aux administrateurs - ${tableName}`, {
    operation: 'INSERT',
    check: "auth.jwt() ? 'admin_access'",
    roles: 'authenticated'
  });
  
  // Politique pour la suppression (DELETE) - Réservée aux administrateurs
  await createPolicy(tableName, `Suppression réservée aux administrateurs - ${tableName}`, {
    operation: 'DELETE',
    using: "auth.jwt() ? 'admin_access'",
    roles: 'authenticated'
  });
}

// Exécuter la fonction de configuration
configureRLS().then(() => {
  console.log('Configuration terminée.');
  process.exit(0);
}).catch(error => {
  console.error('Erreur:', error);
  process.exit(1);
}); 