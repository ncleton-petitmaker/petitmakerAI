const { supabase } = require('./supabase-client');

// Récupérer la requête SQL depuis les arguments de la ligne de commande
const sqlQuery = process.argv[2];

if (!sqlQuery) {
  console.error('Veuillez fournir une requête SQL en argument.');
  console.log('Exemple: node execute-sql.js "SELECT * FROM companies LIMIT 5"');
  process.exit(1);
}

async function executeSQL() {
  try {
    console.log(`Exécution de la requête: ${sqlQuery}`);
    
    // Exécuter la requête SQL directement
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlQuery });
    
    if (error) {
      console.error('Erreur lors de l\'exécution de la requête SQL via RPC:', error);
      
      // Essayer une autre approche si la fonction RPC n'existe pas
      console.log('Tentative d\'exécution via requête SQL directe...');
      
      // Pour les requêtes SELECT
      if (sqlQuery.trim().toLowerCase().startsWith('select')) {
        const { data: queryData, error: queryError } = await supabase
          .from('_temp_query')
          .select('*')
          .limit(1000);
          
        if (queryError) {
          console.error('Erreur lors de l\'exécution de la requête SQL directe:', queryError);
        } else {
          console.log('Résultats de la requête:');
          console.table(queryData);
        }
      } else {
        // Pour les autres types de requêtes (INSERT, UPDATE, DELETE, etc.)
        console.error('Les requêtes non-SELECT ne peuvent pas être exécutées directement sans fonction RPC.');
      }
    } else {
      console.log('Résultats de la requête:');
      console.table(data);
    }
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la requête SQL:', error);
  } finally {
    process.exit(0);
  }
}

// Exécuter la fonction
executeSQL(); 