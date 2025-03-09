# Bonnes Pratiques pour l'Intégration de Supabase dans Cursor

Ce document synthétise les meilleures pratiques pour intégrer Supabase dans l'IDE Cursor via le protocole MCP (Model Context Protocol), en se basant sur les retours d'expérience de la communauté et les cas d'usage réels.

## Configuration Initiale

### Installation et Connexion
- Installer le package nécessaire : `@modelcontextprotocols/server-postgres`
- Utiliser le paramètre `-y` lors de l'exécution du serveur MCP pour éviter les échecs silencieux
```bash
npx -y @modelcontextprotocols/server-postgres postgresql://postgres:password@db.example.supabase.co:5432/postgres
```

### Gestion des Environnements
- Créer un fichier `.cursor/mcp.json` pour chaque branche de développement
- Séparer clairement les environnements de développement et de production
```json
{
  "environments": {
    "dev": {
      "supabaseUrl": "https://your-dev-instance.supabase.co",
      "anonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "prod": {
      "supabaseUrl": "https://your-prod-instance.supabase.co",
      "anonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

## Débogage et Résolution de Problèmes

### Sous Windows
- Encapsuler les appels MCP dans des scripts PowerShell
- Utiliser `Start-Process` avec les flags `-NoNewWindow` et `-RedirectStandardOutput`
```powershell
Start-Process -NoNewWindow -FilePath "npx" -ArgumentList "@modelcontextprotocols/server-postgres $connectionString" -RedirectStandardOutput "mcp.log"
```

### Gestion du Cache
- Utiliser `cursor.mcp.refreshSchemaCache()` après les migrations pour forcer une re-synchronisation
- Surveiller les incohérences entre la structure réelle et la perception de l'IA

## Amélioration du Contexte IA

### Documentation Intégrée
- Ajouter la documentation Supabase via `@Docs → Add new doc`
- Utiliser des annotations JSDoc pour enrichir le contexte
```javascript
/**
 * @supabase {auth.signUp} 
 * Crée un nouvel utilisateur avec vérification d'email
 * @param {string} email - Adresse de l'utilisateur
 * @param {string} password - Mot de passe non hashé
 * @returns {Promise}
 */
```

### Génération de Migrations
- Utiliser des commandes en langage naturel pour générer des scripts SQL
- Exemple : `@Generate migration for user profile table with email verification`
```sql
-- Migration générée automatiquement
BEGIN;
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN verification_token TEXT;
CREATE UNIQUE INDEX idx_users_verification_token ON users (verification_token);
COMMIT;
```

## Optimisation pour Projets à Grande Échelle

### Sharding Contextuel
- Découper le schéma en sous-contextes MCP pour les bases volumineuses
- Configurer chaque microservice avec son propre fichier `mcp.config.js`
```javascript
// mcp.config.js
module.exports = {
  schemaScope: ['public', 'auth', 'storage'],
  maxRelationships: 150,
  vectorCacheSize: '2GB'
};
```

### Migrations Différentielles
- Utiliser le diffing de schéma entre branches Git
- Générer automatiquement des scripts de mise à jour avec rollback intégré

## Performance

### Vues Matérialisées
- Prétraiter les jointures fréquentes pour réduire la latence des requêtes IA
- Utiliser `EXPLAIN VECTOR` pour identifier les chemins d'accès sous-optimaux
```sql
CREATE MATERIALIZED VIEW user_activity_summary AS
SELECT 
  user_id,
  COUNT(*) AS total_actions,
  MAX(created_at) AS last_active
FROM 
  audit_log
GROUP BY 
  user_id;
```

### Configuration du Cache
- Ajuster le fichier `.cursor/context_cache.json` selon les ressources disponibles
- Viser un ratio de 1GB de RAM pour 500 tables avec relations
```json
{
  "cacheStrategy": "lru",
  "maxEmbeddings": 15000,
  "vectorDimensions": 768,
  "precision": "float32"
}
```

## Sécurité

### Row Level Security (RLS)
- Générer des templates RLS à partir des commentaires JSDoc
- Intégrer les politiques RLS dès le début du cycle de développement
```sql
CREATE POLICY user_profile_access
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  AND verified_email IS TRUE
);
```

### Audit de Sécurité
- Utiliser le module `Cursor Security Suite` pour détecter les vulnérabilités
- Vérifier régulièrement :
  - Cartographie des accès implicites
  - Analyse des chemins de relation critiques
  - Recommandations de durcissement contextuel

## Problèmes Courants et Solutions

### Erreur "RLS policy violation"
- Vérifier que les politiques RLS sont correctement configurées
- Désactiver temporairement RLS pour le débogage : 
```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

