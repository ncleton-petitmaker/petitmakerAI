# Guide de dépannage pour l'application

Ce guide vous aidera à résoudre les problèmes courants rencontrés lors de l'utilisation de l'application, en particulier les problèmes liés à la connexion à Supabase et à la création des tables.

## Problèmes de connexion à Supabase

Si vous rencontrez des erreurs comme "Failed to load resource: the server responded with a status of 400 ()" ou "Admin page - Supabase connection check timed out", suivez ces étapes :

### 1. Vérifier la connexion à Supabase

Exécutez le script de vérification pour voir si vous pouvez vous connecter à Supabase et vérifier l'état des tables :

```bash
# Installer les dépendances nécessaires
npm install @supabase/supabase-js

# Exécuter le script de vérification
node check_supabase.js
```

### 2. Créer les tables manquantes

Si le script de vérification indique que des tables sont manquantes, exécutez le script de création des tables :

```bash
# Rendre le script exécutable (si ce n'est pas déjà fait)
chmod +x create_tables_individually.sh

# Exécuter le script
./create_tables_individually.sh
```

## Erreurs spécifiques et solutions

### Erreur 400 lors de l'accès aux tables

Cette erreur indique généralement que la table n'existe pas ou que vous n'avez pas les permissions nécessaires.

**Solution :** Exécutez le script de création des tables comme indiqué ci-dessus.

### Erreur 404 pour la fonction execute_sql

Cette erreur indique que la fonction RPC `execute_sql` n'existe pas sur votre instance Supabase.

**Solution :** Le script `create_tables_individually.sh` modifié n'utilise plus cette fonction et crée directement les tables.

### Timeouts de connexion

Si vous rencontrez des timeouts lors de la connexion à Supabase, cela peut être dû à des problèmes réseau ou à des limitations de l'API Supabase.

**Solution :**
1. Vérifiez votre connexion internet
2. Assurez-vous que les URL et clés API Supabase dans le fichier `.env` sont correctes
3. Essayez à nouveau plus tard, car il peut s'agir d'une limitation temporaire de l'API

## Structure des tables

Voici les tables nécessaires au bon fonctionnement de l'application :

1. `user_profiles` - Profils des utilisateurs
2. `companies` - Entreprises
3. `trainings` - Formations
4. `training_participants` - Participants aux formations

Le script `create_tables_individually.sh` crée toutes ces tables avec les structures appropriées.

## Après avoir créé les tables

Une fois que vous avez créé les tables, rafraîchissez la page de l'application. Vous devriez maintenant pouvoir :

1. Voir la liste des entreprises
2. Créer et gérer des formations
3. Associer des participants aux formations

Si vous rencontrez encore des problèmes après avoir suivi ces étapes, veuillez consulter les logs de la console du navigateur pour plus de détails sur les erreurs. 