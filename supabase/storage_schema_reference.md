# Référence du schéma Storage dans Supabase

Ce document fournit une référence des tables et colonnes importantes dans le schéma `storage` de Supabase, utile pour créer des politiques RLS correctes et comprendre le fonctionnement du stockage.

## Table `storage.buckets`

Cette table stocke les informations sur les buckets (conteneurs de fichiers).

| Colonne           | Type          | Description                                       |
|-------------------|---------------|---------------------------------------------------|
| id                | text          | Identifiant unique du bucket                      |
| name              | text          | Nom du bucket                                     |
| public            | boolean       | Si le bucket est accessible publiquement          |
| file_size_limit   | bigint        | Taille maximale de fichier autorisée (en bytes)   |
| allowed_mime_types| text[]        | Types MIME autorisés dans ce bucket               |
| created_at        | timestamptz   | Date de création                                  |
| updated_at        | timestamptz   | Date de dernière mise à jour                      |

## Table `storage.objects`

Cette table stocke les métadonnées des fichiers dans les buckets.

| Colonne           | Type          | Description                                       |
|-------------------|---------------|---------------------------------------------------|
| id                | uuid          | Identifiant unique du fichier                     |
| bucket_id         | text          | Identifiant du bucket contenant le fichier        |
| name              | text          | Chemin complet du fichier, y compris sous-dossiers|
| owner             | uuid          | ID de l'utilisateur qui a uploadé le fichier      |
| created_at        | timestamptz   | Date de création                                  |
| updated_at        | timestamptz   | Date de dernière mise à jour                      |
| last_accessed_at  | timestamptz   | Date du dernier accès                             |
| metadata          | jsonb         | Métadonnées du fichier                            |
| size              | bigint        | Taille du fichier en bytes                        |

## Exemples de politiques RLS

### Permettre l'upload dans un sous-dossier spécifique

```sql
CREATE POLICY "Upload dans sous-dossier"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mon-bucket' AND
  name LIKE 'mon-dossier/%'
);
```

### Permettre l'accès en lecture à tous les fichiers d'un bucket

```sql
CREATE POLICY "Accès public en lecture"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'mon-bucket');
```

### Permettre à un utilisateur de gérer uniquement ses propres fichiers

```sql
CREATE POLICY "Gérer ses propres fichiers"
ON storage.objects
FOR ALL
TO authenticated
USING (owner = auth.uid());
```

## Remarques importantes

1. La colonne `name` dans `storage.objects` contient le chemin complet du fichier, y compris les sous-dossiers, par exemple : `dossier/sous-dossier/fichier.jpg`.

2. Pour cibler des fichiers dans un sous-dossier spécifique, utilisez `name LIKE 'dossier/%'`.

3. Il n'y a pas de colonne distincte pour le nom du fichier ou le chemin dans `storage.objects`, tout est contenu dans la colonne `name`.

4. Pour permettre l'accès à un bucket entier, utilisez simplement `bucket_id = 'mon-bucket'` dans votre politique. 