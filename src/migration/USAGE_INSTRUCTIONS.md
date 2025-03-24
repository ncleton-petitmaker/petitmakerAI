# Instructions d'Utilisation du Template Unifié

Ce document fournit des instructions pour l'utilisation du nouveau template unifié pour les conventions de formation, qui remplace les deux versions précédemment utilisées.

## Mise à Jour des Imports

Pour utiliser le nouveau template unifié, vous devez mettre à jour vos imports de la manière suivante :

**Anciens imports** (à remplacer) :
```typescript
// Ancienne version 1
import TrainingAgreementTemplate from 'components/templates/TrainingAgreementTemplate';
// OU Ancienne version 2
import TrainingAgreementTemplate from 'components/shared/templates/TrainingAgreementTemplate';
```

**Nouvel import** (à utiliser) :
```typescript
import UnifiedTrainingAgreementTemplate from 'components/shared/templates/unified/TrainingAgreementTemplate';
```

## Exemple d'Utilisation

Voici un exemple de base d'utilisation du nouveau template unifié :

```tsx
import React from 'react';
import UnifiedTrainingAgreementTemplate from 'components/shared/templates/unified/TrainingAgreementTemplate';

const YourComponent: React.FC = () => {
  // Vos données...
  const company = { /* ... */ };
  const participant = { /* ... */ };
  const training = { /* ... */ };
  const session = { /* ... */ };
  const signatureData = {
    companySignatureUrl: 'url/to/company/signature.png',
    participantSignatureUrl: 'url/to/participant/signature.png',
    trainerSignatureUrl: 'url/to/trainer/signature.png',
  };

  // Pour un document destiné au stagiaire
  return (
    <UnifiedTrainingAgreementTemplate
      company={company}
      participant={participant}
      training={training}
      session={session}
      signatureData={signatureData}
      documentVariant="student"
      pdfMode={true}
    />
  );
  
  // OU pour un document administratif (entreprise, organisme)
  /*
  return (
    <UnifiedTrainingAgreementTemplate
      company={company}
      participant={participant}
      training={training}
      session={session}
      signatureData={signatureData}
      documentVariant="company"
      showTrainerSignature={true}
      showCompanySignature={true}
      pdfMode={true}
    />
  );
  */
};

export default YourComponent;
```

## Différences Principales avec les Anciens Templates

1. **La section "Signature du participant" a été supprimée** et ne s'affiche plus en double. Elle apparaît uniquement dans le bloc "Pour le stagiaire" lorsque `documentVariant="student"`.

2. **Le paramètre `documentVariant`** remplace la nécessité d'avoir deux templates différents :
   - `"student"` : Version pour le stagiaire (inclut la section "Pour le stagiaire")
   - `"company"` : Version pour l'entreprise
   - `"generic"` : Version générique/administrative

3. **Préchargement automatique des signatures** : Les signatures sont automatiquement préchargées si `signatureData` est fourni, sans avoir besoin de code supplémentaire.

4. **Attributs data-* cohérents** : Les conteneurs de signature utilisent des attributs data-* standardisés pour faciliter la sélection et la manipulation.

5. **Gestion simplifiée des options d'affichage** avec les props :
   - `showCompanySignature` : Affiche/masque la signature de l'entreprise
   - `showTrainerSignature` : Affiche/masque la signature de l'organisme de formation

## Tests à Effectuer Après Migration

Après avoir migré vers le nouveau template, vérifiez les points suivants :

- [ ] **Affichage dans l'interface utilisateur** : Le document s'affiche correctement sans erreurs visuelles
- [ ] **Génération de PDF** : Les PDF générés contiennent les sections de signature correctes
- [ ] **Signatures** : Les signatures apparaissent uniquement aux endroits prévus
- [ ] **Absence de doublons** : La section "Signature du participant" n'apparaît pas en double
- [ ] **Compatibilité** : Le document fonctionne correctement dans différents navigateurs

## Résolution des Problèmes Courants

### Signatures Manquantes

Si les signatures n'apparaissent pas :

1. Vérifiez que `signatureData` contient les URL valides des images de signature
2. Vérifiez que les props `showCompanySignature` et `showTrainerSignature` sont définis correctement
3. Assurez-vous que `documentVariant` est correctement défini selon le contexte

### Erreurs de Compilation TypeScript

Si vous rencontrez des erreurs de type :

1. Assurez-vous d'utiliser la dernière version du template unifié
2. Vérifiez que les props passés correspondent à l'interface `TrainingAgreementTemplateProps`
3. Si vous étendez le template, utilisez le générique correctement :
   ```typescript
   interface ExtendedProps extends TrainingAgreementTemplateProps {
     // Vos props supplémentaires
   }
   ```

### Problèmes de Rendu

Si le document ne s'affiche pas correctement :

1. Vérifiez les erreurs dans la console du navigateur
2. Assurez-vous que les données passées au template sont valides et complètes
3. Essayez de désactiver le mode PDF (`pdfMode={false}`) pour voir si le problème persiste

## Support et Maintenance

Si vous rencontrez des problèmes avec le template unifié, contactez :

- L'équipe de développement : dev@votreentreprise.com
- Créez un ticket dans le système de suivi des problèmes avec le tag "signature-template"

Pour plus de détails sur l'architecture et le plan de migration, consultez le document [SIGNATURE_MIGRATION_PLAN.md](/src/migration/SIGNATURE_MIGRATION_PLAN.md).

---

Dernière mise à jour : {{DATE}} 