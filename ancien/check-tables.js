const { supabase } = require('./supabase-client');

async function checkTables() {
  try {
    console.log('Vérification des tables dans la base de données...');
    
    // Récupérer la liste des tables
    const { data: tables, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) {
      console.error('Erreur lors de la récupération des tables:', tablesError);
      
      // Essayer une autre approche
      const { data, error } = await supabase.rpc('query_db', { 
        sql_query: `
          SELECT tablename 
          FROM pg_catalog.pg_tables 
          WHERE schemaname = 'public'
        `
      });
      
      if (error) {
        console.error('Erreur lors de la récupération des tables via RPC:', error);
        return;
      }
      
      console.log('Tables disponibles:', data);
      
      // Vérifier si la table training_participants existe
      const hasTrainingParticipants = data.some(table => table.tablename === 'training_participants');
      const hasUserProfiles = data.some(table => table.tablename === 'user_profiles');
      
      if (hasTrainingParticipants) {
        console.warn('ALERTE: La table training_participants existe et devrait être remplacée par user_profiles');
        
        // Vérifier la structure de la table training_participants
        const { data: trainingParticipantsColumns, error: columnsError } = await supabase.rpc('query_db', {
          sql_query: `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'training_participants'
          `
        });
        
        if (!columnsError) {
          console.log('Structure de la table training_participants:');
          console.table(trainingParticipantsColumns);
        }
        
        // Vérifier la structure de la table user_profiles
        if (hasUserProfiles) {
          const { data: userProfilesColumns, error: userProfilesError } = await supabase.rpc('query_db', {
            sql_query: `
              SELECT column_name, data_type, is_nullable
              FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'user_profiles'
            `
          });
          
          if (!userProfilesError) {
            console.log('Structure de la table user_profiles:');
            console.table(userProfilesColumns);
          }
        } else {
          console.warn('La table user_profiles n\'existe pas. Elle devrait être créée pour remplacer training_participants.');
        }
      } else {
        console.log('La table training_participants n\'existe pas, ce qui est correct.');
      }
      
      // Vérifier la structure de la table companies
      const { data: companiesColumns, error: companiesError } = await supabase.rpc('query_db', {
        sql_query: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'companies'
        `
      });
      
      if (companiesError) {
        console.error('Erreur lors de la récupération de la structure de la table companies:', companiesError);
      } else {
        console.log('Structure de la table companies:');
        console.table(companiesColumns);
        
        // Récupérer quelques exemples de données
        const { data: companySamples, error: samplesError } = await supabase.rpc('query_db', {
          sql_query: `SELECT * FROM companies LIMIT 5`
        });
        
        if (!samplesError && companySamples.length > 0) {
          console.log('Exemples de données dans la table companies:');
          console.table(companySamples);
        }
      }
    } else {
      console.log('Tables disponibles:', tables.map(t => t.tablename));
      
      // Vérifier si la table training_participants existe
      const hasTrainingParticipants = tables.some(table => table.tablename === 'training_participants');
      const hasUserProfiles = tables.some(table => table.tablename === 'user_profiles');
      
      if (hasTrainingParticipants) {
        console.warn('ALERTE: La table training_participants existe et devrait être remplacée par user_profiles');
      } else {
        console.log('La table training_participants n\'existe pas, ce qui est correct.');
      }
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des tables:', error);
  } finally {
    process.exit(0);
  }
}

// Exécuter la fonction
checkTables(); 