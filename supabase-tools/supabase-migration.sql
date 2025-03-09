-- Migration pour configurer les politiques RLS pour toutes les tables

-- Activer RLS sur toutes les tables
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS questionnaire_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS questionnaire_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evaluation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS satisfaction_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Politiques pour user_profiles
DO $$
BEGIN
    -- Vérifier si la politique existe déjà
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Les utilisateurs peuvent voir leur propre profil'
    ) THEN
        CREATE POLICY "Les utilisateurs peuvent voir leur propre profil" 
        ON user_profiles FOR SELECT 
        USING (auth.uid() = id OR auth.jwt()->>'role' = 'admin');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Les utilisateurs peuvent mettre à jour leur propre profil'
    ) THEN
        CREATE POLICY "Les utilisateurs peuvent mettre à jour leur propre profil" 
        ON user_profiles FOR UPDATE 
        USING (auth.uid() = id OR auth.jwt()->>'role' = 'admin');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Les administrateurs peuvent supprimer des profils'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent supprimer des profils" 
        ON user_profiles FOR DELETE 
        USING (auth.jwt()->>'role' = 'admin');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Les utilisateurs peuvent créer leur propre profil'
    ) THEN
        CREATE POLICY "Les utilisateurs peuvent créer leur propre profil" 
        ON user_profiles FOR INSERT 
        WITH CHECK (auth.uid() = id OR auth.jwt()->>'role' = 'admin');
    END IF;
END $$;

-- Politiques pour companies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'companies' 
        AND policyname = 'Les administrateurs peuvent voir toutes les entreprises'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent voir toutes les entreprises" 
        ON companies FOR SELECT 
        USING (auth.jwt()->>'role' = 'admin' OR auth.jwt()->>'role' = 'company_admin');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'companies' 
        AND policyname = 'Les utilisateurs peuvent voir leur entreprise'
    ) THEN
        CREATE POLICY "Les utilisateurs peuvent voir leur entreprise" 
        ON companies FOR SELECT 
        USING (
            id IN (
                SELECT company_id FROM user_profiles 
                WHERE user_profiles.id = auth.uid()
            )
        );
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'companies' 
        AND policyname = 'Les administrateurs peuvent modifier les entreprises'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent modifier les entreprises" 
        ON companies FOR UPDATE 
        USING (auth.jwt()->>'role' = 'admin');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'companies' 
        AND policyname = 'Les administrateurs peuvent supprimer des entreprises'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent supprimer des entreprises" 
        ON companies FOR DELETE 
        USING (auth.jwt()->>'role' = 'admin');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'companies' 
        AND policyname = 'Les administrateurs peuvent ajouter des entreprises'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent ajouter des entreprises" 
        ON companies FOR INSERT 
        WITH CHECK (auth.jwt()->>'role' = 'admin');
    END IF;
END $$;

-- Politiques pour trainers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'trainers' 
        AND policyname = 'Tout le monde peut voir les formateurs publics'
    ) THEN
        CREATE POLICY "Tout le monde peut voir les formateurs publics" 
        ON trainers FOR SELECT 
        USING (is_public = true OR auth.jwt()->>'role' = 'admin');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'trainers' 
        AND policyname = 'Les administrateurs peuvent gérer les formateurs'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent gérer les formateurs" 
        ON trainers FOR ALL 
        USING (auth.jwt()->>'role' = 'admin');
    END IF;
END $$;

-- Politiques pour questionnaire_templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'questionnaire_templates' 
        AND policyname = 'Tout le monde peut voir les modèles de questionnaires'
    ) THEN
        CREATE POLICY "Tout le monde peut voir les modèles de questionnaires" 
        ON questionnaire_templates FOR SELECT 
        USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'questionnaire_templates' 
        AND policyname = 'Les administrateurs peuvent gérer les modèles de questionnaires'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent gérer les modèles de questionnaires" 
        ON questionnaire_templates FOR ALL 
        USING (auth.jwt()->>'role' = 'admin');
    END IF;
