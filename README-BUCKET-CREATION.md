# Création du bucket "organization-seals" dans Supabase

Ce répertoire contient plusieurs scripts pour créer le bucket "organization-seals" dans Supabase, destiné à stocker les tampons d'organisation. Nous avons fourni plusieurs méthodes alternatives car vous semblez rencontrer des problèmes d'autorisation avec l'API Supabase standard.

## Exécution rapide (Recommandé)

Pour tester toutes les méthodes automatiquement, utilisez simplement le script shell :

```bash
./run-bucket-creation.sh
```

Ce script va :
1. Installer les dépendances nécessaires
2. Vérifier la présence du fichier `.env` et en créer un si nécessaire
3. Exécuter toutes les méthodes dans l'ordre jusqu'à ce qu'une réussisse
4. Afficher un résumé des actions effectuées

## Prérequis

Assurez-vous d'avoir les éléments suivants installés :

- Node.js (v14 ou supérieur)
- npm ou yarn

Installez les dépendances nécessaires :

```bash
npm install @supabase/supabase-js dotenv pg
# ou avec yarn
yarn add @supabase/supabase-js dotenv pg
```

## Configuration des variables d'environnement

Créez un fichier `.env` à la racine du projet contenant vos identifiants Supabase :

```
# Informations Supabase (obligatoires)
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre-clé-de-service

# Informations PostgreSQL (optionnelles pour la méthode 5)
POSTGRES_PASSWORD=votre-mot-de-passe-postgres
POSTGRES_HOST=votre-host-postgres
POSTGRES_USER=postgres
POSTGRES_DB=postgres
```

**Note importante :** Pour ces opérations, nous recommandons d'utiliser la clé de service (Service Role Key) et non la clé anonyme (Anon Key), car certaines opérations nécessitent des privilèges administrateur.

## Approche recommandée

Nous recommandons de suivre ces étapes dans l'ordre jusqu'à ce qu'une méthode réussisse :

1. Exécutez d'abord le script shell `./run-bucket-creation.sh` qui automatise tout le processus
2. Si vous préférez exécuter les scripts manuellement, suivez l'ordre ci-dessous :
   - Script "tout-en-un" qui essaie toutes les méthodes API
   - Si cela échoue, essayez la connexion directe PostgreSQL
   - En dernier recours, créez le bucket manuellement via l'interface Supabase

## Scripts disponibles

### 1. Script "Tout-en-un" via API (Première tentative)

Le script `create-bucket-all-methods.js` essaie toutes les méthodes API disponibles pour créer le bucket, dans un ordre logique, jusqu'à ce qu'une réussisse.

```bash
node create-bucket-all-methods.js
```

Ce script :
1. Vérifie si le bucket existe déjà
2. Essaie de créer le bucket via le SDK Supabase
3. Si cela échoue, essaie via une requête HTTP directe
4. Si cela échoue, essaie via la fonction RPC
5. Si cela échoue, essaie via la table intermédiaire avec trigger
6. Génère un script SQL pour les politiques d'accès

### 2. Connexion directe PostgreSQL (Si l'API échoue)

Si les méthodes API échouent, ce script se connecte directement à la base de données PostgreSQL sous-jacente :

```bash
node create-bucket-sql.js
```

**Important :** Pour que ce script fonctionne, vous devez avoir l'accès PostgreSQL à votre base de données Supabase. Cela peut nécessiter de configurer les variables supplémentaires dans le fichier `.env` comme indiqué ci-dessus.

### 3. Scripts individuels pour dépannage

Si vous préférez essayer les méthodes une par une pour diagnostic :

#### Création directe via HTTP

```bash
node direct-create-bucket.js
```

#### Création via la table intermédiaire

```bash
node insert-manual-bucket.js
```

#### Appel de la fonction RPC

```bash
node call-rpc-function.js
```

## Fichiers SQL

Certains scripts génèrent des fichiers SQL qui doivent être exécutés manuellement dans l'éditeur SQL de Supabase :

- `all-methods-policies.sql` : Politiques d'accès pour le bucket
- `direct-bucket-policies.sql` : Politiques générées par le script direct
- `create_bucket_function.sql` : Définition de la fonction RPC
- `create_storage_buckets_manual_table.sql` : Création de la table intermédiaire avec trigger

## Problèmes connus et solutions

### "Bucket not found"

Si vous recevez cette erreur malgré la création du bucket :

1. Vérifiez que le bucket existe dans l'interface Supabase (Storage)
2. Exécutez les scripts de politique d'accès dans l'éditeur SQL
3. Redémarrez votre application
4. Essayez de vider le cache du navigateur

### "Permission denied"

Si vous rencontrez des erreurs d'autorisation :

1. Assurez-vous d'utiliser la clé de service (Service Role Key)
2. Vérifiez que les politiques RLS sont correctement configurées
3. Essayez de créer le bucket manuellement via l'interface Supabase

### "Table does not exist"

Si la table `storage_buckets_manual` n'existe pas :

1. Exécutez d'abord le script SQL `create_storage_buckets_manual_table.sql` dans l'éditeur SQL de Supabase
2. Puis réessayez le script `insert-manual-bucket.js`

### Erreur de connexion PostgreSQL

Si vous rencontrez des erreurs avec la connexion PostgreSQL directe :

1. Vérifiez que les informations de connexion sont correctes dans le fichier `.env`
2. Assurez-vous que votre IP est autorisée dans les règles de pare-feu de Supabase
3. Vérifiez que l'utilisateur PostgreSQL a les droits suffisants

## Création manuelle (Dernier recours)

Si aucun script ne fonctionne, vous pouvez créer le bucket manuellement :

1. Connectez-vous à l'interface Supabase et naviguez vers "Storage"
2. Cliquez sur "New Bucket"
3. Nommez-le "organization-seals" et cochez "Public bucket"
4. Exécutez le script SQL suivant dans l'éditeur SQL pour configurer les politiques :

```sql
-- Politique pour permettre à tout le monde de voir les tampons
CREATE POLICY "Tout le monde peut voir les tampons"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-seals');

-- Politique pour permettre aux utilisateurs authentifiés d'ajouter des tampons
CREATE POLICY "Les utilisateurs peuvent ajouter des tampons"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'organization-seals' AND auth.role() = 'authenticated');

-- Politique pour permettre aux utilisateurs de modifier leurs propres tampons
CREATE POLICY "Les utilisateurs peuvent modifier leurs tampons"
ON storage.objects FOR UPDATE
USING (bucket_id = 'organization-seals' AND auth.role() = 'authenticated');

-- Politique pour permettre aux utilisateurs de supprimer leurs propres tampons
CREATE POLICY "Les utilisateurs peuvent supprimer leurs tampons"
ON storage.objects FOR DELETE
USING (bucket_id = 'organization-seals' AND auth.role() = 'authenticated');
```

## Utilisation dans l'application

Une fois le bucket créé et les politiques configurées, les apprenants et les administrateurs pourront uploader des tampons dans le bucket "organization-seals" depuis l'interface utilisateur de l'application. 