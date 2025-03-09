#!/bin/bash

# Script pour rechercher les références à training_participants dans le code source
# et les remplacer par user_profiles

echo "Recherche des références à training_participants dans le code source..."

# Rechercher les fichiers contenant des références à training_participants
echo "Fichiers contenant des références à training_participants:"
grep -r "training_participants" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.sql" . | grep -v "find_training_participants_references.sh" | grep -v "replace_training_participants_with_user_profiles.sql"

echo ""
echo "ATTENTION: Veuillez mettre à jour toutes les références à training_participants dans votre code pour utiliser user_profiles à la place."
echo ""

# Demander confirmation avant de remplacer automatiquement
read -p "Voulez-vous remplacer automatiquement toutes les occurrences de 'training_participants' par 'user_profiles' dans les fichiers source? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "Remplacement automatique en cours..."
    
    # Remplacer les occurrences dans les fichiers TypeScript/JavaScript
    find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' 's/training_participants/user_profiles/g' {} \;
    
    # Remplacer les occurrences dans les fichiers SQL (sauf les scripts de migration)
    find . -type f -name "*.sql" -not -name "replace_training_participants_with_user_profiles.sql" -not -name "check_all_policies.sql" -exec sed -i '' 's/training_participants/user_profiles/g' {} \;
    
    echo "Remplacement terminé."
    echo "Veuillez vérifier les modifications et tester votre application."
else
    echo "Aucun remplacement automatique effectué."
    echo "Veuillez effectuer les remplacements manuellement."
fi

echo ""
echo "Recherche terminée." 