END $$;

-- Politiques pour questionnaire_questions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'questionnaire_questions' 
        AND policyname = 'Tout le monde peut voir les questions'
    ) THEN
        CREATE POLICY "Tout le monde peut voir les questions" 
        ON questionnaire_questions FOR SELECT 
        USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'questionnaire_questions' 
        AND policyname = 'Les administrateurs peuvent gérer les questions'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent gérer les questions" 
        ON questionnaire_questions FOR ALL 
        USING (auth.jwt()->>'role' = 'admin');
    END IF;
END $$;

-- Politiques pour questionnaire_responses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'questionnaire_responses' 
        AND policyname = 'Les utilisateurs peuvent voir leurs propres réponses'
    ) THEN
        CREATE POLICY "Les utilisateurs peuvent voir leurs propres réponses" 
        ON questionnaire_responses FOR SELECT 
        USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'admin');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'questionnaire_responses' 
        AND policyname = 'Les utilisateurs peuvent créer leurs propres réponses'
    ) THEN
        CREATE POLICY "Les utilisateurs peuvent créer leurs propres réponses" 
        ON questionnaire_responses FOR INSERT 
        WITH CHECK (auth.uid() = user_id OR auth.jwt()->>'role' = 'admin');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'questionnaire_responses' 
        AND policyname = 'Les administrateurs peuvent gérer toutes les réponses'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent gérer toutes les réponses" 
        ON questionnaire_responses FOR ALL 
        USING (auth.jwt()->>'role' = 'admin');
    END IF;
END $$;

-- Politiques pour evaluation_responses (similaires à questionnaire_responses)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'evaluation_responses' 
        AND policyname = 'Les utilisateurs peuvent voir leurs propres évaluations'
    ) THEN
        CREATE POLICY "Les utilisateurs peuvent voir leurs propres évaluations" 
        ON evaluation_responses FOR SELECT 
        USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'admin');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'evaluation_responses' 
        AND policyname = 'Les utilisateurs peuvent créer leurs propres évaluations'
    ) THEN
        CREATE POLICY "Les utilisateurs peuvent créer leurs propres évaluations" 
        ON evaluation_responses FOR INSERT 
        WITH CHECK (auth.uid() = user_id OR auth.jwt()->>'role' = 'admin');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'evaluation_responses' 
        AND policyname = 'Les administrateurs peuvent gérer toutes les évaluations'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent gérer toutes les évaluations" 
        ON evaluation_responses FOR ALL 
        USING (auth.jwt()->>'role' = 'admin');
    END IF;
END $$;

-- Politiques pour satisfaction_responses (similaires à questionnaire_responses)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'satisfaction_responses' 
        AND policyname = 'Les utilisateurs peuvent voir leurs propres réponses de satisfaction'
    ) THEN
        CREATE POLICY "Les utilisateurs peuvent voir leurs propres réponses de satisfaction" 
        ON satisfaction_responses FOR SELECT 
        USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'admin');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'satisfaction_responses' 
        AND policyname = 'Les utilisateurs peuvent créer leurs propres réponses de satisfaction'
    ) THEN
        CREATE POLICY "Les utilisateurs peuvent créer leurs propres réponses de satisfaction" 
        ON satisfaction_responses FOR INSERT 
        WITH CHECK (auth.uid() = user_id OR auth.jwt()->>'role' = 'admin');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'satisfaction_responses' 
        AND policyname = 'Les administrateurs peuvent gérer toutes les réponses de satisfaction'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent gérer toutes les réponses de satisfaction" 
        ON satisfaction_responses FOR ALL 
        USING (auth.jwt()->>'role' = 'admin');
    END IF;
END $$;

