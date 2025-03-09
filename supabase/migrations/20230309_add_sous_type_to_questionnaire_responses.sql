-- Ajouter la valeur 'evaluation' au type ENUM existant
ALTER TYPE questionnaire_type ADD VALUE IF NOT EXISTS 'evaluation';

-- Créer le type ENUM pour sous_type
CREATE TYPE questionnaire_sous_type AS ENUM ('initial', 'final');

-- Ajouter la colonne sous_type à la table questionnaire_responses
ALTER TABLE questionnaire_responses
ADD COLUMN IF NOT EXISTS sous_type questionnaire_sous_type;

-- Créer un index sur la colonne sous_type pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_sous_type
ON questionnaire_responses(sous_type);

-- Mettre à jour les enregistrements existants pour les évaluations
-- Mettre à jour tous les enregistrements de type 'initial_final_evaluation' vers le nouveau type 'evaluation'
UPDATE questionnaire_responses
SET type = 'evaluation'
WHERE type = 'initial_final_evaluation';

-- Ajouter des commentaires pour documenter les changements
COMMENT ON COLUMN questionnaire_responses.sous_type IS 'Sous-type de la réponse (initial ou final) pour les évaluations';
COMMENT ON TYPE questionnaire_sous_type IS 'Type d''évaluation : initiale ou finale'; 