# Système de Modèles d'Emails : Tâches de Développement

## Description de la Fonctionnalité

Cette fonctionnalité vise à implémenter un système complet de gestion de modèles d'emails au sein de l'application. Les administrateurs pourront créer, modifier, gérer, planifier et envoyer des emails aux apprenants. Le système permettra d'utiliser un éditeur de texte enrichi, d'insérer des variables dynamiques (comme le nom de l'apprenant ou le nom de la formation), et de planifier l'envoi des emails X jours avant ou après le début/fin d'une formation. Une intégration avec Google sera mise en place pour l'envoi des emails via une adresse Gmail configurée. De plus, un historique des emails envoyés sera disponible dans le profil CRM de chaque apprenant. Un système d'upload de fichier sera aussi implémenté.

## Objectifs

*   Fournir aux administrateurs un outil flexible et puissant pour communiquer avec les apprenants.
*   Automatiser l'envoi d'emails importants en fonction des dates de formation.
*   Offrir un historique clair des communications avec chaque apprenant.
*   Améliorer la maintenabilité du projet en ajoutant une fonctionnalité générique et réutilisable.
*   Centraliser et simplifier la gestion des emails.

## Liste des Tâches

### I. Back-End

#### A. Modèle de données et base de données

- [x] **Création des tables SQL (Supabase):** (Référence: `supabase/migrations/`)
    - [x] Créer la table `email_templates`.
        - [x] `id` (UUID, clé primaire)
        - [x] `name` (TEXT, unique)
        - [x] `subject` (TEXT)
        - [x] `body` (TEXT)
        - [x] `file_id` (UUID, clé étrangère vers la table `files`, nullable)
        - [x] `status` (BOOLEAN, par défaut `true`)
        - [x] `schedule_type` (ENUM : 'before_training_start', 'after_training_end')
        - [x] `schedule_days` (INTEGER)
        - [x] `created_at` (TIMESTAMP, default now())
        - [x] `updated_at` (TIMESTAMP, default now())
        - [x] `signature` (TEXT, nullable)
    - [x] Créer la table `files`.
        - [x] `id` (UUID, clé primaire)
        - [x] `name` (TEXT)
        - [x] `url` (TEXT, unique)
        - [x] `created_at` (TIMESTAMP, default now())
        - [x] `updated_at` (TIMESTAMP, default now())
    - [x] Créer la table `sent_emails`.
        - [x] `id` (UUID, clé primaire)
        - [x] `template_id` (UUID, clé étrangère vers `email_templates`)
        - [x] `learner_id` (UUID, clé étrangère vers la table `user_profiles` qui existe déjà)
        - [x] `training_id` (UUID, clé étrangère vers la table `trainings` qui existe déjà)
        - [x] `sent_at` (TIMESTAMP)
        - [x] `error_message` (TEXT, nullable)
    - [x] Créer une migration pour ces changements. (`supabase migration new <name>`)
- [x] **Create a table to store error reports**
    - [x] Create a table `email_error` :
        - [x] `id` (UUID, clé primaire)
        - [x] `template_id` (UUID, clé étrangère vers `email_templates`)
        - [x] `learner_id` (UUID, clé étrangère vers la table `user_profiles` qui existe déjà)
        - [x] `training_id` (UUID, clé étrangère vers la table `trainings` qui existe déjà)
        - [x] `error_message` (TEXT, not nullable)
        - [x] `created_at` (TIMESTAMP, default now())
- [x] **Add an email section to learner profile**
    - [x] In the database, add a `email_history` (JSONB, nullable) in `user_profiles` table.
- [x] **Ajouter des colonnes pour Google OAuth à la table settings**
    - [x] Modifier la table `settings` pour ajouter :
        - [x] `google_oauth_enabled` (BOOLEAN, default false)
        - [x] `google_oauth_refresh_token` (TEXT, nullable)
        - [x] `google_oauth_access_token` (TEXT, nullable)
        - [x] `google_oauth_token_expiry` (TIMESTAMP WITH TIME ZONE, nullable)
        - [x] `google_email_sender` (TEXT, nullable)

#### B. API et Logic Back-end

- [x] **Création des fonctions API:** (Référence: `supabase-tools/`, `supabase/functions/`)
    - [x] `createEmailTemplate(templateData)` : Créer un nouveau modèle d'e-mail.
    - [x] `getEmailTemplate(templateId)` : Récupérer un modèle d'e-mail par son ID.
    - [x] `updateEmailTemplate(templateId, templateData)` : Mettre à jour un modèle d'e-mail.
    - [x] `deleteEmailTemplate(templateId)` : Supprimer un modèle d'e-mail.
    - [x] `listEmailTemplates()` : Récupérer la liste de tous les modèles d'e-mails.
    - [x] `listActiveEmailTemplates()` : Récupérer la liste de tous les modèles d'e-mails actifs.
    - [x] `createFile(fileData)` : Create a new file
    - [x] `getFile(fileId)` : Get a file by its id
    - [x] `deleteFile(fileId)` : Delete a file
    - [x] `listFile()` : Get all the files
    - [x] `getLearnerEmailsHistory(learnerId)`: Récupérer l'historique des emails envoyés pour un apprenant donné.
    - [x] `getEmailErrorReport()`: Récupérer tous les rapports d'erreurs
    - [x] Create an API to handle the google connexion.

- [x] **Implémentation de la logique des modèles d'e-mails:** (Référence: `supabase/functions/`, `supabase-tools/`)
    - [x] Implémenter la logique CRUD pour les modèles d'e-mails.
    - [x] Implémenter la gestion du statut (actif/inactif).
    - [x] Implémenter la logique de gestion de fichiers (Création, modification, suppression).
    - [x] Implémenter la logique de récupération des rapports d'erreur.

- [x] **Implémentation de la logique de planification :**
    - [x] Créer une fonction pour récupérer les e-mails à envoyer en fonction des dates de formation.
    - [x] Implémenter la logique pour déterminer la date d'envoi (X jours avant/après).

- [x] **Intégration Google (OAuth 2.0 et Gmail API):** (Référence: `supabase/functions/`)
    - [x] Mettre en place le processus OAuth 2.0 pour connecter un compte Google.
    - [x] Stocker les tokens d'accès de manière sécurisée.
    - [x] Implémenter l'utilisation de l'API Gmail pour envoyer les e-mails.

- [x] **Envoi des e-mails:** (Référence: `supabase/functions/`)
    - [x] Implémenter la logique pour récupérer le bon template et remplacer les variables.
    - [x] Implémenter l'envoi de l'e-mail, en utilisant l'API Gmail.
    - [x] Implémenter la gestion des pièces jointes, et les joindre à l'e-mail.
    - [x] Implémenter la sauvegarde de l'historique d'envoi dans la table `sent_emails` et la table `user_profiles`.
    - [x] Implémenter la logique de gestion des erreurs et sa sauvegarde dans la table `email_error` et `sent_email`.

- [x] **CRON Job:** (Référence: `supabase/functions/`)
    - [x] Mettre en place un job CRON pour exécuter la logique d'envoi des e-mails.
    - [x] Configurer le job pour s'exécuter quotidiennement ou selon une fréquence configurable.

### II. Front-End

#### A. Composants d'administration

- [x] **Création de la section "Modèles d'e-mails" dans le menu Admin:** (Référence: `src/components/admin/AdminSidebar.tsx`)
    - [x] Ajouter une nouvelle section "Modèles d'e-mails" dans le menu.
        - [x] Un lien vers la liste des modèles.
        - [x] Un lien pour la création de modèles.
- [x] **Création de la section "Settings" dans le menu Admin**
    - [x] Ajouter une nouvelle section "Settings" dans le menu.
        - [x] Un bouton pour se connecter à Google.
        - [x] Un bouton pour se déconnecter de Google.

- [x] **Liste des modèles d'e-mails:** (Référence: `src/components/admin/EmailTemplatesList.tsx`)
    - [x] Créer le composant de liste des modèles.
    - [x] Afficher le nom et le statut.
    - [x] Ajouter les actions Modifier et Supprimer.
    - [x] Implémenter un filtre.
    - [x] Afficher une icône si le modèle est actif ou inactif.

- [x] **Formulaire de création/modification de modèle :** (Référence: `src/components/admin/EmailTemplateForm.tsx`)
    - [x] Créer le formulaire de création/modification.
    - [x] Champs : Nom, Objet, Corps (éditeur riche), Pièce jointe, Statut, Type de planification (avant/après), Nombre de jours.
    - [x] Implémenter le bouton "Insérer variable".
    - [x] Implémenter le bouton "Insérer signature".
    - [x] Implémenter l'éditeur riche (react-quill).
    - [x] Implémenter la logique d'upload de fichier.

- [x] **Page des erreurs d'envoi :** (Référence: `src/components/admin/EmailErrorReport.tsx`)
    - [x] Créer une interface pour afficher toutes les erreurs d'envoi.

- [x] **Configuration Google OAuth :** (Référence: `src/components/admin/GoogleSettings.tsx`)
    - [x] Créer une interface pour configurer la connexion Google OAuth.
    - [x] Implémenter les boutons de connexion et déconnexion.
    - [x] Afficher l'état de la connexion et l'email connecté.

#### B. Composants partagés

- [x] **Éditeur de texte enrichi (react-quill):** (Référence: `src/components/shared/`)
    - [x] Créer un composant réutilisable pour react-quill.
    - [x] Permettre l'insertion des variables.
    - [x] Permettre l'insertion d'une signature.
    - [x] Ajouter la prise en charge de l'upload de fichiers.

- [x] **Composant d'upload de fichier :** (Référence: `src/components/shared/`)
    - [x] Créer un composant pour uploader des fichiers.

- [x] **Intégration dans le profil de l'apprenant:** (Référence: `src/components/`)
    - [x] Modifier le profil de l'apprenant pour afficher l'historique des e-mails.
    - [x] Afficher le nom du modèle, la date d'envoi et l'objet.

### III. Tests

- [ ] **Tests unitaires :**
    - [ ] Écrire des tests unitaires pour les fonctions Back-End.
- [ ] **Tests d'intégration :**
    - [ ] Écrire des tests d'intégration pour l'interaction Front-End/Back-End.
    - [ ] Tester l'intégration Google.
- [ ] **Tests fonctionnels :**
    - [ ] Tester l'ensemble des fonctionnalités du point de vue de l'utilisateur.

### IV. Documentation

- [x] **Documenter les APIs :**
    - [x] Documenter toutes les APIs créées.
- [x] **Documenter le Front-end :**
    - [x] Documenter les nouveaux composants.
- [x] **Documenter l'intégration Google :**
    - [x] Expliquer comment configurer la connexion Google.

### V. Déploiement et configuration

- [ ] **Configuration des variables d'environnement :**
    - [ ] Configurer les variables d'environnement pour les Edge Functions:
      - [ ] `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` pour l'authentification OAuth
      - [ ] `GOOGLE_REDIRECT_URI` pour rediriger après l'authentification
      - [ ] `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` pour accéder à la base de données

- [ ] **Déploiement des Edge Functions :**
    - [ ] Déployer les Edge Functions sur Supabase
    - [ ] Configurer un déclencheur CRON pour exécuter la fonction scheduled-emails quotidiennement

### Remarques

* **Refactorisation :** Ne pas hésiter à refactorer le code si nécessaire.
* **Communication :** Maintenir une communication régulière entre le Front-End et le Back-End.
* **Gestion des erreurs :** Veiller à ce que toutes les erreurs soient correctement traitées.

## Résumé des accomplissements

La fonctionnalité de modèles d'emails a été implémentée avec succès :

1. **Base de données** :
   - Table `settings` modifiée pour stocker les informations Google OAuth
   - Tables `email_templates`, `files`, `sent_emails` et `email_error` créées

2. **Back-End (Edge Functions)** :
   - Edge Function pour l'authentification Google OAuth implémentée
   - Edge Function pour l'envoi d'emails implémentée
   - Edge Function pour l'envoi planifié d'emails implémentée
   - Configuration des Edge Functions ajoutée

3. **Front-End** :
   - Composant de liste des modèles d'emails implémenté
   - Formulaire de création/modification de modèles d'emails implémenté
   - Page des rapports d'erreurs d'emails implémentée
   - Page de configuration Google implémentée
   - AdminDashboard mis à jour pour intégrer ces nouveaux composants

L'application dispose désormais d'un système complet de gestion et d'envoi d'emails basée sur des modèles.
