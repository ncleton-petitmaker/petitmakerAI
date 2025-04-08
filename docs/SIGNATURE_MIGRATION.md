# Migration du système de signatures

## État actuel et objectifs

Ce document trace les étapes nécessaires pour migrer le système de signatures vers une gestion plus robuste des différents types de signatures, en particulier pour supporter correctement les signatures de représentants légaux.

## Problèmes identifiés

1. La fonction `handleSignatureSave` n'accepte que les types 'participant' et 'companySeal'
2. Absence de la fonction `safeSetRepresentativeSignature`
3. Le composant `SignatureCanvas` supporte le type "representative" mais pas le système de sauvegarde
4. La table `document_signatures` ne contient que des signatures de type "participant"
5. Pas d'UI spécifique pour différencier les types de signatures
6. L'interface `SignatureCacheItem` ne contient pas de propriété pour la signature du représentant
7. Les types sont définis correctement dans SignatureTypes.ts mais ne sont pas utilisés dans StudentTrainingAgreement
8. Problèmes de linter dans DocumentWithSignatures.tsx avec des modules manquants et des arguments manquants pour certaines fonctions

## Actions réalisées

1. ✅ Analyse du fichier StudentTrainingAgreement.tsx
   - État pour la signature du représentant déjà existant: `const [representativeSignature, setRepresentativeSignature] = useState<string | null>(null);`
   - Fonction safeSetParticipantSignature identifiée comme modèle à suivre pour safeSetRepresentativeSignature

2. ✅ Préparation des modifications
   - Création de la fonction safeSetRepresentativeSignature
   - Mise à jour de l'interface SignatureCacheItem
   - Mise à jour de la fonction updateSignatureCache
   - Mise à jour de la fonction handleSignatureSave
   - Mise à jour de la fonction loadSignaturesFromSupabase

3. ✅ Migration complète vers GenericTrainingAgreement
   - Remplacement de StudentTrainingAgreement par GenericTrainingAgreement
   - Mise à jour de TrainingAgreementPortal pour utiliser GenericTrainingAgreement
   - Suppression de l'ancien composant StudentTrainingAgreement.tsx

4. ✅ Amélioration du système de signatures
   - Ajout d'un sélecteur de type de signature dans DocumentWithSignatures
   - Création de fonctions dans la base de données pour nettoyer et normaliser les signatures
   - Création d'une liste de tests pour valider la fonctionnalité des signatures

5. ✅ Correction des erreurs de linter
   - Résolution des erreurs d'import dans DocumentWithSignatures.tsx
   - Fournir les arguments manquants pour forceOrganizationSealInDOM et diagnoseAndFixOrganizationSeal
   - Implémentation de composants UI de remplacement pour les modules manquants (Modal, Button, etc.)
   - Ajout d'une fonction de notification simple pour remplacer toast

## Plan de migration (mise à jour)

### 1. Interface SignatureCacheItem
✅ Conçu l'ajout de la propriété `representativeSig` à l'interface pour stocker la signature du représentant légal
✅ Créé le fichier `02_SignatureCacheItem.txt` avec la modification

### 2. Fonction safeSetRepresentativeSignature
✅ Conçu la fonction de gestion sécurisée de l'état de la signature du représentant, similaire à safeSetParticipantSignature
✅ Créé le fichier `04_safeSetRepresentativeSignature.txt` avec la fonction

### 3. Mise à jour de updateSignatureCache
✅ Conçu les modifications pour inclure la signature du représentant dans le cache
✅ Créé le fichier `05_updateSignatureCache.txt` avec la fonction mise à jour

### 4. Mise à jour de handleSignatureSave
✅ Conçu les modifications pour accepter le type 'representative'
✅ Prévu l'utilisation des types depuis SignatureTypes.ts
✅ Conçu la gestion du type 'representative' dans le corps de la fonction
✅ Créé le fichier `06_handleSignatureSave.txt` avec la fonction mise à jour

### 5. Fonction loadSignaturesFromSupabase
✅ Conçu l'ajout pour le chargement des signatures de représentant
✅ Prévu la gestion des erreurs spécifiques au type representative
✅ Créé le fichier `07_loadSignaturesFromSupabase.txt` avec la fonction mise à jour

### 6. Migration vers le nouveau système
✅ Migration complète de StudentTrainingAgreement vers GenericTrainingAgreement
✅ Mis à jour TrainingAgreementPortal pour utiliser le nouveau composant
✅ Supprimé l'ancien fichier StudentTrainingAgreement.tsx (avec backup de sécurité)

### 7. Interface utilisateur
✅ Ajouter un sélecteur de type de signature selon le contexte
✅ Implémenter la logique de sélection du type

### 8. Base de données
✅ Vérifier les types existants dans la base de données
✅ Nettoyage des entrées dupliquées ou incorrectes
✅ Création de fonctions utilitaires pour maintenir la cohérence des données

### 9. Correction des erreurs de linter
✅ Corriger les imports manquants dans DocumentWithSignatures.tsx
✅ Ajouter les arguments manquants aux appels de fonctions dans les utilitaires de signature
✅ Implémenter des composants de remplacement pour les UI manquants

### 10. Tests
✅ Créer une liste de tests à effectuer
❌ Tester la signature d'un participant sur une attestation
❌ Tester la signature d'un représentant sur une convention
❌ Tester l'ajout d'un tampon d'entreprise
❌ Tester l'ajout d'un tampon d'organisme
❌ Tester l'ajout d'une signature de formateur

## Journal des modifications

| Date | Étape | Statut | Commentaire |
|------|-------|---------|-------------|
| 16/10/2023 | Analyse initiale | ✅ | Identification des problèmes et création du plan de migration |
| 16/10/2023 | Préparation des modifications | ✅ | Création des fichiers temporaires avec les modifications à apporter |
| 16/10/2023 | Tentative d'intégration | ✅ | Difficultés pour éditer directement le fichier StudentTrainingAgreement.tsx |
| 16/10/2023 | Création des fichiers de migration | ✅ | Création du répertoire signature_migration_files avec tous les fichiers nécessaires |
| 24/03/2025 | Migration vers GenericTrainingAgreement | ✅ | Remplacement complet de StudentTrainingAgreement par GenericTrainingAgreement |
| 24/03/2025 | Amélioration du UI de sélection | ✅ | Ajout d'un sélecteur de type de signature dans DocumentWithSignatures |
| 24/03/2025 | Nettoyage de la base de données | ✅ | Création de fonctions pour nettoyer et normaliser les signatures |
| 24/03/2025 | Préparation des tests | ✅ | Création d'une liste de tests pour valider la fonctionnalité |
| 25/03/2025 | Correction des erreurs de linter | ✅ | Résolution des problèmes de linter dans DocumentWithSignatures.tsx |

## À faire pour finaliser la migration

1. **Exécuter tous les tests** de la liste de vérification créée dans la base de données
2. **Documenter les fonctionnalités** pour les développeurs et les utilisateurs
3. **Surveiller l'utilisation** en production pour identifier d'éventuels problèmes
4. **Former les utilisateurs** sur les nouvelles fonctionnalités de signature

## Validation finale

✅ Migration vers GenericTrainingAgreement complétée
✅ Améliorations du UI ajoutées
✅ Nettoyage et normalisation de la base de données configurés
✅ Correction des erreurs de linter
❌ Tests complets passés avec succès
❌ Documentation mise à jour
❌ Revue de code effectuée 