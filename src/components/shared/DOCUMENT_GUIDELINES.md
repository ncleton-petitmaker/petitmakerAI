# Architecture des documents partagés PetitMaker

Ce document décrit l'architecture mise en place pour garantir que les documents (attestations, conventions, etc.) soient **strictement identiques** entre l'interface CRM (formateur) et l'interface apprenant.

## Principe fondamental

**Les documents vus dans le CRM et par l'apprenant sont catégoriquement liés et identiques.**

Le seul élément qui diffère est le contexte d'affichage (CRM ou apprenant), qui adapte uniquement les fonctionnalités d'interaction (comme les signatures) sans modifier le contenu ou la présentation des documents.

## Structure de l'architecture

L'architecture repose sur trois couches :

1. **Couche utilitaires partagée** (`shared/DocumentUtils.ts` et `shared/DocumentManager.ts`)
   - Contient toutes les fonctions communes pour le formatage des données
   - Définit les interfaces partagées (`Training`, `Participant`, etc.)
   - Implémente la génération de PDF multi-pages
   - Gère la sauvegarde et la récupération des documents et signatures

2. **Couche templates partagés** (`shared/templates/`)
   - Templates React qui définissent l'apparence des documents
   - Utilisent la même source de données et les mêmes fonctions de formatage
   - Génèrent exactement le même rendu visuel indépendamment du contexte

3. **Couche composants unifiés** (`shared/`)
   - Composants unifiés qui s'adaptent au contexte : `CompletionCertificate.tsx`, `TrainingAgreement.tsx`, `AttendanceSheet.tsx`
   - Ces composants utilisent les templates partagés et adaptent l'interaction en fonction du contexte

4. **Couche boutons spécifiques au contexte**
   - Interface CRM : `src/components/admin/CompletionCertificateButton.tsx`
   - Interface apprenant : `src/components/StudentCompletionCertificateButton.tsx`
   - Ces boutons utilisent les composants unifiés en passant le contexte approprié

## Comment est garantie la cohérence ?

1. **Source unique de vérité** :
   - Les templates sont définis une seule fois et utilisés partout
   - Les fonctions de formatage sont centralisées dans `DocumentUtils`
   - La gestion des documents est centralisée dans `DocumentManager`

2. **Différenciation par contexte** :
   - Chaque composant unifié accepte un paramètre `viewContext: 'crm' | 'student'`
   - Ce paramètre contrôle uniquement les aspects interactifs (qui peut signer)

3. **Signature et persistance** :
   - Les signatures sont stockées de manière cohérente via `DocumentManager`
   - Lorsqu'un formateur signe un document dans le CRM, sa signature devient visible dans l'interface apprenant

## Règles à respecter

1. **Ne jamais dupliquer les templates ou les fonctions de formatage**
   - Toute modification doit être faite uniquement dans les fichiers partagés

2. **Toujours utiliser les interfaces partagées**
   - Utiliser `Training` et `Participant` au lieu de redéfinir des interfaces

3. **Séparer clairement données et présentation**
   - Les composants unifiés gèrent l'interaction et la logique
   - La présentation est entièrement déléguée aux templates partagés

4. **Conserver le concept de `viewContext`**
   - C'est le seul moyen de différencier les comportements sans dupliquer le code

## Documents concernés

- Attestation de fin de formation (`CompletionCertificate.tsx`)
- Convention de formation (`TrainingAgreement.tsx`)
- Feuille d'émargement (`AttendanceSheet.tsx`)

Pour tout nouveau document, suivre cette architecture garantit la cohérence parfaite entre les interfaces. 