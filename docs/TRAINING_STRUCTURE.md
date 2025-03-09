# Guide de la structure de données des formations

## Simplification de la structure de données

La structure de données des formations a été simplifiée pour améliorer la gestion des permissions et éviter les problèmes d'accès aux tables liées. Voici les principaux changements :

1. **Suppression des tables séparées** : Les tables `training_periods` et `training_time_slots` ont été supprimées.
2. **Utilisation d'un champ JSON** : Toutes les données des périodes et des créneaux horaires sont maintenant stockées dans le champ `metadata` de la table `trainings`.
3. **Configuration des politiques RLS** : Les politiques RLS ont été configurées pour la table `trainings` afin de gérer les permissions d'accès.

## Structure du champ `metadata`

Le champ `metadata` est un objet JSON qui contient les informations suivantes :

```json
{
  "periods": [
    {
      "id": "1",
      "start_date": "2023-01-01T00:00:00.000Z",
      "end_date": "2023-01-05T00:00:00.000Z"
    },
    {
      "id": "2",
      "start_date": "2023-01-10T00:00:00.000Z",
      "end_date": "2023-01-15T00:00:00.000Z"
    }
  ],
  "timeSlots": [
    {
      "id": "1",
      "startTime": "09:00",
      "endTime": "12:30"
    },
    {
      "id": "2",
      "startTime": "14:00",
      "endTime": "17:30"
    }
  ],
  "duration_details": {
    "total_days": 10,
    "total_hours": 70
  },
  "last_updated": "2023-01-01T00:00:00.000Z"
}
```

## Utilisation dans le code

### Lecture des données

Pour lire les périodes et les créneaux horaires d'une formation, utilisez le code suivant :

```typescript
// Extraire les métadonnées du training
const extractMetadata = (training: any) => {
  let extractedPeriods = [];
  let extractedTimeSlots = [];
  
  // Extraire les métadonnées du champ metadata s'il existe
  if (training?.metadata) {
    try {
      // Si metadata est déjà un objet, l'utiliser directement
      const metadata = typeof training.metadata === 'string' 
        ? JSON.parse(training.metadata) 
        : training.metadata;
      
      if (metadata?.periods && Array.isArray(metadata.periods)) {
        extractedPeriods = metadata.periods;
      }
      if (metadata?.timeSlots && Array.isArray(metadata.timeSlots)) {
        extractedTimeSlots = metadata.timeSlots;
      }
    } catch (error) {
      console.warn('Erreur lors du parsing des métadonnées:', error);
    }
  }
  
  return { extractedPeriods, extractedTimeSlots };
};

// Utilisation
const { extractedPeriods, extractedTimeSlots } = extractMetadata(training);
```

### Écriture des données

Pour écrire les périodes et les créneaux horaires d'une formation, utilisez le code suivant :

```typescript
// Créer un objet metadata complet
const metadata = {
  periods: periods.map(p => ({
    id: p.id,
    start_date: p.startDate ? p.startDate.toISOString() : null,
    end_date: p.endDate ? p.endDate.toISOString() : null
  })),
  timeSlots: timeSlots.map(ts => ({
    id: ts.id,
    startTime: ts.startTime,
    endTime: ts.endTime
  })),
  duration_details: {
    total_days: calculateTotalDays(periods),
    total_hours: calculateTotalHours(periods, timeSlots)
  },
  last_updated: new Date().toISOString()
};

// Préparer les données pour la soumission
const submissionData = {
  // Autres champs de la formation...
  
  // Stocker les métadonnées pour les périodes et les tranches horaires
  metadata: JSON.stringify(metadata)
};

// Envoyer les données à Supabase
const { data, error } = await supabase
  .from('trainings')
  .update(submissionData)
  .eq('id', trainingId);
```

## Politiques RLS

Les politiques RLS suivantes ont été configurées pour la table `trainings` :

1. **Politique pour voir les formations (SELECT)** :
   - Nom : "Les utilisateurs peuvent voir les formations auxquelles ils sont inscrits"
   - Utilisation : `auth.uid() IN (SELECT user_id FROM user_profiles WHERE training_id = id) OR auth.jwt() ? 'admin_access'`

2. **Politique pour modifier les formations (UPDATE)** :
   - Nom : "Les administrateurs peuvent modifier les formations"
   - Utilisation : `auth.jwt() ? 'admin_access'`

3. **Politique pour supprimer les formations (DELETE)** :
   - Nom : "Les administrateurs peuvent supprimer les formations"
   - Utilisation : `auth.jwt() ? 'admin_access'`

4. **Politique pour ajouter des formations (INSERT)** :
   - Nom : "Les administrateurs peuvent ajouter des formations"
   - Vérification : `auth.jwt() ? 'admin_access'`

## Avantages de cette approche

1. **Simplification de la structure** : Toutes les données liées à une formation sont stockées dans une seule table.
2. **Gestion des permissions simplifiée** : Les politiques RLS sont appliquées uniquement à la table `trainings`.
3. **Flexibilité** : Le champ `metadata` peut être facilement étendu pour stocker d'autres informations sans modifier la structure de la base de données.
4. **Performance** : Moins de requêtes sont nécessaires pour récupérer toutes les informations d'une formation.

## Migration des données existantes

Si vous avez des données existantes dans les tables `training_periods` et `training_time_slots`, vous pouvez les migrer vers le champ `metadata` de la table `trainings` en utilisant le script `supabase-tools/simplify-trainings.js`.

```bash
npm run supabase:simplify-trainings
```

Ce script vous guidera à travers les étapes nécessaires pour migrer les données et configurer les politiques RLS. 