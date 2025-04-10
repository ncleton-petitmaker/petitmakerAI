# Analyse Détaillée: Stockage des Documents et Signatures dans Supabase

Ce document décrit le fonctionnement du stockage des signatures images et des documents PDF générés au sein de l'application, en utilisant Supabase Storage et la table `public.documents` de la base de données PostgreSQL. L'analyse se base principalement sur le fichier `src/components/shared/DocumentManager.ts`.

## 1. Entités Principales

Deux types d'éléments sont gérés :

1.  **Signatures Images (PNG) :** Chaque signature individuelle (apprenant, représentant, formateur) et chaque tampon (entreprise, organisme) est sauvegardée comme une image PNG distincte.
2.  **Documents Finais (PDF) :** Les documents complets (convention, attestation, feuille d'émargement), une fois potentiellement assemblés avec les signatures, peuvent être sauvegardés en tant que fichiers PDF distincts. *Note : L'utilisation de cette fonctionnalité semble moins fréquente dans la logique récente observée dans `StudentTrainingAgreement.tsx`, qui privilégie la génération à la volée.*

## 2. Rôle de Supabase Storage

Plusieurs buckets Supabase Storage sont utilisés :

*   **`signatures` :** **Bucket principal** utilisé par `DocumentManager.saveSignature`. Il stocke toutes les images PNG des signatures et tampons individuels. Ce bucket est configuré pour être **public**. La fonction `ensureSignatureBucketExists` vérifie son existence et sa publicité au démarrage.
*   **`agreements` :** Utilisé par `DocumentManager.saveDocument` pour stocker les PDF des conventions de formation finales.
*   **`certificates` :** Utilisé par `DocumentManager.saveDocument` pour stocker les PDF des attestations/certificats finaux.
*   **`attendance-sheets` :** Utilisé par `DocumentManager.saveDocument` pour stocker les PDF des feuilles d'émargement finales.

## 3. Rôle de la Table `public.documents`

Cette table sert de **répertoire centralisé**, liant les métadonnées (formation, utilisateur, type, etc.) à l'URL publique du fichier correspondant (image PNG de signature ou document PDF) stocké dans Supabase Storage.

**Colonnes Clés et Leur Utilisation :**

*   `id`: Identifiant unique.
*   `title`: Titre descriptif. Très important pour la recherche historique et comme fallback. Ex: "Signature du représentant", "Tampon de l'entreprise", "Convention de formation signée - Nom Participant".
*   `type`: Type du document de *base* concerné ('convention', 'attestation', 'emargement'). Utilisé pour filtrer les recherches.
*   `company_id`: Lié à l'entreprise (utile pour le partage).
*   `user_id`: Lié à l'utilisateur. **Crucial :**
    *   Pour les signatures/tampons spécifiques à un utilisateur (`participant`, `companySeal`), il contient l'UUID de l'utilisateur.
    *   Pour les signatures/tampons globaux (`trainer`, `representative` *original*, `organizationSeal`), il est **`NULL`**.
    *   Pour les signatures `representative` *partagées*, il contient l'UUID de l'utilisateur **cible** du partage.
*   `training_id`: Lie l'entrée à une formation spécifique.
*   `file_url`: **L'URL publique** directe vers le fichier PNG (dans `signatures`) ou PDF (dans `agreements`, etc.) dans Supabase Storage.
*   `created_by`: Qui a initié la création de l'enregistrement.
*   `created_at`, `updated_at`: Timestamps.
*   `signature_type`: **Colonne essentielle** indiquant le rôle de la signature/tampon image ('participant', 'representative', 'trainer', 'companySeal', 'organizationSeal'). N'est *pas* renseigné par `saveDocument` pour les PDF.

## 4. Processus de Sauvegarde

### 4.1. Sauvegarde d'une Signature Image (`DocumentManager.saveSignature`)

C'est le processus le plus utilisé et le mieux défini actuellement.

1.  **Validation & Préparation :**
    *   Vérifie les paramètres (`training_id`, `signature`, `type`, `signature_type`).
    *   Convertit la signature en `dataURL` PNG puis en `Blob`.
    *   Définit un `title` ("Signature de l'apprenant", etc.).
    *   Génère un `filename` unique basé sur les types, ID (si pertinent) et timestamp.
2.  **Stockage :**
    *   Upload le `Blob` PNG dans le bucket `signatures` avec le `filename` comme chemin.
    *   Récupère l'URL publique (`publicUrl`).
3.  **Référencement DB :**
    *   Insère une ligne dans `documents` :
        *   `training_id`, `type`, `title`, `created_by`.
        *   `file_url` = `publicUrl`.
        *   `signature_type` = type de signature fourni.
        *   `user_id` = ID utilisateur, sauf si `signature_type` est global (trainer, representative, organizationSeal), auquel cas `user_id` est `NULL`.
    *   Gestion d'erreur améliorée pour logger et remonter les échecs d'insertion.

### 4.2. Sauvegarde d'un Document PDF (`DocumentManager.saveDocument`)

Processus potentiellement moins utilisé ou hérité.

1.  **Validation & Préparation :**
    *   Prend un `pdfBlob`, `training_id`, `user_id`, etc.
    *   Détermine le `bucket` de destination (`agreements`, `certificates`, `attendance-sheets`).
    *   Génère un `fileName` unique.
    *   Définit un `title` spécifique au document final ("Convention signée - ...").
2.  **Stockage :**
    *   Upload le `pdfBlob` dans le bucket déterminé.
    *   Récupère l'URL publique (`publicUrl`).
3.  **Référencement DB :**
    *   Insère une ligne dans `documents` :
        *   `training_id`, `user_id`, `type`, `title`, `created_by`.
        *   `file_url` = `publicUrl` (URL du PDF).
        *   **Ne renseigne pas `signature_type`**.

## 5. Processus de Récupération

### 5.1. Récupération d'une Signature Image (`DocumentManager.getLastSignature`)

Logique complexe visant la robustesse et la compatibilité ascendante :

1.  **Détermine le `title`** attendu en fonction du `signature_type` demandé.
2.  **Construit une requête de base** sur `documents` filtrant par `training_id` et `type`.
3.  **Ajoute des filtres spécifiques :**
    *   Filtre par `title`.
    *   Filtre par `user_id` si fourni ET si ce n'est pas un type global (tampon ou formateur).
4.  **Exécute la requête** triée par date décroissante.
5.  **Si aucun résultat :**
    *   **Fallback 1 (global) :** Pour `representative` ou `trainer`, refait une recherche sans `training_id`.
    *   **Fallback 2 (storage) :** Tente de lister les fichiers dans le bucket `signatures` correspondant à un pattern (`representative_convention`, `trainer_convention`, etc.).
    *   **Fallback 3 (storage tampons) :** Pour les tampons (`companySeal`, `organizationSeal`), liste les fichiers du bucket `signatures` commençant par `seal_company` ou `seal_organization` et correspondant au `type` de document, puis prend le plus récent.
6.  **Si des résultats sont trouvés en DB :**
    *   Itère sur les URLs trouvées (limitées à 5 plus récentes).
    *   **Valide chaque URL** (`isValidImageUrl`) pour vérifier si l'image est accessible.
    *   Retourne la première URL validée.
    *   Si aucune n'est valide, retourne l'URL la plus récente par défaut (supposant un délai de propagation CDN).

### 5.2. Récupération d'un Document PDF (`DocumentManager.getLastDocument`)

Vise à trouver le PDF final, pas une simple signature :

1.  Recherche dans `documents` par `training_id`, `user_id`, `type`.
2.  **Exclut** les enregistrements où `file_url` ou `title` contiennent "signature".
3.  Si rien n'est trouvé :
    *   **Fallback 1 :** Recherche élargie sur `training_id` et `type` (sans `user_id`), en excluant toujours les signatures.
    *   **Fallback 2 :** Recherche tout document (même signatures) pour `training_id` et `user_id`, puis filtre localement pour exclure les signatures.
    *   **Fallback 3 :** Prend le premier document trouvé pour `training_id` et `user_id`.
    *   **Fallback 4 :** Recherche tout document pour `training_id` (sans `user_id`).

## 6. Partage des Signatures (Logique Externe - `SignatureService.shareRepresentativeSignature`)

Ce mécanisme, essentiel pour la visibilité des signatures de représentant, n'est pas dans `DocumentManager` mais l'utilise implicitement :

1.  Après qu'un représentant signe (`handleSignatureSave` appelle `DocumentManager.saveSignature`), `shareRepresentativeSignature` est appelée.
2.  Elle **retrouve la signature originale** dans `documents` (via `SignatureService.findSignature`, qui utilise `DocumentManager.findSignatureInDatabase`).
3.  Elle trouve les autres participants de la même entreprise pour la formation.
4.  Pour chaque autre participant, elle **crée une nouvelle entrée** dans `documents` :
    *   `user_id` = ID du participant cible.
    *   `file_url` = URL de la signature originale.
    *   `signature_type` = 'representative'.
    *   `title` = "Signature du représentant".

## 7. Conclusion et Points Clés

*   **Double Stockage :** Signatures (PNG) dans bucket `signatures`, Documents (PDF) dans buckets dédiés (`agreements`, etc.).
*   **Table `documents` Centrale :** Sert de catalogue référençant tous les fichiers stockés via `file_url`.
*   **Identification :** Le couple `signature_type` et `title` est utilisé pour identifier le rôle d'une entrée dans `documents`. `signature_type` est plus fiable pour les signatures images récentes.
*   **Global vs Spécifique :** La colonne `user_id` (`NULL` ou UUID) différencie les éléments globaux des éléments liés à un utilisateur.
*   **Partage par Duplication :** Le partage de signatures représentatives se fait en créant des références dupliquées dans `documents`, chacune liée à un utilisateur cible mais pointant vers la même `file_url`.
*   **Complexité de Récupération :** Les méthodes `getLastSignature` et `getLastDocument` sont complexes en raison des multiples logiques de fallback nécessaires pour gérer l'historique et les différents scénarios.
*   **Nettoyage Potentiel :** La pertinence de `saveDocument` et `getLastDocument` pourrait être revue si la génération PDF se fait uniquement côté client. Les références obsolètes à `document_signatures` doivent être nettoyées.
