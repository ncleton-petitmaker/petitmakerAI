-- Création d'une table temporaire pour les logs
CREATE TABLE IF NOT EXISTS debug_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    message TEXT
);

-- Fonction pour le logging
CREATE OR REPLACE FUNCTION log_debug(msg TEXT) RETURNS void AS $$
BEGIN
    INSERT INTO debug_logs (message) VALUES (msg);
END;
$$ LANGUAGE plpgsql;

-- Vérification de la structure de la table
DO $$ 
BEGIN
    PERFORM log_debug('Début de la vérification de la structure de la table questionnaire_responses');
    
    -- Vérifier si la table existe
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'questionnaire_responses'
    ) THEN
        PERFORM log_debug('La table questionnaire_responses n''existe pas');
        RETURN;
    END IF;

    PERFORM log_debug('La table questionnaire_responses existe');

    -- Vérifier les contraintes existantes
    PERFORM log_debug('Contraintes existantes sur la table:');
    FOR r IN (
        SELECT conname, pg_get_constraintdef(c.oid) 
        FROM pg_constraint c 
        JOIN pg_namespace n ON n.oid = c.connamespace 
        WHERE conrelid = 'questionnaire_responses'::regclass 
        AND n.nspname = 'public'
    ) LOOP
        PERFORM log_debug(format('- %s: %s', r.conname, r.pg_get_constraintdef));
    END LOOP;

    -- Supprimer les doublons en gardant l'entrée la plus récente
    WITH duplicates AS (
        SELECT user_id, type, template_id,
               ROW_NUMBER() OVER (
                   PARTITION BY user_id, type, template_id 
                   ORDER BY created_at DESC
               ) as rn
        FROM questionnaire_responses
    )
    DELETE FROM questionnaire_responses
    WHERE id IN (
        SELECT qr.id
        FROM questionnaire_responses qr
        JOIN duplicates d ON qr.user_id = d.user_id 
            AND qr.type = d.type 
            AND COALESCE(qr.template_id, 0) = COALESCE(d.template_id, 0)
        WHERE d.rn > 1
    );

    -- Ajouter une contrainte d'unicité
    ALTER TABLE questionnaire_responses 
    ADD CONSTRAINT questionnaire_responses_unique_user_type_template 
    UNIQUE (user_id, type, COALESCE(template_id, 0));

    PERFORM log_debug('Mise à jour de la table terminée');

    -- Afficher le nombre final de réponses
    PERFORM log_debug(format(
        'Nombre final de réponses: %s',
        (SELECT COUNT(*) FROM questionnaire_responses)::text
    ));
END $$;

-- Afficher les logs
SELECT * FROM debug_logs ORDER BY timestamp DESC; 