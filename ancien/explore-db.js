const { supabase, exploreTables, checkTrainingParticipantsTable, executeSQL } = require('./supabase-client');

// Fonction principale pour explorer la base de données
async function main() {
  try {
    console.log('Vérification de la structure de la base de données...');
    
    // Vérifier si la table training_participants existe
    const tableCheck = await checkTrainingParticipantsTable();
    
    // Récupérer la liste des tables
    const { data: tables, error: tablesError } = await supabase.rpc('get_tables');
    
    if (tablesError) {
      // Si la fonction RPC n'existe pas, utiliser une requête SQL directe
      console.log('Tentative de récupération des tables via SQL...');
      const tablesData = await executeSQL(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      if (tablesData) {
        console.log('Tables disponibles:', tablesData.map(t => t.table_name));
        
        // Explorer la structure de chaque table
        for (const tableRow of tablesData) {
          const tableName = tableRow.table_name;
          const columnsData = await executeSQL(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = '${tableName}'
          `);
          
          console.log(`\nStructure de la table ${tableName}:`);
          console.table(columnsData);
        }
      }
    } else {
      console.log('Tables disponibles:', tables);
    }
    
    // Vérifier spécifiquement la table companies mentionnée dans CompaniesView.tsx
    console.log('\nExamen de la table companies...');
    const companiesData = await executeSQL(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'companies'
    `);
    
    if (companiesData && companiesData.length > 0) {
      console.log('Structure de la table companies:');
      console.table(companiesData);
      
      // Récupérer quelques exemples de données
      const companySamples = await executeSQL(`
        SELECT * FROM companies LIMIT 5
      `);
      
      console.log('\nExemples de données dans la table companies:');
      console.table(companySamples);
    } else {
      console.log('La table companies n\'existe pas ou est vide.');
    }
    
    // Vérifier les relations entre les tables
    console.log('\nExamen des relations entre les tables...');
    const foreignKeys = await executeSQL(`
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
    `);
    
    if (foreignKeys && foreignKeys.length > 0) {
      console.log('Relations entre les tables:');
      console.table(foreignKeys);
    } else {
      console.log('Aucune relation de clé étrangère trouvée.');
    }
    
    // Vérifier les politiques de sécurité
    console.log('\nExamen des politiques de sécurité...');
    const policies = await executeSQL(`
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      ORDER BY tablename
    `);
    
    if (policies && policies.length > 0) {
      console.log('Politiques de sécurité:');
      console.table(policies);
    } else {
      console.log('Aucune politique de sécurité trouvée.');
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'exploration de la base de données:', error);
  } finally {
    process.exit(0);
  }
}

// Exécuter la fonction principale
main(); 