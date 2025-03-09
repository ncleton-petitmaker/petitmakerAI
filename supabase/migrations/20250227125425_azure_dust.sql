-- Création d'une politique permettant à tous les utilisateurs authentifiés d'ajouter des entreprises
-- C'est nécessaire pour le processus d'inscription lorsqu'un utilisateur indique son entreprise

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'All users can add companies'
  ) THEN
    CREATE POLICY "All users can add companies"
      ON companies
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Ajouter une politique pour permettre aux utilisateurs de mettre à jour leur propre entreprise
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'Users can update their own company'
  ) THEN
    CREATE POLICY "Users can update their own company"
      ON companies
      FOR UPDATE
      TO authenticated
      USING (
        id IN (
          SELECT company_id FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND company_id IS NOT NULL
        )
      )
      WITH CHECK (
        id IN (
          SELECT company_id FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND company_id IS NOT NULL
        )
      );
  END IF;
END $$;

-- S'assurer que les politiques existantes sont correctement appliquées
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;