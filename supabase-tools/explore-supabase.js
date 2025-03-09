import {
  listTables,
  getTableStructure,
  getPolicies,
  selectFromTable
} from './supabase-direct.js';

/**
 * Explore la structure complète de la base de données Supabase
 */
async function exploreDatabase() {
  try {
    console.log('Exploration de la base de données Supabase...');
    
    // 1. Lister toutes les tables
    console.log('\n=== TABLES DISPONIBLES ===');
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
    
    // 2. Explorer la structure de chaque table
    for (const table of tables) {
      const tableName = table.tablename;
      console.log(`\n=== STRUCTURE DE LA TABLE ${tableName.toUpperCase()} ===`);
      
      const structureResult = await getTableStructure(tableName);
      
      if (!structureResult.success) {
        console.error(`Erreur lors de la récupération de la structure de la table ${tableName}.`);
        continue;
      }
      
      // 3. Récupérer les politiques de sécurité pour cette table
      console.log(`\n=== POLITIQUES DE SÉCURITÉ POUR ${tableName.toUpperCase()} ===`);
      const policiesResult = await getPolicies(tableName);
      
      if (!policiesResult.success) {
        console.error(`Erreur lors de la récupération des politiques pour la table ${tableName}.`);
      } else if (!policiesResult.policies || policiesResult.policies.length === 0) {
        console.log(`Aucune politique de sécurité trouvée pour la table ${tableName}.`);
      }
      
      // 4. Récupérer quelques exemples de données
      console.log(`\n=== EXEMPLES DE DONNÉES DANS ${tableName.toUpperCase()} ===`);
      const dataResult = await selectFromTable(tableName, { limit: 5 });
      
      if (!dataResult.success) {
        console.error(`Erreur lors de la récupération des données de la table ${tableName}.`);
      } else if (!dataResult.data || dataResult.data.length === 0) {
        console.log(`Aucune donnée trouvée dans la table ${tableName}.`);
      }
    }
    
    // 5. Vérifier les relations entre les tables
    console.log('\n=== RELATIONS ENTRE LES TABLES ===');
    const relationsQuery = `
      SELECT
        tc.table_schema, 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
    `;
    
    const relationsResult = await executeSQL(relationsQuery);
    
    if (relationsResult.error) {
      console.error('Erreur lors de la récupération des relations entre les tables.');
    } else if (!relationsResult.data || relationsResult.data.length === 0) {
      console.log('Aucune relation de clé étrangère trouvée entre les tables.');
    }
    
    // 6. Vérifier les fonctions disponibles
    console.log('\n=== FONCTIONS DISPONIBLES ===');
    const functionsQuery = `
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
    `;
    
    const functionsResult = await executeSQL(functionsQuery);
    
    if (functionsResult.error) {
      console.error('Erreur lors de la récupération des fonctions.');
    } else if (!functionsResult.data || functionsResult.data.length === 0) {
      console.log('Aucune fonction trouvée dans la base de données.');
    }
    
    console.log('\nExploration terminée.');
  } catch (error) {
    console.error('Erreur lors de l\'exploration de la base de données:', error);
  }
}

// Exécuter la fonction d'exploration
exploreDatabase().then(() => {
  console.log('Terminé.');
  process.exit(0);
}).catch(error => {
  console.error('Erreur:', error);
  process.exit(1);
}); 