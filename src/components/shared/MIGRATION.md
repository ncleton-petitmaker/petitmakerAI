# Migration vers le nouveau système de gestion des signatures

Ce document décrit la démarche à suivre pour migrer complètement de l'ancien système de gestion des signatures vers le nouveau système unifié.

## Composants créés
- [x] `src/components/shared/DocumentManager.ts` - Gestion des documents PDF
- [x] `src/components/shared/DocumentSignatureManager.ts` - Gestion des signatures
- [x] `src/components/shared/DocumentWithSignatures.tsx` - Composant UI pour les documents avec signatures
- [x] `src/components/shared/DocumentUtils.ts` - Utilitaires partagés
- [x] `src/components/shared/GenericTrainingAgreement.tsx` - Convention générique
- [x] `src/components/shared/GenericAttendanceSheet.tsx` - Feuille d'émargement générique
- [x] `src/components/shared/GenericCompletionCertificate.tsx` - Attestation générique
- [x] `src/components/shared/templates/*` - Templates des documents

## Étapes de la migration

### Convention de formation
- [x] Créer `GenericTrainingAgreementButton` pour le CRM
- [x] Mettre à jour `TrainingsView.tsx` pour utiliser le nouveau bouton
- [x] Créer `StudentGenericTrainingAgreementButton` pour l'interface apprenant
- [x] Mettre à jour `TrainingTimeline.tsx` pour utiliser le nouveau bouton
- [x] Mettre à jour `index.ts` pour exporter le nouveau composant
- [x] Supprimer `src/components/admin/TrainingAgreementButton.tsx`
- [x] Supprimer `src/components/StudentTrainingAgreementButton.tsx`
- [x] Supprimer `src/components/StudentTrainingAgreement.tsx`
- [x] Supprimer `src/components/shared/TrainingAgreement.tsx`

### Feuille d'émargement
- [x] Créer `GenericAttendanceSheet.tsx` pour le document
- [x] Créer `GenericAttendanceSheetButton` pour le CRM
- [x] Créer `StudentGenericAttendanceSheetButton` pour l'interface apprenant
- [x] Mettre à jour les imports et usages dans l'application
- [x] Supprimer `src/components/admin/AttendanceSheetButton.tsx`
- [x] Supprimer `src/components/StudentAttendanceSheetButton.tsx`
- [x] Supprimer `src/components/StudentAttendanceSheet.tsx`
- [x] Supprimer `src/components/admin/AttendanceSheet.tsx`
- [x] Supprimer `src/components/shared/AttendanceSheet.tsx`

### Attestation de fin de formation
- [ ] Créer `GenericCompletionCertificateButton` pour le CRM
- [ ] Créer `StudentGenericCompletionCertificateButton` pour l'interface apprenant
- [ ] Mettre à jour les imports et usages dans l'application
- [ ] Supprimer `src/components/admin/CompletionCertificateButton.tsx`
- [ ] Supprimer `src/components/StudentCompletionCertificateButton.tsx`
- [ ] Supprimer `src/components/shared/CompletionCertificate.tsx`

## Avantages du nouveau système

1. **Cohérence** : Tous les documents fonctionnent de la même façon
2. **Simplicité** : Interface uniforme pour les signatures
3. **Maintenabilité** : Code centralisé et réutilisable
4. **Fiabilité** : Meilleure gestion des erreurs et des états de chargement
5. **Fonctionnalités** : Rafraîchissement des signatures, vérification du statut, etc.
6. **Évolutivité** : Facile d'ajouter de nouveaux types de documents

## Considérations importantes

- Assurez-vous que toutes les fonctionnalités des anciens composants sont présentes dans les nouveaux avant de les supprimer
- Testez soigneusement les composants migrés pour vérifier que les signatures fonctionnent correctement
- Effectuez la migration étape par étape pour éviter les problèmes

## Notes importantes

- S'assurer que toutes les fonctionnalités des anciens composants sont bien présentes dans les nouveaux avant de les supprimer
- Tester minutieusement chaque composant migré avant de supprimer l'ancien
- Faire la migration par étapes pour éviter d'impacter l'ensemble de l'application en cas de problème 