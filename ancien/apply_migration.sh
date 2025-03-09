#!/bin/bash

# Variables d'environnement Supabase
SUPABASE_URL="https://efgirjtbuzljtzpuwsue.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMjU0MDQsImV4cCI6MjA1NTgwMTQwNH0.aY8wI1r5RW78L0yjYX5wNBD6bY0Ybqbm6JdiUeejVR4"

# Lire le contenu du fichier SQL
SQL_CONTENT=$(cat supabase/migrations/20250304140000_fix_missing_tables.sql)

# Exécuter le SQL via l'API REST
echo "Applying migration..."
curl -X POST "$SUPABASE_URL/rest/v1/rpc/execute_sql" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"sql\": $(echo "$SQL_CONTENT" | jq -Rs .)}"

echo "Migration completed!"