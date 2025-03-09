#!/bin/bash
SUPABASE_URL="https://efgirjtbuzljtzpuwsue.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMjU0MDQsImV4cCI6MjA1NTgwMTQwNH0.aY8wI1r5RW78L0yjYX5wNBD6bY0Ybqbm6JdiUeejVR4"
SQL_FILE="migrations/create_table_functions.sql"
echo "Création des tables dans Supabase..."
if [ ! -f "$SQL_FILE" ]; then echo "Erreur: Fichier SQL $SQL_FILE non trouvé."; exit 1; fi
SQL_CONTENT=$(cat "$SQL_FILE")
echo "Exécution du SQL..."
curl -X POST "$SUPABASE_URL/rest/v1/rpc/execute_sql" -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY" -H "Content-Type: application/json" -d "{\"sql\": $(echo "$SQL_CONTENT" | jq -Rs .)}"
