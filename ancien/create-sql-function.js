const { supabase } = require('./supabase-client');

async function createSQLFunction() {
  try {
    console.log('Création de la fonction SQL pour exécuter des requêtes arbitraires...');
    
    // Vérifier si la fonction existe déjà
    const checkFunctionQuery = `
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'exec_sql'
    `;
    
    const { data: functionExists, error: checkError } = await supabase
      .from('_temp_query')
      .select('*')
      .eq('routine_name', 'exec_sql')
      .maybeSingle();
    
    if (checkError) {
      console.log('Erreur lors de la vérification de la fonction, tentative de création...');
    } else if (functionExists) {
      console.log('La fonction exec_sql existe déjà.');
      return;
    }
    
    // Créer la fonction SQL
    const createFunctionQuery = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result JSONB;
      BEGIN
        EXECUTE sql INTO result;
        RETURN result;
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
      END;
      $$;
    `;
    
    // Exécuter la requête pour créer la fonction
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createFunctionQuery });
    
    if (createError) {
      console.error('Erreur lors de la création de la fonction SQL:', createError);
      
      // Essayer une autre approche
      console.log('Tentative de création de la fonction via une migration SQL...');
      
      // Utiliser l'API REST de Supabase pour exécuter une migration SQL
      const response = await fetch('https://efgirjtbuzljtzpuwsue.supabase.co/rest/v1/rpc/exec_sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMjU0MDQsImV4cCI6MjA1NTgwMTQwNH0.aY8wI1r5RW78L0yjYX5wNBD6bY0Ybqbm6JdiUeejVR4',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk'
        },
        body: JSON.stringify({ sql: createFunctionQuery })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur lors de la création de la fonction via l\'API REST:', errorData);
      } else {
        console.log('Fonction SQL créée avec succès via l\'API REST.');
      }
    } else {
      console.log('Fonction SQL créée avec succès.');
    }
    
    // Créer une fonction alternative pour exécuter des requêtes SQL
    console.log('Création d\'une fonction alternative pour exécuter des requêtes SQL...');
    
    const createAlternativeFunctionQuery = `
      CREATE OR REPLACE FUNCTION query_db(sql_query text)
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result JSONB;
      BEGIN
        EXECUTE sql_query INTO result;
        RETURN result;
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
      END;
      $$;
    `;
    
    // Exécuter la requête pour créer la fonction alternative
    const { error: altCreateError } = await supabase.rpc('exec_sql', { sql: createAlternativeFunctionQuery });
    
    if (altCreateError) {
      console.error('Erreur lors de la création de la fonction alternative:', altCreateError);
    } else {
      console.log('Fonction alternative query_db créée avec succès.');
    }
    
  } catch (error) {
    console.error('Erreur lors de la création de la fonction SQL:', error);
  } finally {
    process.exit(0);
  }
}

// Exécuter la fonction
createSQLFunction(); 