-- Politiques pour settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'settings' 
        AND policyname = 'Tout le monde peut voir les paramètres'
    ) THEN
        CREATE POLICY "Tout le monde peut voir les paramètres" 
        ON settings FOR SELECT 
        USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'settings' 
        AND policyname = 'Les administrateurs peuvent gérer les paramètres'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent gérer les paramètres" 
        ON settings FOR ALL 
        USING (auth.jwt()->>'role' = 'admin');
    END IF;
END $$;

-- Politiques pour announcements
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'announcements' 
        AND policyname = 'Tout le monde peut voir les annonces'
    ) THEN
        CREATE POLICY "Tout le monde peut voir les annonces" 
        ON announcements FOR SELECT 
        USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'announcements' 
        AND policyname = 'Les administrateurs peuvent gérer les annonces'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent gérer les annonces" 
        ON announcements FOR ALL 
        USING (auth.jwt()->>'role' = 'admin');
    END IF;
END $$;

-- Politiques pour notifications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Les utilisateurs peuvent voir leurs propres notifications'
    ) THEN
        CREATE POLICY "Les utilisateurs peuvent voir leurs propres notifications" 
        ON notifications FOR SELECT 
        USING (auth.uid() = user_id OR user_id IS NULL OR auth.jwt()->>'role' = 'admin');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Les utilisateurs peuvent mettre à jour leurs propres notifications'
    ) THEN
        CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres notifications" 
        ON notifications FOR UPDATE 
        USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'admin');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Les administrateurs peuvent gérer toutes les notifications'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent gérer toutes les notifications" 
        ON notifications FOR ALL 
        USING (auth.jwt()->>'role' = 'admin');
    END IF;
END $$;

-- Politiques pour documents
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'documents' 
        AND policyname = 'Les utilisateurs peuvent voir leurs propres documents'
    ) THEN
        CREATE POLICY "Les utilisateurs peuvent voir leurs propres documents" 
        ON documents FOR SELECT 
        USING (
            auth.uid() = user_id 
            OR auth.jwt()->>'role' = 'admin'
            OR (
                company_id IN (
                    SELECT company_id FROM user_profiles 
                    WHERE user_profiles.id = auth.uid()
                )
            )
            OR (
                training_id IN (
                    SELECT training_id FROM user_profiles 
                    WHERE user_profiles.id = auth.uid()
                )
            )
        );
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'documents' 
        AND policyname = 'Les administrateurs peuvent gérer tous les documents'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent gérer tous les documents" 
        ON documents FOR ALL 
        USING (auth.jwt()->>'role' = 'admin');
    END IF;
END $$;

-- Politiques pour resource_categories
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'resource_categories' 
        AND policyname = 'Tout le monde peut voir les catégories de ressources'
    ) THEN
        CREATE POLICY "Tout le monde peut voir les catégories de ressources" 
        ON resource_categories FOR SELECT 
        USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'resource_categories' 
        AND policyname = 'Les administrateurs peuvent gérer les catégories de ressources'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent gérer les catégories de ressources" 
        ON resource_categories FOR ALL 
        USING (auth.jwt()->>'role' = 'admin');
    END IF;
END $$;

-- Politiques pour account_deletion_requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'account_deletion_requests' 
        AND policyname = 'Les utilisateurs peuvent voir leurs propres demandes de suppression'
    ) THEN
        CREATE POLICY "Les utilisateurs peuvent voir leurs propres demandes de suppression" 
        ON account_deletion_requests FOR SELECT 
        USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'admin');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'account_deletion_requests' 
        AND policyname = 'Les utilisateurs peuvent créer leurs propres demandes de suppression'
    ) THEN
        CREATE POLICY "Les utilisateurs peuvent créer leurs propres demandes de suppression" 
        ON account_deletion_requests FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'account_deletion_requests' 
        AND policyname = 'Les administrateurs peuvent gérer toutes les demandes de suppression'
    ) THEN
        CREATE POLICY "Les administrateurs peuvent gérer toutes les demandes de suppression" 
        ON account_deletion_requests FOR ALL 
        USING (auth.jwt()->>'role' = 'admin');
    END IF;
END $$; 