// Script pour ajouter la colonne organization_seal_path à la table settings
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Vérifiez les variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erreur: Variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY requises');
  process.exit(1);
}

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction pour vérifier et mettre à jour la structure de la table settings
async function updateSettingsTable() {
  try {
    console.log('Vérification de la structure de la table settings...');
    
    // Vérifier si la table settings existe
    const { data: tables, error: tableError } = await supabase.from('settings').select('id').limit(1);
    
    if (tableError && !tableError.message.includes('does not exist')) {
      throw new Error(`Erreur lors de la vérification de la table settings: ${tableError.message}`);
    }
    
    if (!tables) {
      throw new Error('La table settings n\'existe pas. Veuillez créer cette table avant d\'exécuter ce script.');
    }
    
    // Vérifier si la colonne organization_seal_path existe déjà
    // Nous ne pouvons pas facilement vérifier la structure de la table via l'API Supabase
    // donc nous allons essayer de faire une requête qui utilise cette colonne et vérifier
    // si nous obtenons une erreur spécifique
    console.log('Tentative de vérification de l\'existence de la colonne organization_seal_path...');
    const { data: testData, error: columnError } = await supabase
      .from('settings')
      .select('organization_seal_path')
      .limit(1);
      
    const columnExists = !columnError || !columnError.message.includes('organization_seal_path');
    
    if (columnExists) {
      console.log('La colonne organization_seal_path existe déjà dans la table settings.');
      console.log('Aucune modification nécessaire.');
      return;
    }
    
    console.log('La colonne organization_seal_path n\'existe pas. Création de la migration SQL...');
    
    // Comme nous ne pouvons pas exécuter directement un ALTER TABLE via l'API Supabase,
    // nous allons générer un script SQL que l'administrateur pourra exécuter
    const sqlMigration = `
-- Migration pour ajouter la colonne organization_seal_path à la table settings

-- Vérifier si la colonne n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'organization_seal_path'
  ) THEN
    -- Ajouter la colonne
    ALTER TABLE settings ADD COLUMN organization_seal_path VARCHAR(255);
    
    -- Ajouter les commentaires
    COMMENT ON COLUMN settings.organization_seal_path IS 'Chemin du fichier pour le tampon de l''organisme';
  END IF;
END
$$;
`;
    
    // Écrire le script SQL dans un fichier
    const fs = require('fs');
    const migrationFile = 'migrations/add_organization_seal_path.sql';
    
    // Créer le dossier migrations s'il n'existe pas
    if (!fs.existsSync('migrations')) {
      fs.mkdirSync('migrations');
    }
    
    fs.writeFileSync(migrationFile, sqlMigration);
    
    console.log(`Script SQL de migration créé avec succès: ${migrationFile}`);
    console.log('Veuillez exécuter ce script SQL dans votre base de données Supabase.');
    
    // Intructions pour le client
    console.log('\nPour exécuter la migration:');
    console.log('1. Connectez-vous à votre projet Supabase');
    console.log('2. Allez dans "SQL Editor"');
    console.log('3. Copiez-collez le contenu du fichier de migration');
    console.log('4. Exécutez la requête SQL');
    
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

// Exécuter la fonction
updateSettingsTable(); 