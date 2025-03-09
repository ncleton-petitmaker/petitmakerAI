# Outils Supabase

Ce dossier contient des outils pour interagir avec la base de données Supabase du projet.

## Fichiers disponibles

- `supabase-client.js` : Client Supabase configuré avec les clés d'API
- `supabase-direct.js` : Fonctions pour interagir directement avec l'API Supabase
- `explore-supabase.js` : Script pour explorer la structure de la base de données
- `configure-rls.js` : Script pour configurer les politiques de sécurité RLS
- `apply-migration.js` : Script pour appliquer des migrations SQL
- `run-migration.js` : Script alternatif pour exécuter des migrations SQL
- `supabase-migration.sql` : Migration SQL pour configurer les politiques RLS
- `simplify-trainings.sql` : Migration SQL pour simplifier la structure des formations
- `simplify-trainings.js` : Script pour exécuter la simplification des formations
- `configure-trainings-rls.sql` : Script SQL pour configurer les politiques RLS pour la table trainings
- `configure-trainings-rls.js` : Script pour exécuter la configuration des politiques RLS pour la table trainings
- `fix-trainings-rls.js` : Script pour corriger les politiques RLS pour la table trainings
- `fix-trainings-rls-manual.sql` : Script SQL pour configurer manuellement les politiques RLS
- `direct-fix-rls.js` : Script pour corriger directement les politiques RLS sans intervention manuelle

## Comment utiliser ces outils

### Explorer la base de données

```bash
npm run supabase:explore
```

Ce script explore la structure de la base de données Supabase et affiche les tables, leurs colonnes et quelques exemples de données.

### Configurer les politiques RLS

```bash
npm run supabase:configure-rls
```

Ce script configure les politiques de sécurité Row Level Security (RLS) pour toutes les tables de la base de données.

### Appliquer une migration SQL

```bash
npm run supabase:apply-migration
```

Ce script applique la migration SQL définie dans le fichier `supabase-migration.sql`.

### Simplifier la structure des formations

```bash
npm run supabase:simplify-trainings
```

Ce script simplifie la structure de la base de données des formations en :
1. Supprimant les tables inutiles (training_periods et training_time_slots)
2. Ajoutant une colonne metadata à la table trainings si elle n'existe pas
3. Migrant les données des tables supprimées vers la colonne metadata
4. Configurant les politiques RLS pour la table trainings

### Configurer les politiques RLS pour la table trainings

```bash
npm run supabase:configure-trainings-rls
```

### Corriger les politiques RLS pour la table trainings

```bash
npm run supabase:fix-trainings-rls
```

### Corriger directement les politiques RLS sans intervention manuelle

```bash
npm run supabase:direct-fix-rls
```

## Simplification des formations

Le script `supabase:simplify-trainings` simplifie la structure de la base de données pour les formations en :
1. Supprimant les tables inutiles (training_periods et training_time_slots)
2. Ajoutant une colonne metadata à la table trainings
3. Migrant les données des tables supprimées vers la colonne metadata
4. Configurant les politiques RLS pour la table trainings

## Configuration des politiques RLS pour la table trainings

Le script `supabase:configure-trainings-rls` configure les politiques RLS pour la table trainings en :
1. Activant RLS sur la table trainings
2. Supprimant les politiques existantes pour éviter les conflits
3. Créant les politiques suivantes :
   - Les utilisateurs peuvent voir les formations auxquelles ils sont inscrits
   - Les administrateurs peuvent modifier les formations
   - Les administrateurs peuvent supprimer les formations
   - Les administrateurs peuvent ajouter des formations

## Configuration

Les outils utilisent les clés d'API Supabase suivantes :

- URL : https://efgirjtbuzljtzpuwsue.supabase.co
- Clé anonyme : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMjU0MDQsImV4cCI6MjA1NTgwMTQwNH0.aY8wI1r5RW78L0yjYX5wNBD6bY0Ybqbm6JdiUeejVR4
- Clé de service : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZ2lyanRidXpsanR6cHV3c3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIyNTQwNCwiZXhwIjoyMDU1ODAxNDA0fQ.lk0lG2qYwyBg8PVmF5NnUvBY4tz8A0dfOiD-ptA4fTk

## Politiques de sécurité

Les politiques de sécurité configurées suivent ces principes :

1. **Accès utilisateur** : Les utilisateurs peuvent voir et modifier uniquement leurs propres données (profil, réponses aux questionnaires, etc.)
2. **Accès administrateur** : Les administrateurs ont un accès complet à toutes les données
3. **Données partagées** : Certaines données sont accessibles à tous les utilisateurs authentifiés (annonces, modèles de questionnaires, etc.)
4. **Données d'entreprise** : Les utilisateurs peuvent voir les données liées à leur entreprise

Pour plus d'informations sur la configuration de Supabase, consultez le fichier `SUPABASE_GUIDE.md` à la racine du projet. 