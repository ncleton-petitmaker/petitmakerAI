# Solution au problème des signatures dans les templates

## Problème identifié

Le problème principal concernait la gestion des signatures dans les templates de conventions de formation, en particulier :

1. **Duplication des sections de signature** : Des sections "Signature du participant" apparaissaient dans des endroits indésirables du document.
2. **Suppression excessive** : Les fonctions de nettoyage supprimaient parfois des sections de signature légitimes.
3. **Visibilité conditionnelle mal gérée** : La propriété `hideParticipantSignatureSection` n'était pas correctement implémentée pour masquer visuellement la section.

## Solution implémentée

Notre solution comprend les améliorations suivantes :

### 1. Amélioration du template unifié (`TrainingAgreementTemplate.tsx`)

- Ajout d'identifiants explicites aux sections de signature pour faciliter leur sélection
- Implémentation d'attributs data pour indiquer l'état de la section (visible/cachée)
- Ajout d'un message explicatif lorsque la signature du participant est masquée
- Amélioration des logs pour faciliter le débogage

```tsx
{/* Section de signature standardisée avec identification explicite */}
<div className="flex justify-between mt-12 signatures-section" id="unified-signatures-section" data-unified-signatures="true">
  {/* ... */}
  
  {/* Signature du participant/stagiaire avec visibilité conditionnelle */}
  <div className="w-1/2" id="participant-signature-section" data-participant-signature-section={hideParticipantSignatureSection ? "hidden" : "visible"}>
    {/* ... */}
  </div>
</div>

{/* Message explicite indiquant l'absence de section "Signature du participant" en bas */}
<div className="text-xs text-gray-400 mt-4 mb-4 text-center" data-signature-notice="true">
  {hideParticipantSignatureSection 
    ? "La section de signature du participant n'est pas affichée en bas du document pour éviter les doublons." 
    : ""}
</div>
```

### 2. Amélioration des fonctions de nettoyage (`SignatureUtils.ts`)

La fonction `removeAllParticipantSignatureSections` a été améliorée pour :

- Détecter intelligemment les sections de signature légitimes
- Reconnaître les attributs `data-*` qui indiquent des sections protégées
- Préserver les sections dans le template unifié
- Ajouter plus de logs pour faciliter le débogage

```typescript
// Étape 1: Vérifier si on est dans un template unifié
const isUnifiedTemplate = container.classList.contains('unified-training-agreement');

// Vérifier si ce nœud est dans une section protégée
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
  
  // ... autres vérifications ...
}
```

### 3. Amélioration de la gestion d'affichage des signatures

Les fonctions `setupSignatureContainers` et `preloadSignatures` ont été améliorées pour :

- Tenir compte de la propriété `hideParticipantSignatureSection`
- Vérifier la visibilité des conteneurs avant de précharger les signatures
- Masquer visuellement les sections lorsque nécessaire

```typescript
// Pour le cas où la signature du participant doit être affichée
if (!hideParticipantSignatureSection) {
  const participantContainer = SignatureUtils.setupSignatureContainer(documentRef.current, 'participant', 'Pour le stagiaire');
  console.log('🔧 [UnifiedTemplate] Container participant configuré:', !!participantContainer);
} else {
  console.log('🔧 [UnifiedTemplate] La section de signature du participant est masquée par configuration');
  
  // S'assurer que la section est visuellement masquée si hideParticipantSignatureSection est true
  const section = documentRef.current.querySelector('#participant-signature-section');
  if (section) {
    (section as HTMLElement).style.display = 'none';
  }
}
```

## Comment tester la solution

1. **Page de test** : Une page `/test_signature.html` a été créée pour tester la solution indépendamment de l'application complète.
2. **Script d'installation** : Un script `apply_signature_fix.sh` est disponible pour appliquer les correctifs sur votre environnement.

Pour exécuter le script d'installation :

```bash
# Depuis la racine du projet
./src/migration/apply_signature_fix.sh
```

Pour tester la solution avec la page de test :

1. Démarrez le serveur de développement : `npm run dev`
2. Visitez l'URL : http://localhost:5173/test_signature.html
3. Utilisez les contrôles pour ajouter/supprimer des sections et vérifier le comportement

## Impact sur l'existant

Cette solution est compatible avec l'existant et ne devrait pas perturber les fonctionnalités actuelles. L'adaptation a été conçue pour :

- Ne pas modifier le comportement actuel des composants
- Garantir la compatibilité avec toutes les fonctionnalités existantes
- Améliorer la robustesse et la maintenabilité du code

## Problèmes potentiels résolus

Cette solution corrige également plusieurs problèmes potentiels :

1. **Sections fantômes** : Des sections de signature qui apparaissaient parfois en bas du document
2. **Disparition de signatures légitimes** : Des signatures qui étaient parfois supprimées par erreur
3. **Incohérences visuelles** : Des sections qui étaient parfois mal masquées ou mal affichées

## Maintien de la solution

Pour maintenir cette solution à long terme :

1. Ne modifiez pas les attributs `data-*` ajoutés aux éléments du DOM
2. Utilisez toujours la propriété `hideParticipantSignatureSection` pour gérer l'affichage des signatures
3. Testez toujours les modifications sur la page de test avant de les déployer

## Annexe : Liste des fichiers modifiés

- `src/components/shared/templates/unified/TrainingAgreementTemplate.tsx`
- `src/utils/SignatureUtils.ts`

## Date de mise en œuvre

Ce correctif a été mis en œuvre le **17 mars 2025**.

---

Document créé par l'équipe technique PetitMaker AI - 2023 