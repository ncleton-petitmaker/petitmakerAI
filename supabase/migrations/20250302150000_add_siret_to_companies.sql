-- Ajouter le champ SIRET à la table companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS siret text;

-- Mettre à jour les politiques de sécurité pour inclure le nouveau champ
DO $$
BEGIN
  -- Vérifier si les politiques existent et les mettre à jour si nécessaire
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin manage companies' AND tablename = 'companies') THEN
    DROP POLICY "Admin manage companies" ON companies;
    
    CREATE POLICY "Admin manage companies"
      ON companies
      USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'))
      WITH CHECK (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own company' AND tablename = 'companies') THEN
    DROP POLICY "Users view own company" ON companies;
    
    CREATE POLICY "Users view own company"
      ON companies
      FOR SELECT
      USING (id IN (
        SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
      ));
  END IF;
END
$$; 