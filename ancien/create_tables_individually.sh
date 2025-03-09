#!/bin/bash

# Variables d'environnement Supabase
SUPABASE_URL="https://efgirjtbuzljtzpuwsue.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMjU0MDQsImV4cCI6MjA1NTgwMTQwNH0.aY8wI1r5RW78L0yjYX5wNBD6bY0Ybqbm6JdiUeejVR4"

echo "Création des tables dans Supabase..."

# Vérifier si la table user_profiles existe
echo "Vérification de la table user_profiles..."
curl -s -X GET "$SUPABASE_URL/rest/v1/user_profiles?limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "Création de la table user_profiles..."
  curl -X POST "$SUPABASE_URL/rest/v1/rpc/create_user_profiles_table_if_not_exists" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -d "{}"
fi

# Vérifier si la table notifications existe
echo "Vérification de la table notifications..."
curl -s -X GET "$SUPABASE_URL/rest/v1/notifications?limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "Création de la table notifications..."
  curl -X POST "$SUPABASE_URL/rest/v1/rpc/create_notifications_table_if_not_exists" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -d "{}"
fi

# Vérifier si la table companies existe
echo "Vérification de la table companies..."
curl -s -X GET "$SUPABASE_URL/rest/v1/companies?limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "Création de la table companies..."
  curl -X POST "$SUPABASE_URL/rest/v1/rpc/create_companies_table_if_not_exists" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -d "{}"
fi

# Vérifier si la table learners existe
echo "Vérification de la table learners..."
curl -s -X GET "$SUPABASE_URL/rest/v1/learners?limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "Création de la table learners..."
  curl -X POST "$SUPABASE_URL/rest/v1/rpc/create_learners_table_if_not_exists" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -d "{}"
fi

# Vérifier si la table documents existe
echo "Vérification de la table documents..."
curl -s -X GET "$SUPABASE_URL/rest/v1/documents?limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "Création de la table documents..."
  curl -X POST "$SUPABASE_URL/rest/v1/rpc/create_documents_table_if_not_exists" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -d "{}"
fi

# Vérifier si la table trainings existe
echo "Vérification de la table trainings..."
curl -s -X GET "$SUPABASE_URL/rest/v1/trainings?limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "Création de la table trainings..."
  curl -X POST "$SUPABASE_URL/rest/v1/rpc/create_trainings_table_if_not_exists" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -d "{}"
fi

echo "Vérification finale des tables..."
echo "Vérification de user_profiles..."
curl -s -X GET "$SUPABASE_URL/rest/v1/user_profiles?limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY"

echo "Vérification de notifications..."
curl -s -X GET "$SUPABASE_URL/rest/v1/notifications?limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY"

echo "Vérification de companies..."
curl -s -X GET "$SUPABASE_URL/rest/v1/companies?limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY"

echo "Vérification de learners..."
curl -s -X GET "$SUPABASE_URL/rest/v1/learners?limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY"

echo "Vérification de documents..."
curl -s -X GET "$SUPABASE_URL/rest/v1/documents?limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY"

echo "Vérification de trainings..."
curl -s -X GET "$SUPABASE_URL/rest/v1/trainings?limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY"

echo "Création des tables terminée!"