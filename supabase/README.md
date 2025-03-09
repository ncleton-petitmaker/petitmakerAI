# Supabase Database Setup

Ce dossier contient les migrations SQL nécessaires pour configurer la base de données Supabase pour l'application.

## Déploiement des fonctions SQL

Pour déployer les fonctions SQL dans votre projet Supabase, suivez ces étapes :

### Option 1 : Via l'interface Supabase

1. Connectez-vous à votre [dashboard Supabase](https://app.supabase.io)
2. Sélectionnez votre projet
3. Allez dans la section "SQL Editor"
4. Créez une nouvelle requête
5. Copiez et collez le contenu du fichier `migrations/create_table_functions.sql`
6. Exécutez la requête

### Option 2 : Via la CLI Supabase

Si vous avez installé la [CLI Supabase](https://supabase.com/docs/guides/cli), vous pouvez exécuter :

```bash
supabase db push
```

## Fonctions disponibles

Les fonctions suivantes sont disponibles après le déploiement :

1. `get_server_timestamp()` - Renvoie l'horodatage actuel du serveur (utilisé pour vérifier la connexion)
2. `create_user_profiles_table_if_not_exists()` - Crée la table `user_profiles` si elle n'existe pas
3. `create_notifications_table_if_not_exists()` - Crée la table `notifications` si elle n'existe pas
4. `create_companies_table_if_not_exists()` - Crée la table `companies` si elle n'existe pas
5. `create_documents_table_if_not_exists()` - Crée la table `documents` si elle n'existe pas
6. `create_trainings_table_if_not_exists()` - Crée la table `trainings` et `training_participants` si elles n'existent pas

## Structure des tables

### user_profiles
- `id` - UUID (clé primaire, référence à auth.users)
- `is_admin` - Boolean (indique si l'utilisateur est un administrateur)
- `first_name` - Text
- `last_name` - Text
- `company_id` - UUID (référence à companies)
- `created_at` - Timestamp
- `updated_at` - Timestamp

### notifications
- `id` - UUID (clé primaire)
- `user_id` - UUID (référence à auth.users)
- `title` - Text
- `message` - Text
- `read` - Boolean
- `created_at` - Timestamp
- `updated_at` - Timestamp

### companies
- `id` - UUID (clé primaire)
- `name` - Text
- `address` - Text
- `postal_code` - Text
- `city` - Text
- `country` - Text
- `phone` - Text
- `email` - Text
- `created_at` - Timestamp
- `updated_at` - Timestamp

### documents
- `id` - UUID (clé primaire)
- `title` - Text
- `description` - Text
- `file_path` - Text
- `file_type` - Text
- `file_size` - Integer
- `company_id` - UUID (référence à companies)
- `user_id` - UUID (référence à auth.users)
- `is_public` - Boolean
- `created_at` - Timestamp
- `updated_at` - Timestamp

### trainings
- `id` - UUID (clé primaire)
- `title` - Text
- `description` - Text
- `start_date` - Timestamp
- `end_date` - Timestamp
- `location` - Text
- `max_participants` - Integer
- `company_id` - UUID (référence à companies)
- `created_at` - Timestamp
- `updated_at` - Timestamp

### training_participants
- `id` - UUID (clé primaire)
- `training_id` - UUID (référence à trainings)
- `user_id` - UUID (référence à auth.users)
- `status` - Text (registered, confirmed, cancelled, completed)
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Politiques de sécurité (RLS)

Toutes les tables sont configurées avec Row Level Security (RLS) pour garantir que les utilisateurs n'accèdent qu'aux données auxquelles ils sont autorisés à accéder. Les politiques sont définies pour chaque table dans les fonctions de création correspondantes. 