# Analyse des Questionnaires

## Structure Actuelle

### Tables Principales
1. `questionnaire_templates`
   - Contient les modèles de questionnaires
   - Types : positioning, initial_final_evaluation, satisfaction
   - Lié à une formation via `training_id`
   - Gère la version et le statut actif

2. `questionnaire_questions`
   - Questions liées aux templates
   - Types de questions : short_answer, etc.
   - Options et réponses correctes en JSONB
   - Ordre des questions géré par `order_index`

3. `questionnaire_responses`
   - Réponses des apprenants
   - Structure : objet JSON avec IDs des questions comme clés
   - Score calculé pour certains types
   - Sous-types pour initial/final

### Points d'Attention

1. Questionnaire de Positionnement
   - **RÈGLE IMPORTANTE** : Il n'y a pas de bonnes ou mauvaises réponses
   - Le but est d'évaluer le niveau initial et les attentes de l'apprenant
   - Le score ne doit pas être calculé comme un pourcentage de bonnes réponses
   - Les réponses servent à adapter la formation aux besoins de l'apprenant

2. Structure des Réponses
   - Actuellement stockées comme objet JSON
   - Format : `{"question_id": "réponse"}`
   - Avantages :
     * Facile à lire
     * Pas de table supplémentaire
   - Inconvénients :
     * Difficile à requêter individuellement
     * Validation complexe
     * Pas de contraintes FK sur les IDs

3. Association Formation-Questionnaire
   - Chaque template lié à une formation
   - Manque de validation pour s'assurer que tous les types requis sont présents

4. Gestion des Sous-types
   - Uniquement pour initial_final_evaluation
   - Pas de contrainte sur les valeurs possibles

## Tâches à Réaliser

### Base de Données
- [ ] Ajouter une contrainte CHECK sur sous_type
  ```sql
  ALTER TABLE questionnaire_responses
  ADD CONSTRAINT check_sous_type_validity
  CHECK (
    (type = 'initial_final_evaluation' AND sous_type IN ('initial', 'final'))
    OR
    (type != 'initial_final_evaluation' AND sous_type IS NULL)
  );
  ```

- [ ] Créer une vue pour vérifier la complétude des questionnaires par formation
  ```sql
  CREATE VIEW training_questionnaire_status AS
  SELECT 
    t.id as training_id,
    t.title as training_title,
    COUNT(DISTINCT CASE WHEN qt.type = 'positioning' THEN qt.id END) as positioning_count,
    COUNT(DISTINCT CASE WHEN qt.type = 'initial_final_evaluation' THEN qt.id END) as evaluation_count,
    COUNT(DISTINCT CASE WHEN qt.type = 'satisfaction' THEN qt.id END) as satisfaction_count,
    CASE 
      WHEN COUNT(DISTINCT CASE WHEN qt.type = 'positioning' THEN qt.id END) > 0
       AND COUNT(DISTINCT CASE WHEN qt.type = 'initial_final_evaluation' THEN qt.id END) > 0
       AND COUNT(DISTINCT CASE WHEN qt.type = 'satisfaction' THEN qt.id END) > 0
      THEN true
      ELSE false
    END as is_complete
  FROM trainings t
  LEFT JOIN questionnaire_templates qt ON qt.training_id = t.id
  GROUP BY t.id, t.title;
  ```

- [ ] Optimiser la structure des réponses
  ```sql
  CREATE TABLE questionnaire_answer_details (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id uuid REFERENCES questionnaire_responses(id),
    question_id uuid REFERENCES questionnaire_questions(id),
    answer text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(response_id, question_id)
  );
  ```

### React Components
- [ ] Créer un composant de base `BaseQuestionnaire` pour la logique commune
- [ ] Implémenter la validation côté client des sous-types
- [ ] Ajouter des indicateurs de progression
- [ ] Améliorer l'affichage des scores et résultats

### Sécurité
- [ ] Vérifier les politiques RLS pour l'accès aux réponses
- [ ] Ajouter des validations sur les types de questions
- [ ] Implémenter la vérification des permissions par formation

### Performance
- [ ] Indexer les colonnes fréquemment utilisées
- [ ] Optimiser les requêtes de récupération des réponses
- [ ] Mettre en cache les templates de questionnaires

## Prochaines Étapes
1. Implémenter les contraintes de base de données
2. Créer la vue de statut des questionnaires
3. Développer le composant de base React
4. Mettre à jour les politiques RLS
5. Optimiser les performances 