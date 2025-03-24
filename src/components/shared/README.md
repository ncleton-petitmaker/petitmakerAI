# Système de Gestion des Documents et Signatures

Ce système fournit une solution centralisée et cohérente pour la gestion des documents qui nécessitent des signatures (conventions, attestations, feuilles d'émargement, etc.) dans l'application.

## Architecture

Le système est composé de plusieurs composants clés :

1. **DocumentSignatureManager** (`DocumentSignatureManager.ts`) : 
   - Gère toute la logique de signature (qui peut signer, dans quel ordre, etc.)
   - Centralise la configuration des exigences de signature pour chaque type de document
   - Gère le chargement et la sauvegarde des signatures

2. **DocumentWithSignatures** (`DocumentWithSignatures.tsx`) :
   - Composant React générique qui utilise le gestionnaire pour afficher les documents
   - Gère l'interface utilisateur pour la signature, le téléchargement et la visualisation

3. **Composants spécifiques pour chaque type de document** :
   - `GenericTrainingAgreement.tsx` : Convention de formation
   - `GenericAttendanceSheet.tsx` : Feuille d'émargement
   - `GenericCompletionCertificate.tsx` : Attestation de fin de formation
   - ... et d'autres à l'avenir

4. **Templates de document** (dossier `templates/`) :
   - Templates neutres qui définissent uniquement l'apparence du document
   - Reçoivent les signatures en tant que props, sans logique de gestion

## Flux de travail

1. L'utilisateur accède à un document (convention, attestation, etc.)
2. Le composant spécifique au type de document est instancié
3. Ce composant utilise `DocumentWithSignatures` qui gère tout le cycle de vie :
   - Chargement des signatures existantes via `DocumentSignatureManager`
   - Affichage du template avec les signatures existantes
   - Gestion des boutons de signature en fonction des règles (qui peut signer, quand)
   - Sauvegarde des signatures
   - Génération et sauvegarde du PDF final

## Avantages de cette approche

1. **Cohérence** : Tous les documents fonctionnent exactement de la même manière
2. **Évolutivité** : Ajouter un nouveau type de document ne nécessite que quelques étapes simples (voir ci-dessous)
3. **Maintenance simplifiée** : La logique de signature est centralisée et réutilisée
4. **Même expérience** : L'interface utilisateur est cohérente pour tous les documents
5. **Visualisation identique** : Les formateurs et apprenants voient exactement le même document

## Configuration des signatures pour les types de documents

Tous les types de documents et leurs exigences de signature sont définis dans le fichier `DocumentSignatureManager.ts` :

```typescript
export const DOCUMENT_SIGNATURE_CONFIG: Record<string, SignatureRequirements> = {
  [DocumentType.CONVENTION]: {
    requiredSignatures: ['representative', 'participant'],
    signatureOrder: ['representative', 'participant'],
    pendingSignatureMessage: 'En attente de la signature du formateur'
  },
  [DocumentType.ATTESTATION]: {
    requiredSignatures: ['representative'],
    pendingSignatureMessage: 'En attente de la signature du formateur'
  },
  // ... autres types de documents
};
```

## Comment ajouter un nouveau type de document

Pour ajouter un nouveau type de document :

1. **Ajouter le type** dans l'énumération `DocumentType` dans `DocumentSignatureManager.ts` :
   ```typescript
   export enum DocumentType {
     // Types existants...
     NOUVEAU_DOCUMENT = 'nouveau_document'
   }
   ```

2. **Configurer les exigences de signature** dans `DOCUMENT_SIGNATURE_CONFIG` :
   ```typescript
   [DocumentType.NOUVEAU_DOCUMENT]: {
     requiredSignatures: ['representative', 'participant'], // Qui doit signer
     signatureOrder: ['representative', 'participant'],     // Dans quel ordre
     pendingSignatureMessage: 'Message personnalisé'        // Message d'attente
   }
   ```

3. **Créer un template** dans `templates/NouveauDocumentTemplate.tsx` qui définit l'apparence du document

4. **Créer un composant spécifique** `GenericNouveauDocument.tsx` qui utilise `DocumentWithSignatures` :
   ```typescript
   export const GenericNouveauDocument: React.FC<GenericNouveauDocumentProps> = (props) => {
     // ... initialisation des données nécessaires
     
     const renderTemplate = ({ 
       participantSignature, 
       representativeSignature, 
       trainerSignature 
     }) => (
       <NouveauDocumentTemplate
         // Passer les propriétés nécessaires
         participantSignature={participantSignature}
         representativeSignature={representativeSignature}
         trainerSignature={trainerSignature}
       />
     );
     
     return (
       <DocumentWithSignatures
         documentType={DocumentType.NOUVEAU_DOCUMENT}
         // ... autres propriétés
         renderTemplate={renderTemplate}
         documentTitle="Titre du document"
       />
     );
   };
   ```

## Utilisation dans l'application

Pour utiliser le nouveau composant dans l'application, il suffit de l'importer et de l'utiliser comme n'importe quel autre composant React :

```tsx
import { GenericNouveauDocument } from './shared/GenericNouveauDocument';

// ...

<GenericNouveauDocument
  training={training}
  participant={participant}
  viewContext={viewContext} // 'crm' ou 'student'
  onCancel={handleCancel}
/>
```

## Bonnes pratiques

1. **Séparation des responsabilités** :
   - Les templates ne contiennent que l'affichage (pas de logique de signature)
   - La logique de signature est entièrement gérée par `DocumentSignatureManager`
   - L'interface utilisateur générique est gérée par `DocumentWithSignatures`

2. **Toujours utiliser le système générique** pour tout nouveau document, même s'il semble avoir des besoins spécifiques.

3. **Personnaliser via la configuration** plutôt que de dupliquer le code.

4. **Maintenir la cohérence visuelle** entre les documents.

## Dépannage

1. **Les signatures ne s'affichent pas** : Vérifier que le type de document est correctement configuré dans `DOCUMENT_SIGNATURE_CONFIG`.

2. **Les boutons de signature ne s'affichent pas** : Vérifier les règles d'ordre de signature et le contexte (`viewContext`).

3. **Problèmes avec les templates** : Assurez-vous que le template accepte correctement les props de signature. 