#!/bin/bash

# Variables d'environnement Supabase
SUPABASE_URL="https://efgirjtbuzljtzpuwsue.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMjU0MDQsImV4cCI6MjA1NTgwMTQwNH0.aY8wI1r5RW78L0yjYX5wNBD6bY0Ybqbm6JdiUeejVR4"
SQL_FILE="supabase/migrations/create_table_functions.sql"

echo "Création des tables dans Supabase..."

# Vérifier si le fichier SQL existe
if [ ! -f "$SQL_FILE" ]; then
    echo "Erreur: Fichier SQL $SQL_FILE non trouvé."
    exit 1
fi

# Lire le contenu du fichier SQL
SQL_CONTENT=$(cat "$SQL_FILE")

# Exécuter le SQL via la fonction execute_sql
echo "Exécution du SQL..."
curl -X POST "$SUPABASE_URL/rest/v1/rpc/execute_sql" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"sql\": $(echo "$SQL_CONTENT" | jq -Rs .)}"

echo "Vérification de la création des tables..."

# Vérifier si les tables ont été créées
echo "Vérification de la table user_profiles..."
curl -s -X GET "$SUPABASE_URL/rest/v1/user_profiles?limit=1" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"

echo "Vérification de la table companies..."
curl -s -X GET "$SUPABASE_URL/rest/v1/companies?limit=1" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"

echo "Vérification de la table learners..."
curl -s -X GET "$SUPABASE_URL/rest/v1/learners?limit=1" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"

echo "Vérification de la table trainings..."
curl -s -X GET "$SUPABASE_URL/rest/v1/trainings?limit=1" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"

echo "Création des tables terminée!" 