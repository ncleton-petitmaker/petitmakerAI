const { supabase } = require('./supabase-client');
const fetch = require('node-fetch');

async function createMigration() {
  try {
    console.log('Création de la migration SQL...');
    
    // Définir la migration SQL
    const migrationSQL = `
      -- Création de la fonction pour exécuter des requêtes SQL arbitraires
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

      -- Création de la fonction pour récupérer la liste des tables
      CREATE OR REPLACE FUNCTION get_tables()
      RETURNS TABLE (tablename text)
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY SELECT t.tablename::text
        FROM pg_catalog.pg_tables t
        WHERE t.schemaname = 'public';
      END;
      $$;

      -- Création de la fonction pour récupérer la structure d'une table
      CREATE OR REPLACE FUNCTION get_columns(table_name text)
      RETURNS TABLE (
        column_name text,
        data_type text,
        is_nullable text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY SELECT 
          c.column_name::text,
          c.data_type::text,
          c.is_nullable::text
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = table_name;
      END;
      $$;

      -- Vérifier si la table training_participants existe et la remplacer par user_profiles si nécessaire
      DO $$
      DECLARE
        training_participants_exists BOOLEAN;
        user_profiles_exists BOOLEAN;
      BEGIN
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'training_participants'
        ) INTO training_participants_exists;
        
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'user_profiles'
        ) INTO user_profiles_exists;
        
        IF training_participants_exists AND NOT user_profiles_exists THEN
          -- Créer la table user_profiles basée sur training_participants
          EXECUTE 'CREATE TABLE user_profiles AS SELECT * FROM training_participants';
          
          -- Ajouter les contraintes et index nécessaires
          EXECUTE 'ALTER TABLE user_profiles ADD PRIMARY KEY (id)';
          
          -- Créer les politiques de sécurité pour user_profiles
          EXECUTE '
            CREATE POLICY "Les utilisateurs peuvent voir leur propre profil" 
            ON user_profiles FOR SELECT 
            USING (auth.uid() = user_id);
            
            CREATE POLICY "Les utilisateurs peuvent mettre à jour leur propre profil" 
            ON user_profiles FOR UPDATE 
            USING (auth.uid() = user_id);
          ';
          
          -- Optionnellement, supprimer la table training_participants
          -- EXECUTE 'DROP TABLE training_participants';
        END IF;
      END $$;
    `;
    
    // Exécuter la migration via l'API REST de Supabase
    console.log('Exécution de la migration via l\'API REST...');
    
    const response = await fetch('https://efgirjtbuzljtzpuwsue.supabase.co/rest/v1/rpc/query_db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMjU0MDQsImV4cCI6MjA1NTgwMTQwNH0.aY8wI1r5RW78L0yjYX5wNBD6bY0Ybqbm6JdiUeejVR4',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk'
      },
      body: JSON.stringify({ sql_query: migrationSQL })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erreur lors de l\'exécution de la migration via l\'API REST:', errorData);
      
      // Essayer une autre approche
      console.log('Tentative d\'exécution de la migration via le client Supabase...');
      
      // Exécuter la migration via le client Supabase
      const { error } = await supabase.rpc('query_db', { sql_query: migrationSQL });
      
      if (error) {
        console.error('Erreur lors de l\'exécution de la migration via le client Supabase:', error);
      } else {
        console.log('Migration exécutée avec succès via le client Supabase.');
      }
    } else {
      console.log('Migration exécutée avec succès via l\'API REST.');
    }
    
    // Vérifier si les fonctions ont été créées
    console.log('Vérification des fonctions créées...');
    
    const { data: functions, error: functionsError } = await supabase
      .from('pg_catalog.pg_proc')
      .select('proname')
      .eq('pronamespace', 'public');
    
    if (functionsError) {
      console.error('Erreur lors de la vérification des fonctions:', functionsError);
    } else {
      console.log('Fonctions disponibles:', functions ? functions.map(f => f.proname) : []);
    }
    
  } catch (error) {
    console.error('Erreur lors de la création de la migration:', error);
  } finally {
    process.exit(0);
  }
}

// Exécuter la fonction
createMigration(); 