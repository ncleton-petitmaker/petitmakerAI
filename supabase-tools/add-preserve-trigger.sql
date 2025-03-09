-- Script pour ajouter un trigger qui préserve les valeurs des champs email et siret lors des mises à jour

-- Fonction pour préserver les valeurs des champs email et siret
CREATE OR REPLACE FUNCTION preserve_companies_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Préserve la valeur de email si elle est définie dans l'ancien enregistrement
    -- mais pas dans le nouveau (ou si elle est NULL dans le nouveau)
    IF OLD.email IS NOT NULL AND (NEW.email IS NULL OR NEW.email = '') THEN
        NEW.email := OLD.email;
        RAISE NOTICE 'Préservation de la valeur email pour l''entreprise %', NEW.id;
    END IF;
    
    -- Préserve la valeur de siret si elle est définie dans l'ancien enregistrement
    -- mais pas dans le nouveau (ou si elle est NULL dans le nouveau)
    IF OLD.siret IS NOT NULL AND (NEW.siret IS NULL OR NEW.siret = '') THEN
        NEW.siret := OLD.siret;
        RAISE NOTICE 'Préservation de la valeur siret pour l''entreprise %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprime le trigger s'il existe déjà pour éviter les erreurs
DROP TRIGGER IF EXISTS ensure_companies_fields_preserved ON companies;

-- Crée le trigger pour préserver les valeurs des champs
CREATE TRIGGER ensure_companies_fields_preserved
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION preserve_companies_fields();

-- Ajoute un commentaire sur le trigger pour la documentation
COMMENT ON TRIGGER ensure_companies_fields_preserved ON companies IS 'Préserve les valeurs des champs email et siret lors des mises à jour si elles sont définies dans l''ancien enregistrement mais pas dans le nouveau.';

-- Ajoute un commentaire sur la fonction pour la documentation
COMMENT ON FUNCTION preserve_companies_fields() IS 'Fonction utilisée par le trigger ensure_companies_fields_preserved pour préserver les valeurs des champs email et siret lors des mises à jour.';

-- Affiche un message de confirmation
SELECT 'Trigger de préservation des champs email et siret ajouté avec succès' AS message; 