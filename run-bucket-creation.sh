#!/bin/bash

# Script pour exécuter tous les scripts de création du bucket dans le bon ordre
# et avec toutes les dépendances nécessaires

# Couleurs pour une meilleure lisibilité
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Script de création du bucket organization-seals ===${NC}"
echo -e "${BLUE}Ce script va essayer toutes les méthodes disponibles pour créer le bucket${NC}"

# Vérifie que Node.js est installé
if ! command -v node &> /dev/null; then
    echo -e "${RED}Erreur: Node.js n'est pas installé.${NC}"
    echo -e "${YELLOW}Veuillez installer Node.js (v14 ou supérieur) et réessayer.${NC}"
    exit 1
fi

# Vérifie que npm est installé
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Erreur: npm n'est pas installé.${NC}"
    echo -e "${YELLOW}Veuillez installer npm et réessayer.${NC}"
    exit 1
fi

# Installation des dépendances
echo -e "\n${BLUE}=== Installation des dépendances nécessaires ===${NC}"
npm install @supabase/supabase-js dotenv pg

# Vérifie que le fichier .env existe
if [ ! -f .env ]; then
    echo -e "\n${YELLOW}Le fichier .env n'existe pas. Création d'un modèle...${NC}"
    cat > .env << EOF
# Informations Supabase (obligatoires)
SUPABASE_URL=https://efgirjtbuzljtzpuwsue.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk

# Informations PostgreSQL (optionnelles pour la connexion directe)
POSTGRES_PASSWORD=
POSTGRES_HOST=
POSTGRES_USER=postgres
POSTGRES_DB=postgres
EOF
    echo -e "${YELLOW}Veuillez vérifier et modifier le fichier .env si nécessaire avant de continuer.${NC}"
    read -p "Appuyez sur Entrée pour continuer ou Ctrl+C pour quitter..."
fi

# Fonction pour vérifier le résultat d'un script
check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Le script a terminé avec succès!${NC}"
        return 0
    else
        echo -e "${RED}❌ Le script a échoué avec une erreur.${NC}"
        return 1
    fi
}

# Méthode 1: Script tout-en-un via API
echo -e "\n${BLUE}=== MÉTHODE 1: Exécution du script tout-en-un (API) ===${NC}"
node create-bucket-all-methods.js
if check_result; then
    # Vérifie si le script a réussi à créer le bucket
    grep -q "Le bucket \"organization-seals\" existe" ./create-bucket-all-methods.log 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Le bucket a été créé avec succès!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️ Le script s'est exécuté mais le bucket n'a peut-être pas été créé.${NC}"
        echo -e "${YELLOW}Passage à la méthode suivante...${NC}"
    fi
else
    echo -e "${YELLOW}Passage à la méthode suivante...${NC}"
fi

# Méthode 2: Connexion directe PostgreSQL
echo -e "\n${BLUE}=== MÉTHODE 2: Connexion directe PostgreSQL ===${NC}"
# Vérifie si le mot de passe PostgreSQL est défini
if grep -q "POSTGRES_PASSWORD=" .env && ! grep -q "POSTGRES_PASSWORD=.\+" .env; then
    echo -e "${YELLOW}⚠️ Le mot de passe PostgreSQL n'est pas défini dans le fichier .env${NC}"
    echo -e "${YELLOW}Cette méthode peut ne pas fonctionner sans cela.${NC}"
    read -p "Voulez-vous continuer quand même? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Passage à la méthode suivante...${NC}"
    else
        node create-bucket-sql.js
        if check_result; then
            echo -e "${GREEN}✅ La méthode PostgreSQL semble avoir réussi!${NC}"
            exit 0
        else
            echo -e "${YELLOW}Passage à la méthode suivante...${NC}"
        fi
    fi
else
    node create-bucket-sql.js
    if check_result; then
        echo -e "${GREEN}✅ La méthode PostgreSQL semble avoir réussi!${NC}"
        exit 0
    else
        echo -e "${YELLOW}Passage à la méthode suivante...${NC}"
    fi
fi

# Méthode 3: Scripts individuels pour diagnostic
echo -e "\n${BLUE}=== MÉTHODE 3: Scripts individuels pour diagnostic ===${NC}"

echo -e "\n${BLUE}3.1: Création directe via HTTP${NC}"
node direct-create-bucket.js
check_result

echo -e "\n${BLUE}3.2: Appel de fonction RPC${NC}"
node call-rpc-function.js
check_result

echo -e "\n${BLUE}3.3: Création via table intermédiaire${NC}"
node insert-manual-bucket.js
check_result

# Conclusion
echo -e "\n${BLUE}=== CONCLUSION ===${NC}"
echo -e "${YELLOW}Tous les scripts ont été exécutés.${NC}"
echo -e "${YELLOW}Si le bucket 'organization-seals' n'a pas été créé, voici les étapes à suivre :${NC}"
echo -e "${YELLOW}1. Vérifiez les erreurs dans les sorties des scripts ci-dessus${NC}"
echo -e "${YELLOW}2. Créez le bucket manuellement via l'interface Supabase${NC}"
echo -e "${YELLOW}3. Exécutez le script SQL 'all-methods-policies.sql' dans l'éditeur SQL de Supabase${NC}"

echo -e "\n${GREEN}Script terminé!${NC}" 