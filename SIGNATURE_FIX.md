# Correction du Problème de Signature Formateur

## Problème identifié

Les signatures du formateur n'apparaissaient pas correctement dans les conventions de formation, bien qu'elles soient sauvegardées en base de données. Les logs montraient un message d'erreur : "⚠️ [WARNING] La signature du formateur est absente".

## Modifications effectuées

### 1. Suppression des templates redondants

- Supprimé le fichier `/src/components/templates/TrainingAgreementTemplate.tsx` pour éviter toute confusion
- Conservé uniquement le template unifié : `/src/components/shared/templates/unified/TrainingAgreementTemplate.tsx`

### 2. Correction de la priorité des signatures

Dans le template unifié (`TrainingAgreementTemplate.tsx`) :
```typescript
// Avant
const effectiveRepresentativeSignature = representativeSignature || trainerSignature;

// Après
const effectiveRepresentativeSignature = trainerSignature || representativeSignature;
```

Cette modification donne la priorité à la signature du formateur sur celle du représentant.

### 3. Amélioration du chargement des signatures

Dans `DocumentSignatureManager.ts`, la méthode `loadExistingSignatures()` a été modifiée pour :
- Charger la signature du formateur même pour les conventions (ajout d'une condition)
- Inverser l'ordre de recherche : d'abord global, puis spécifique à l'utilisateur
- Améliorer les logs pour faciliter le débogage

### 4. Amélioration de l'affichage et du débogage

- Ajout de logs plus détaillés dans `TrainingAgreementButton.tsx`
- Ajout d'informations de débogage invisibles dans le template pour tracer la source de la signature
- Amélioration de la gestion des erreurs lors du chargement des images de signature

## Analyse de la cause racine

Le problème provenait d'une confusion entre les signatures "representative" et "trainer". L'application :
1. Recherchait d'abord la signature avec user_id, puis celle sans user_id
2. Privilégiait la signature "representative" sur "trainer" dans le template

Cette combinaison empêchait l'affichage correct des signatures du formateur.

## Tests effectués

Pour vérifier que la correction fonctionne :
1. Ouvrir une convention de formation
2. Signer en tant que formateur
3. Vérifier que la signature s'affiche correctement dans le document
4. Vérifier les logs pour s'assurer que le message d'absence de signature du formateur n'apparaît plus 