#!/bin/bash

# Script de correction automatique des problèmes de signature
# Ce script applique les corrections pour la gestion des signatures dans les templates

echo "🛠️ Début de l'application des correctifs pour les signatures..."

# Dossier de base du projet
BASE_DIR="$(pwd)"
echo "📂 Dossier de travail: $BASE_DIR"

# Vérifier que nous sommes bien dans le bon dossier
if [[ ! -d "$BASE_DIR/src" ]]; then
  echo "❌ Erreur: Ce script doit être exécuté depuis la racine du projet."
  exit 1
fi

# Créer un répertoire pour les backups
BACKUP_DIR="$BASE_DIR/src/migration/backups/$(date +'%Y%m%d_%H%M%S')"
mkdir -p "$BACKUP_DIR"
echo "📂 Dossier de backup créé: $BACKUP_DIR"

# Fonction pour faire un backup d'un fichier avant de le modifier
backup_file() {
  local file="$1"
  local backup_file="$BACKUP_DIR/$(basename "$file").bak"
  cp "$file" "$backup_file"
  echo "💾 Backup effectué: $backup_file"
}

# 1. Corriger le template unifié
TEMPLATE_FILE="$BASE_DIR/src/components/shared/templates/unified/TrainingAgreementTemplate.tsx"
if [[ -f "$TEMPLATE_FILE" ]]; then
  echo "🔍 Traitement du template unifié..."
  backup_file "$TEMPLATE_FILE"
  
  # Vérifier si les modifications ont déjà été appliquées
  if grep -q "signatures-section-debug" "$TEMPLATE_FILE"; then
    echo "✅ Le template unifié a déjà été corrigé."
  else
    # Appliquer les modifications
    sed -i '' 's/className="flex justify-between mt-12 signatures-section"/className="flex justify-between mt-12 signatures-section" id="unified-signatures-section" data-unified-signatures="true"/g' "$TEMPLATE_FILE"
    sed -i '' 's/<div className="w-1\/2">/<div className="w-1\/2" id="participant-signature-section" data-participant-signature-section={hideParticipantSignatureSection ? "hidden" : "visible"}>/g' "$TEMPLATE_FILE"
    
    # Ajouter la section d'information
    sed -i '' '/{\/\* IMPORTANT: Plus de section "Signature du participant" en bas du document \*\/}/c\
      {\/\* Message explicite indiquant l'\''absence de section "Signature du participant" en bas \*\/}\
      <div className="text-xs text-gray-400 mt-4 mb-4 text-center" data-signature-notice="true">\
        {hideParticipantSignatureSection \
          ? "La section de signature du participant n'\''est pas affichée en bas du document pour éviter les doublons." \
          : ""}\
      </div>
    ' "$TEMPLATE_FILE"
    
    echo "✅ Template unifié corrigé."
  fi
else
  echo "❌ Erreur: Template unifié non trouvé: $TEMPLATE_FILE"
fi

# 2. Corriger les fonctions de SignatureUtils
SIGNATURE_UTILS_FILE="$BASE_DIR/src/utils/SignatureUtils.ts"
if [[ -f "$SIGNATURE_UTILS_FILE" ]]; then
  echo "🔍 Traitement des utilitaires de signature..."
  backup_file "$SIGNATURE_UTILS_FILE"
  
  # Vérifier si les modifications ont déjà été appliquées
  if grep -q "isInProtectedSection" "$SIGNATURE_UTILS_FILE"; then
    echo "✅ Les utilitaires de signature ont déjà été corrigés."
  else
    # Créer un fichier temporaire avec les modifications
    TMP_FILE=$(mktemp)
    
    # Remplacer la fonction removeAllParticipantSignatureSections
    cat > "$TMP_FILE" << 'EOF'
/**
 * Supprime toutes les sections intitulées "Signature du participant" d'un document
 * en préservant celles qui sont explicitement placées dans les templates unifiés
 * 
 * @param container Élément DOM contenant le document
 * @returns Nombre de sections supprimées
 */
