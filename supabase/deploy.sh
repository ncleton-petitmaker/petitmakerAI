#!/bin/bash

# Script pour déployer les fonctions SQL dans Supabase

# Vérifier si la CLI Supabase est installée
if ! command -v supabase &> /dev/null; then
    echo "La CLI Supabase n'est pas installée. Veuillez l'installer d'abord."
    echo "Instructions: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Vérifier si le projet Supabase est initialisé
if [ ! -f "supabase/config.toml" ]; then
    echo "Le projet Supabase ne semble pas être initialisé."
    echo "Initialisation du projet Supabase..."
    supabase init
fi

# Déployer les migrations
echo "Déploiement des migrations SQL..."
supabase db push

# Si vous préférez exécuter directement le fichier SQL sans utiliser la CLI
# Vous pouvez décommenter les lignes suivantes et configurer vos variables d'environnement

# SUPABASE_URL="votre_url_supabase"
# SUPABASE_KEY="votre_clé_service_supabase"
# SQL_FILE="migrations/create_table_functions.sql"

# if [ -f "$SQL_FILE" ]; then
#     echo "Exécution du fichier SQL $SQL_FILE..."
#     curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
#         -H "apikey: $SUPABASE_KEY" \
#         -H "Authorization: Bearer $SUPABASE_KEY" \
#         -H "Content-Type: application/json" \
#         -d "{\"sql\": \"$(cat $SQL_FILE | tr -d '\n' | sed 's/"/\\"/g')\"}"
# else
#     echo "Fichier SQL $SQL_FILE non trouvé."
#     exit 1
# fi

echo "Déploiement terminé avec succès!" 