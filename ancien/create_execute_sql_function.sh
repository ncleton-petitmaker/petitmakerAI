#!/bin/bash

# Variables d'environnement Supabase
SUPABASE_URL="https://efgirjtbuzljtzpuwsue.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMjU0MDQsImV4cCI6MjA1NTgwMTQwNH0.aY8wI1r5RW78L0yjYX5wNBD6bY0Ybqbm6JdiUeejVR4"

echo "Création de la fonction execute_sql..."

# SQL pour créer la fonction execute_sql
SQL_FUNCTION="
CREATE OR REPLACE FUNCTION execute_sql(sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS \$\$
BEGIN
  EXECUTE sql;
END;
\$\$;
"

# Exécuter le SQL directement via l'API REST
echo "Exécution du SQL..."
curl -X POST "$SUPABASE_URL/rest/v1/sql" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$SQL_FUNCTION" | jq -Rs .)}"

echo "Création de la fonction execute_sql terminée!" 