### Problèmes de Connectivité
- Vérifier les paramètres de connexion dans le fichier `.env`
- S'assurer que l'adresse IP est autorisée dans les paramètres de Supabase

### Incohérences de Cache
- Forcer le rafraîchissement du cache avec `cursor.mcp.refreshSchemaCache()`
- Redémarrer le serveur MCP en cas de problèmes persistants

## Résolution des Problèmes d'Enregistrement avec RLS

### Diagnostic des Problèmes RLS
1. **Ajouter des logs détaillés** dans le code client pour identifier où l'opération échoue :
```javascript
console.log("🔍 [DEBUG] Début de la soumission du formulaire");
// ... code d'insertion ...
console.log("✅ [DEBUG] Soumission réussie");
```

2. **Créer un script de diagnostic SQL** pour vérifier l'état actuel des politiques RLS :
```sql
-- Vérifier si RLS est activé
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'table_name';

-- Lister toutes les politiques existantes
SELECT * FROM pg_policies 
WHERE tablename = 'table_name';
```

### Solutions Progressives

#### Niveau 1 : Correction des Politiques RLS
Créer des politiques RLS correctement configurées :
```sql
-- Politique pour permettre à tout le monde de voir les données
CREATE POLICY "Tout le monde peut voir les données" 
ON table_name FOR SELECT 
USING (true);

-- Politique pour permettre aux administrateurs de modifier les données
CREATE POLICY "Les administrateurs peuvent modifier les données" 
ON table_name FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.is_admin = true
  )
);
```

#### Niveau 2 : Contournement via API REST Directe
Si les politiques RLS continuent de poser problème, utiliser l'API REST directe :
```javascript
// Essayer d'abord avec l'API standard
const { data, error } = await supabase
  .from('table_name')
  .insert(submissionData);

if (error) {
  console.error("❌ [ERROR] Erreur via API standard:", error);
  
  // Essayer avec l'API REST directe
  const response = await fetch(`${supabaseUrl}/rest/v1/table_name`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${accessToken}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(submissionData)
  });
}
```

#### Niveau 3 : Solution Radicale - Désactivation de RLS
En dernier recours, désactiver temporairement RLS pour la table problématique :
```sql
-- Désactiver RLS sur la table
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Vérifier que RLS est bien désactivé
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'table_name';
```

### Bonnes Pratiques pour Éviter les Problèmes RLS

1. **Simplifier la Structure de Données** :
   - Stocker les données liées dans des champs JSON/JSONB plutôt que dans des tables séparées
   - Exemple : `metadata JSONB DEFAULT '{}'` pour stocker des informations complémentaires

2. **Tester les Politiques RLS** :
   - Créer des tests automatisés pour vérifier que les politiques fonctionnent comme prévu
   - Simuler différents rôles d'utilisateurs pour valider les accès

3. **Documenter les Politiques** :
   - Maintenir une documentation claire des politiques RLS pour chaque table
   - Inclure des exemples de requêtes qui devraient réussir ou échouer

4. **Monitoring des Erreurs RLS** :
   - Mettre en place un système de logging des erreurs RLS
   - Analyser régulièrement les patterns d'erreurs pour identifier les problèmes récurrents

## Bonnes Pratiques Générales

1. **Documenter le Schéma** : Ajouter des commentaires descriptifs aux tables et colonnes
2. **Versionner les Configurations** : Inclure les fichiers `.cursor` dans le contrôle de version
3. **Tests Automatisés** : Créer des tests pour valider les politiques RLS
4. **Monitoring** : Surveiller les performances des requêtes générées par l'IA
5. **Formation** : Former l'équipe aux spécificités de l'interaction IA-base de données

---

Ces bonnes pratiques évoluent constamment avec les mises à jour de Cursor et Supabase. Consultez régulièrement la documentation officielle pour les dernières recommandations. 