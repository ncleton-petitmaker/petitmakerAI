# Guide pour résoudre le problème d'upload et d'affichage des tampons

Ce guide vous explique comment résoudre le problème d'upload et d'affichage des tampons dans l'application PetitmakerAI.

## Problème identifié

1. Les tampons sont correctement téléchargés dans le bucket `signatures/seals/`, mais ils ne sont pas accessibles via HTTP.
2. Les politiques RLS (Row Level Security) de Supabase ne permettent pas aux utilisateurs authentifiés d'ajouter des fichiers dans le sous-dossier `seals/`.
3. Le tampon n'est pas visible après son application car l'image n'est pas correctement mise à jour dans l'interface.

## Solution - Étape 1 : Corriger les politiques RLS dans Supabase

1. Connectez-vous à l'interface d'administration Supabase.
2. Allez dans la section **Storage** puis dans l'onglet **Policies**.
3. Créez une nouvelle politique avec les paramètres suivants :
   - **Nom de la politique** : `Authenticated Seal Upload`
   - **Bucket** : `signatures`
   - **Type d'opération** : `INSERT`
   - **Rôles autorisés** : `authenticated`
   - **Définition de la politique** :
   ```sql
   bucket_id = 'signatures' 
   AND name LIKE 'seals/%'
   AND auth.role() = 'authenticated'
   ```
   **Note importante** : Utilisez bien la colonne `name` et non `path`, car c'est la colonne correcte dans le schéma de Supabase Storage.

4. Vérifiez également que la politique "Public Signature Access" existe et permet l'accès en lecture au bucket signatures :
   ```sql
   bucket_id = 'signatures'
   ```

## Solution - Étape 2 : Vérifier les paramètres du bucket

1. Dans la section **Storage**, sélectionnez le bucket `signatures`.
2. Assurez-vous que le bucket est configuré comme **Public** (coché).
3. Créez manuellement un sous-dossier `seals/` s'il n'existe pas déjà.

## Solution - Étape 3 : Tester l'upload de tampon

1. Redémarrez l'application.
2. Essayez d'uploader un tampon via l'interface.
3. Vérifiez les logs dans la console du navigateur pour confirmer que le tampon est correctement uploadé et accessible.

## Solution alternative : Migration SQL

Si vous préférez utiliser une migration SQL, vous pouvez exécuter le script suivant dans l'éditeur SQL de Supabase :

```sql
-- Fix pour permettre aux utilisateurs authentifiés d'uploader des tampons dans le bucket signatures
BEGIN;

-- Supprimer les politiques existantes qui pourraient interférer
DROP POLICY IF EXISTS "Authenticated Seal Upload" ON storage.objects;

-- Créer une politique spécifique pour l'upload de tampons
CREATE POLICY "Authenticated Seal Upload"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'signatures' 
  AND name LIKE 'seals/%'
  AND auth.role() = 'authenticated'
);

-- Vérifier que la politique pour les vues est bien présente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Public Signature Access'
  ) THEN
    CREATE POLICY "Public Signature Access"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'signatures');
  END IF;
END
$$;

-- Assurer que le bucket est bien public (accessible en lecture)
UPDATE storage.buckets
SET public = true
WHERE id = 'signatures';

COMMIT;
```

## Modifications effectuées dans le code

Nous avons effectué les modifications suivantes dans le code de l'application :

1. Amélioré le traitement des URL de tampons pour utiliser des paramètres anti-cache et forcer le rechargement des images.
2. Amélioré la vérification de l'accessibilité des fichiers téléchargés dans le bucket Supabase.
3. Ajouté un message de succès clair lors de l'application du tampon.
4. Implémenté un système de récupération qui insère directement l'image du tampon dans le DOM si elle n'est pas affichée automatiquement.

Ces modifications devraient résoudre le problème d'upload et d'affichage des tampons dans l'application.