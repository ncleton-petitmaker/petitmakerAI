# Plan de Migration - Gestion des Signatures

## Problématique

Notre application présente actuellement des problèmes liés à la gestion des signatures dans les documents PDF générés, en particulier dans les conventions de formation (training agreements). Les problèmes identifiés sont :

1. Duplication des fichiers de template (`TrainingAgreementTemplate.tsx`) dans deux emplacements différents :
   - `/src/components/templates/TrainingAgreementTemplate.tsx`
   - `/src/components/shared/templates/TrainingAgreementTemplate.tsx`

2. Affichage indésirable de la section "Signature du participant" dans certains contextes, notamment en bas du document alors qu'elle devrait apparaître uniquement dans la section "Pour le stagiaire".

3. Absence d'une approche cohérente pour gérer les signatures, ce qui génère des bugs et des complexités lors de la mise à jour du code.

## Vision

Mettre en place une gestion unifiée et robuste des signatures dans les documents, avec une architecture claire et une séparation des responsabilités. Cette migration vise à :

1. Éliminer la duplication de code en créant un template unique.
2. Supprimer définitivement l'affichage de la section "Signature du participant" sauf dans le contexte approprié.
3. Standardiser la gestion des signatures avec une approche modulaire et extensible.

## Plan de Migration (en 3 phases)

### Phase 1 : Unification des Templates

**Objectif** : Remplacer les deux templates existants par un template unifié.

**Tâches** :

1. **Créer un nouveau template unifié** :
   - Chemin : `/src/components/shared/templates/unified/TrainingAgreementTemplate.tsx`
   - Fusionner les fonctionnalités des deux templates existants
   - Implémenter le prop `documentVariant` pour gérer les différentes variantes du document
   - Utiliser des attributs `data-*` pour faciliter la sélection des éléments

2. **Mettre à jour les composants qui utilisent les anciens templates** :
   - `StudentTrainingAgreement.tsx`
   - `TrainingAgreementForm.tsx`
   - `GenericTrainingAgreement.tsx`

3. **Nettoyer les anciens templates** :
   - Marquer les anciens templates comme dépréciés
   - Placer un avertissement dans les fichiers indiquant qu'ils seront supprimés
   - Ajouter des redirections temporaires vers le nouveau template

**Livrables** :
- Template unifié fonctionnel
- Composants mis à jour pour utiliser le nouveau template
- Documentation des changements

### Phase 2 : Refactoring de la Gestion des Signatures

**Objectif** : Standardiser et centraliser la gestion des signatures.

**Tâches** :

1. **Créer un module dédié pour la gestion des signatures** :
   - `/src/modules/signatures/SignatureContainer.tsx` : Composant pour afficher les signatures
   - `/src/modules/signatures/SignatureManager.ts` : Logique de gestion des signatures
   - `/src/modules/signatures/SignatureHooks.ts` : Hooks React pour utiliser les signatures

2. **Déplacer et améliorer les fonctions existantes** :
   - Migrer `removeAllParticipantSignatureSections` vers `SignatureManager.ts`
   - Créer des fonctions dédiées pour la prévisualisation, l'édition et la suppression des signatures

3. **Standardiser les attributs et classes CSS** :
   - Utiliser des attributs `data-signature-type` et `data-signature-role` de manière cohérente
   - Définir des classes CSS standardisées pour les éléments de signature

**Livrables** :
- Module de signatures complet
- Documentation d'utilisation du module
- Tests unitaires pour les fonctions clés

### Phase 3 : Nettoyage et Documentation

**Objectif** : Finaliser la migration et documenter le nouveau système.

**Tâches** :

1. **Supprimer les anciens fichiers et le code inutilisé** :
   - Supprimer les anciens templates après validation complète
   - Nettoyer le code mort et les imports inutilisés

2. **Mettre à jour la documentation** :
   - Documenter l'architecture de gestion des signatures
   - Créer des exemples d'utilisation
   - Mettre à jour les guides de développement

3. **Vérifications finales** :
   - Exécuter des tests complets sur différents scénarios
   - Valider le comportement dans les environnements de développement, staging et production

**Livrables** :
- Code propre et entièrement fonctionnel
- Documentation complète
- Rapport de tests

## Calendrier Recommandé

| Phase | Durée estimée | Complexité | Risque |
|-------|---------------|------------|--------|
| Phase 1 | 2-3 jours | Moyenne | Moyen |
| Phase 2 | 3-5 jours | Élevée | Moyen |
| Phase 3 | 1-2 jours | Faible | Faible |

## Tests à Effectuer

### Tests Automatisés
- Tests unitaires pour les fonctions de gestion des signatures
- Tests d'intégration pour le rendu des signatures dans différents contextes

### Tests Manuels
- Génération de PDF pour différents types de conventions
- Vérification de l'affichage correct des signatures
- Tests de régression sur les fonctionnalités existantes

## Plan de Rollback

En cas de problème majeur après déploiement :

1. Restaurer les imports vers les anciens templates
2. Désactiver temporairement la génération de PDF problématique
3. Corriger les problèmes identifiés en production sans affecter les utilisateurs

## Équipe et Responsabilités

- **Développeur principal** : Responsable de l'implémentation du template unifié
- **Testeur** : Validation des changements et tests de régression
- **Product Owner** : Approbation finale et coordination avec les utilisateurs

## Documentation de Référence

- [USAGE_INSTRUCTIONS.md](/src/migration/USAGE_INSTRUCTIONS.md) : Instructions d'utilisation du template unifié
- [files_to_update.json](/src/migration/files_to_update.json) : Liste des fichiers à mettre à jour
- [unified_template_structure.tsx](/src/migration/unified_template_structure.tsx) : Structure du template unifié
- [SignatureUtils.ts](/src/migration/SignatureUtils.ts) : Utilitaires de gestion des signatures

---

Document créé le : {{DATE}}
Dernière mise à jour : {{DATE}} 