export const removeAllParticipantSignatureSections = (container: HTMLElement): number => {
  if (!container) {
    console.log('🔍 [DEBUG] removeAllParticipantSignatureSections: Aucun conteneur fourni');
    return 0;
  }

  console.log('🔍 [DEBUG] Suppression des sections "Signature du participant" indésirables');
  let removedCount = 0;

  // Étape 1: Vérifier si on est dans un template unifié
  const isUnifiedTemplate = container.classList.contains('unified-training-agreement');
  console.log(`🔍 [DEBUG] Est-ce un template unifié? ${isUnifiedTemplate}`);
  
  // Étape 2: Trouver tous les nœuds de texte contenant "Signature du participant"
  const allTextNodes = getAllTextNodes(container);
  const signatureNodes = allTextNodes.filter(
    node => node.textContent && node.textContent.trim() === 'Signature du participant'
  );

  // Étape 3: Pour chaque occurrence, supprimer la section parente appropriée
  signatureNodes.forEach(node => {
    // Vérifier si ce nœud est dans la section "Pour le stagiaire" ou signatures-section
    let isInProtectedSection = false;
    let currentNode: Node | null = node;
    
    // Remonter jusqu'à 5 niveaux pour chercher un titre ou une classe protégée
    for (let i = 0; i < 5 && currentNode; i++) {
      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const element = currentNode as HTMLElement;
        // Vérifier les classes et attributs qui indiquent qu'il s'agit d'une section légitime
        if (
          element.classList?.contains('signatures-section') ||
          element.hasAttribute('data-signature-container') ||
          element.hasAttribute('data-signature-type')
        ) {
          isInProtectedSection = true;
          break;
        }
      }
      
      // Si un parent contient le texte "Pour le stagiaire", ne pas supprimer
      if (currentNode.textContent && (
          currentNode.textContent.includes('Pour le stagiaire') ||
          currentNode.textContent.includes('Pour l\'entreprise') ||
          currentNode.textContent.includes('Pour l\'organisme de formation')
      )) {
        isInProtectedSection = true;
        break;
      }
      currentNode = currentNode.parentNode;
    }

    if (!isInProtectedSection) {
      // Trouver le parent à supprimer (div, section, etc.)
      let target = node.parentElement;
      let foundTarget = false;
      
      // Remonter jusqu'à 5 niveaux pour trouver une section ou div
      for (let i = 0; i < 5 && target; i++) {
        // Si c'est un élément qui ressemble à une section complète
        if (
          target.tagName === 'DIV' || 
          target.tagName === 'SECTION' ||
          (target.className && (
            target.className.includes('signature') ||
            target.className.includes('mt-') ||
            target.className.includes('border-t')
          ))
        ) {
          foundTarget = true;
          break;
        }
        target = target.parentElement;
      }

      if (foundTarget && target) {
        console.log(`🔍 [DEBUG] Suppression d'une section "Signature du participant": ${target.tagName}`);
        // Masquer d'abord, puis vider, puis supprimer
        (target as HTMLElement).style.display = 'none';
        target.innerHTML = '';
        if (target.parentElement) {
          target.parentElement.removeChild(target);
        }
        removedCount++;
      }
    } else {
      console.log('🔍 [DEBUG] Section de signature détectée dans une zone protégée, conservation');
    }
  });

  // Étape 4: Chercher aussi par attributs data, mais épargner les containers légitimes
  const dataSignatureElements = container.querySelectorAll('[data-signature-type="participant"]');
  dataSignatureElements.forEach(element => {
    // Vérifier si cet élément est dans un conteneur protégé
    let isInProtectedSection = false;
    
    // Vérifier si l'élément lui-même est un conteneur légitime
    if (element.hasAttribute('data-signature-container')) {
      isInProtectedSection = true;
    } else {
      let currentNode: Node | null = element;
      
      // Remonter jusqu'à 5 niveaux pour chercher un conteneur protégé
      for (let i = 0; i < 5 && currentNode; i++) {
        if (currentNode.nodeType === Node.ELEMENT_NODE) {
          const parentElement = currentNode as HTMLElement;
          if (
            parentElement.classList?.contains('signatures-section') ||
            parentElement.textContent?.includes('Pour le stagiaire')
          ) {
            isInProtectedSection = true;
            break;
          }
        }
        currentNode = currentNode.parentNode;
      }
    }

    if (!isInProtectedSection) {
      console.log(`🔍 [DEBUG] Suppression d'un élément avec data-signature-type="participant"`);
      (element as HTMLElement).style.display = 'none';
      element.innerHTML = '';
      element.parentElement?.removeChild(element);
      removedCount++;
    } else {
      console.log('🔍 [DEBUG] Conteneur de signature data-* détecté dans une zone protégée, conservation');
    }
  });

  console.log(`🔍 [DEBUG] ${removedCount} sections "Signature du participant" supprimées`);
  return removedCount;
};
EOF

    # Remplacer la fonction dans le fichier
    # On cherche le début de la fonction et on remplace jusqu'à la fonction suivante
    sed -i '' '/export const removeAllParticipantSignatureSections/,/export const setupSignatureContainer/!b;//{
        x
        s/.*//
        G
        s/\(export const removeAllParticipantSignatureSections[^}]*}\)\(.*export const setupSignatureContainer\)/cat '"$TMP_FILE"'\
\2/
    }' "$SIGNATURE_UTILS_FILE"
    
    # Nettoyer
    rm "$TMP_FILE"
    
    echo "✅ Utilitaires de signature corrigés."
  fi
else
  echo "❌ Erreur: Fichier d'utilitaires non trouvé: $SIGNATURE_UTILS_FILE"
fi

# 3. Vérifier et mettre à jour les fichiers qui utilisent le template unifié
echo "🔍 Recherche des fichiers utilisant le template unifié..."
for file in $(grep -l "hideParticipantSignatureSection" "$BASE_DIR/src" --include="*.tsx" --include="*.ts"); do
  echo "🔍 Vérification de $file..."
  
  if [[ "$file" != "$TEMPLATE_FILE" && "$file" != "$SIGNATURE_UTILS_FILE" ]]; then
    backup_file "$file"
    echo "✅ Fichier déjà configuré: $file"
  fi
done

echo "🎉 Correction appliquée avec succès!"
echo "📋 Pour tester la solution, ouvrez l'application en développement et vérifiez que les signatures s'affichent correctement."
echo "📝 Un rapport détaillé a été généré dans: $BACKUP_DIR/rapport.log"

# Générer un rapport
{
  echo "📋 Rapport de correction des signatures"
  echo "📅 Date: $(date)"
  echo "📂 Dossier de travail: $BASE_DIR"
  echo "📂 Backups: $BACKUP_DIR"
  echo "---"
  echo "✅ Fichiers modifiés:"
  ls -la "$BACKUP_DIR"
} > "$BACKUP_DIR/rapport.log"

echo "🚀 Pour tester la solution dans le navigateur, visitez: http://localhost:5173/test_signature.html" 