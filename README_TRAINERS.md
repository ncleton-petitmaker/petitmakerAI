# Configuration de la fonctionnalité Formateurs

Ce document explique comment configurer la fonctionnalité Formateurs dans l'application.

## Création de la table des formateurs dans Supabase

1. Connectez-vous à votre projet Supabase.
2. Allez dans la section "SQL Editor" (Éditeur SQL).
3. Créez une nouvelle requête.
4. Copiez et collez le contenu du fichier `create_trainers_table_direct.sql` dans l'éditeur.
5. Exécutez la requête.

Le script SQL va :
- Créer la table `trainers` avec tous les champs nécessaires, y compris `profile_picture_url`
- Créer des index pour améliorer les performances
- Configurer les politiques de sécurité (RLS)
- Insérer quelques formateurs de test avec des photos de profil

## Création des buckets de stockage

### Bucket pour les CV

1. Dans Supabase, allez dans la section "Storage" (Stockage).
2. Créez un nouveau bucket nommé `trainer-cvs`.
3. Configurez les politiques de sécurité pour ce bucket :
   - Permettre aux administrateurs de télécharger des fichiers
   - Permettre à tout le monde de voir les fichiers
   - Permettre aux administrateurs de supprimer des fichiers

### Bucket pour les photos de profil

1. Dans Supabase, allez dans la section "Storage" (Stockage).
2. Créez un nouveau bucket nommé `trainer-profile-pictures`.
3. Configurez les politiques de sécurité pour ce bucket :
   - Permettre aux administrateurs de télécharger des fichiers
   - Permettre à tout le monde de voir les fichiers
   - Permettre aux administrateurs de supprimer des fichiers

## Utilisation de la fonctionnalité Formateurs

Une fois la configuration terminée, vous pourrez :
1. Accéder à la page Formateurs depuis le menu d'administration
2. Ajouter, modifier et supprimer des formateurs
3. Télécharger et consulter les CV des formateurs
4. Ajouter et modifier les photos de profil des formateurs
5. Sélectionner un formateur lors de la création d'une formation

## Fonctionnalités des photos de profil

- **Affichage** : Les photos de profil sont affichées sous forme d'avatars circulaires dans la liste des formateurs et sur la page de détail.
- **Téléchargement** : Vous pouvez télécharger une photo de profil lors de la création d'un formateur ou la modifier ultérieurement.
- **Formats acceptés** : JPG, PNG et autres formats d'image courants.
- **Taille recommandée** : 400x400 pixels pour une qualité optimale.
- **Fallback** : Si aucune photo n'est disponible, l'initiale du formateur est affichée dans un cercle coloré.

## Dépannage

Si vous rencontrez des erreurs comme "relation \"public.trainers\" does not exist", cela signifie que la table n'a pas été créée correctement. Vérifiez que vous avez bien exécuté le script SQL et qu'il n'y a pas eu d'erreurs lors de l'exécution.

Si vous avez des problèmes avec le téléchargement des CV ou des photos de profil, vérifiez que les buckets `trainer-cvs` et `trainer-profile-pictures` ont été créés et que les politiques de sécurité sont correctement configurées. 