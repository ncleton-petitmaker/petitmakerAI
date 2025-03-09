#!/bin/bash

# Script pour exécuter tous les scripts SQL de vérification et de correction
# Ce script utilise psql pour exécuter les scripts SQL

# Configuration
DB_NAME="votre_base_de_donnees"
DB_USER="votre_utilisateur"
DB_HOST="localhost"
DB_PORT="5432"

# Fonction pour exécuter un script SQL
run_sql_script() {
    echo "Exécution du script $1..."
    psql -d $DB_NAME -U $DB_USER -h $DB_HOST -p $DB_PORT -f $1
    if [ $? -eq 0 ]; then
        echo "Script $1 exécuté avec succès."
    else
        echo "Erreur lors de l'exécution du script $1."
        exit 1
    fi
    echo ""
}

# Vérifier si psql est installé
if ! command -v psql &> /dev/null; then
    echo "psql n'est pas installé. Veuillez installer PostgreSQL."
    exit 1
fi

echo "=== Exécution des scripts SQL de vérification et de correction ==="
echo ""

# Demander les informations de connexion si elles ne sont pas définies
if [ "$DB_NAME" = "votre_base_de_donnees" ]; then
    read -p "Nom de la base de données: " DB_NAME
fi

if [ "$DB_USER" = "votre_utilisateur" ]; then
    read -p "Nom d'utilisateur: " DB_USER
fi

# Exécuter les scripts SQL dans l'ordre
echo "1. Vérification des politiques sur la table user_profiles"
run_sql_script "check_user_profiles_policies.sql"

echo "2. Vérification des politiques sur la table trainings"
run_sql_script "check_trainings_policies.sql"

echo "3. Vérification des politiques sur la table trainers"
run_sql_script "check_trainers_policies.sql"

echo "4. Vérification des politiques sur la table companies"
run_sql_script "check_companies_policies.sql"

echo "5. Vérification des références à training_participants dans le code"
run_sql_script "check_code_references.sql"

echo "6. Remplacement de training_participants par user_profiles"
run_sql_script "replace_training_participants_with_user_profiles.sql"

echo "7. Mise à jour des références à training_participants dans la base de données"
run_sql_script "update_database_references.sql"

echo "8. Vérification de toutes les politiques"
run_sql_script "check_all_policies.sql"

echo ""
echo "=== Tous les scripts ont été exécutés avec succès ==="
echo ""
echo "Recherche des références à training_participants dans le code source..."
./find_training_participants_references.sh

echo ""
echo "=== Vérification terminée ===" 