# Résolution du problème du bucket "organization-seals"

## Problématique initiale

L'application rencontrait des difficultés pour créer et accéder au bucket "organization-seals" dans Supabase. Les logs indiquaient :

1. Aucun bucket visible (`Array(0)`) malgré leur existence dans Supabase
2. Erreur "Bucket not found" lors des tentatives d'upload
3. Problème d'autorisation avec "public.auth.users" inexistant
4. Échec des tentatives de création via l'API standard

## Approche multi-méthodes

Pour maximiser les chances de résolution, nous avons développé plusieurs scripts utilisant différentes approches :

### 1. API Supabase standard (SDK)
- `create-bucket-all-methods.js` : Essaie toutes les méthodes disponibles via l'API

### 2. API REST directe (HTTP)
- `direct-create-bucket.js` : Contourne le SDK en utilisant des requêtes HTTP natives

### 3. Fonction RPC côté serveur
- `call-rpc-function.js` : Appelle la fonction RPC SECURITY DEFINER créée dans Supabase
- `create_bucket_function.sql` : Définition de la fonction dans la base de données

### 4. Table intermédiaire avec trigger
- `insert-manual-bucket.js` : Insert dans une table accessible via l'API 
- `create_storage_buckets_manual_table.sql` : Création de la table et du trigger

### 5. Connexion PostgreSQL directe
- `create-bucket-sql.js` : Se connecte directement à PostgreSQL pour créer le bucket

### 6. Script automatisé
- `run-bucket-creation.sh` : Script shell qui exécute toutes les méthodes dans l'ordre

## Architecture des solutions

### Solution 1: SDK et API REST
Cette solution tente d'utiliser l'API officielle et a l'avantage d'être simple. Cependant, elle dépend des permissions correctes dans Supabase.

### Solution 2: Fonction RPC SECURITY DEFINER
Cette solution utilise une fonction PostgreSQL côté serveur qui s'exécute avec les privilèges du créateur (superutilisateur) et peut donc contourner les restrictions RLS.

```sql
CREATE OR REPLACE FUNCTION public.create_bucket_organization_seals()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- S'exécute avec les privilèges du créateur
AS $$
DECLARE
  bucket_exists boolean;
  result json;
BEGIN
  -- Vérifier si le bucket existe déjà
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'organization-seals'
  ) INTO bucket_exists;
  
  -- Créer le bucket s'il n'existe pas
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('organization-seals', 'organization-seals', true);
  END IF;
  
  -- Configurer les politiques
  -- [...]
  
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
```

### Solution 3: Table intermédiaire avec trigger
Cette solution crée une table accessible par l'API REST, puis utilise un trigger SECURITY DEFINER pour créer le bucket réel.

```sql
-- Table accessible par l'API
CREATE TABLE public.storage_buckets_manual (
  id text PRIMARY KEY,
  name text NOT NULL,
  -- [...autres champs...]
  processed boolean DEFAULT false
);

-- Activer RLS mais permettre aux utilisateurs authentifiés d'insérer
ALTER TABLE public.storage_buckets_manual ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated insert" ON public.storage_buckets_manual 
  FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger qui crée le bucket réel
CREATE OR REPLACE FUNCTION public.create_storage_bucket_from_manual()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- S'exécute avec les privilèges du créateur
AS $$
BEGIN
  -- Créer le bucket dans storage.buckets
  INSERT INTO storage.buckets (id, name, public)
  VALUES (NEW.id, NEW.name, NEW.public)
  ON CONFLICT (id) DO NOTHING;
  
  -- [...configuration des politiques...]
  
  UPDATE public.storage_buckets_manual 
  SET processed = true WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER storage_buckets_manual_trigger
  AFTER INSERT ON public.storage_buckets_manual
  FOR EACH ROW
  EXECUTE FUNCTION public.create_storage_bucket_from_manual();
```

### Solution 4: Connexion PostgreSQL directe
Cette solution se connecte directement à la base de données PostgreSQL sous-jacente, évitant ainsi toutes les restrictions d'API et RLS.

## Comment utiliser les solutions

Nous recommandons d'utiliser le script automatisé qui tentera toutes les méthodes dans l'ordre :

```bash
./run-bucket-creation.sh
```

En cas d'échec, les fichiers SQL générés peuvent être exécutés manuellement dans l'éditeur SQL de Supabase.

## Diagnostic et dépannage

Si aucune des méthodes automatisées ne fonctionne, les causes probables sont :

1. **Problème d'authentification** - Vérifiez que vous utilisez la clé de service (Service Role Key)
2. **Restrictions de pare-feu** - Vérifiez que votre IP est autorisée si vous utilisez la connexion PostgreSQL
3. **Droits insuffisants** - Certains projets Supabase peuvent avoir des configurations personnalisées
4. **Version de Supabase** - Les API peuvent varier légèrement selon la version

Dans ces cas, la création manuelle du bucket via l'interface utilisateur Supabase reste la solution la plus fiable.

## Conclusion

Cette approche multi-méthodes maximise les chances de créer le bucket "organization-seals" avec les politiques d'accès appropriées, permettant aux apprenants et administrateurs d'uploader leurs tampons. Les scripts fournis peuvent également servir de référence pour d'autres opérations similaires dans Supabase. 