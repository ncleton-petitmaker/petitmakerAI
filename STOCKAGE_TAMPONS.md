# Structure de stockage des tampons

## Organisation actuelle

Les tampons (seals) sont désormais stockés exclusivement dans le **sous-dossier `seals/`** du bucket **`signatures`** dans Supabase Storage. Cette approche simplifie la gestion et les politiques d'accès.

```
signatures/
└── seals/
    ├── companySeal_convention_1742387214749.png
    ├── organization_seal_1742387214750.png
    └── ...
```

## Anciennes structures (obsolètes)

Auparavant, deux approches différentes étaient utilisées :
- Les tampons d'entreprise (companySeal) étaient stockés dans le bucket `signatures`
- Les tampons d'organisation (organizationSeal) étaient stockés dans un bucket séparé `organization-seals`

Cette double structure causait des confusions et des problèmes de permissions.

## Nommage des fichiers

Les tampons suivent maintenant la convention de nommage suivante :
- Tampons d'entreprise : `seals/companySeal_[type]_[timestamp].png`
- Tampons d'organisation : `seals/organization_seal_[timestamp].png`

## Politiques d'accès (RLS)

Les politiques d'accès sont définies pour permettre :
1. **Lecture publique** de tous les fichiers dans le sous-dossier `seals/`
2. **Écriture authentifiée** pour les utilisateurs connectés

Ces politiques sont définies dans la migration SQL `supabase/migrations/20250601000003_fix_seal_access_permissions.sql`.

## Migration

Le bucket `organization-seals` n'est plus utilisé et a été supprimé via la migration SQL `supabase/migrations/20250601000004_cleanup_organization_seals_bucket.sql`.

## Stockage dans le code

Le code utilise désormais exclusivement le sous-dossier `seals/` dans le bucket `signatures` pour stocker les tampons :
```typescript
// Dans DocumentManager.ts
if (params.type === 'companySeal' || params.type === 'organizationSeal') {
  bucketPath = 'seals/';
  console.log(`🔧 [CORRECTION] Stockage des tampons dans le sous-dossier "seals" du bucket "${bucketName}"`);
}
``` 