// Script pour ajouter un trigger qui préserve les valeurs des champs email et siret
// Exécute le script SQL via l'API Supabase

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config();

// Lire les variables d'environnement depuis le fichier .env
const envPath = path.resolve(__dirname, '../.env');
let supabaseUrl = '';
let supabaseKey = '';

try {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      if (line.startsWith('VITE_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim();
      } else if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        supabaseKey = line.split('=')[1].trim();
      }
    }
  }
  
  // Si les variables ne sont pas trouvées dans le fichier .env, essayer de les lire depuis les variables d'environnement
  if (!supabaseUrl) {
    supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  }
  if (!supabaseKey) {
    supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  }
  
  console.log('URL Supabase:', supabaseUrl ? 'Trouvée' : 'Non trouvée');
  console.log('Clé Supabase:', supabaseKey ? 'Trouvée' : 'Non trouvée');
} catch (error) {
  console.error('Erreur lors de la lecture du fichier .env:', error);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Erreur: Les variables d\'environnement pour Supabase (URL et clé) doivent être définies');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction pour exécuter le script SQL
async function executeSQL() {
  console.log('=== AJOUT DU TRIGGER DE PRÉSERVATION DES CHAMPS EMAIL ET SIRET ===');
  
  try {
    // Lire le fichier SQL
    const sqlFilePath = path.join(__dirname, 'add-preserve-trigger.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Contenu du script SQL chargé');
    
    // Exécuter le SQL via l'API REST de Supabase
    console.log('Exécution du script SQL...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        query: sqlContent
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erreur lors de l\'exécution du script SQL:', errorData);
      return false;
    }
    
    const result = await response.json();
    console.log('Résultat de l\'exécution du script SQL:', result);
    
    console.log('✅ Trigger de préservation des champs email et siret ajouté avec succès');
    return true;
  } catch (err) {
    console.error('Exception lors de l\'exécution du script SQL:', err);
    return false;
  }
}

// Fonction pour tester le trigger
async function testTrigger() {
  console.log('\n=== TEST DU TRIGGER DE PRÉSERVATION DES CHAMPS EMAIL ET SIRET ===');
  
  try {
    // Récupérer une entreprise existante
    const { data: companies, error: getError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (getError) {
      console.error('Erreur lors de la récupération d\'une entreprise:', getError);
      return false;
    }
    
    if (!companies || companies.length === 0) {
      console.log('Aucune entreprise trouvée pour tester le trigger');
      
      // Créer une entreprise de test
      console.log('Création d\'une entreprise de test...');
      
      const { data: newCompany, error: insertError } = await supabase
        .from('companies')
        .insert([
          {
            name: 'Entreprise de test',
            status: 'active',
            email: 'test@example.com',
            siret: '12345678901234'
          }
        ])
        .select();
      
      if (insertError) {
        console.error('Erreur lors de la création d\'une entreprise de test:', insertError);
        return false;
      }
      
      console.log('✅ Entreprise de test créée avec succès');
      
      // Utiliser l'entreprise nouvellement créée pour le test
      const testCompany = newCompany[0];
      
      // Mettre à jour l'entreprise en vidant les champs email et siret
      console.log('Test du trigger: mise à jour de l\'entreprise en vidant les champs email et siret...');
      
      const { data: updatedCompany, error: updateError } = await supabase
        .from('companies')
        .update({
          email: null,
          siret: null
        })
        .eq('id', testCompany.id)
        .select();
      
      if (updateError) {
        console.error('Erreur lors de la mise à jour de l\'entreprise de test:', updateError);
        return false;
      }
      
      // Vérifier si les valeurs ont été préservées
      if (updatedCompany[0].email === 'test@example.com' && updatedCompany[0].siret === '12345678901234') {
        console.log('✅ Test réussi: les valeurs des champs email et siret ont été préservées');
      } else {
        console.log('❌ Test échoué: les valeurs des champs email et siret n\'ont pas été préservées');
        console.log('Email attendu: test@example.com, obtenu:', updatedCompany[0].email);
        console.log('Siret attendu: 12345678901234, obtenu:', updatedCompany[0].siret);
      }
      
      // Supprimer l'entreprise de test
      console.log('Suppression de l\'entreprise de test...');
      
      const { error: deleteError } = await supabase
        .from('companies')
        .delete()
        .eq('id', testCompany.id);
      
      if (deleteError) {
        console.error('Erreur lors de la suppression de l\'entreprise de test:', deleteError);
      } else {
        console.log('✅ Entreprise de test supprimée avec succès');
      }
    } else {
      const testCompany = companies[0];
      
      // Sauvegarder les valeurs actuelles
      const originalEmail = testCompany.email;
      const originalSiret = testCompany.siret;
      
      // Mettre à jour les champs email et siret avec des valeurs de test
      console.log('Mise à jour des champs email et siret avec des valeurs de test...');
      
      const { error: updateError1 } = await supabase
        .from('companies')
        .update({
          email: 'test-trigger@example.com',
          siret: '98765432109876'
        })
        .eq('id', testCompany.id);
      
      if (updateError1) {
        console.error('Erreur lors de la mise à jour des valeurs de test:', updateError1);
        return false;
      }
      
      // Mettre à jour l'entreprise en vidant les champs email et siret
      console.log('Test du trigger: mise à jour de l\'entreprise en vidant les champs email et siret...');
      
      const { data: updatedCompany, error: updateError2 } = await supabase
        .from('companies')
        .update({
          email: null,
          siret: null
        })
        .eq('id', testCompany.id)
        .select();
      
      if (updateError2) {
        console.error('Erreur lors de la mise à jour pour tester le trigger:', updateError2);
        return false;
      }
      
      // Vérifier si les valeurs ont été préservées
      if (updatedCompany[0].email === 'test-trigger@example.com' && updatedCompany[0].siret === '98765432109876') {
        console.log('✅ Test réussi: les valeurs des champs email et siret ont été préservées');
      } else {
        console.log('❌ Test échoué: les valeurs des champs email et siret n\'ont pas été préservées');
        console.log('Email attendu: test-trigger@example.com, obtenu:', updatedCompany[0].email);
        console.log('Siret attendu: 98765432109876, obtenu:', updatedCompany[0].siret);
      }
      
      // Restaurer les valeurs originales
      console.log('Restauration des valeurs originales...');
      
      const { error: restoreError } = await supabase
        .from('companies')
        .update({
          email: originalEmail,
          siret: originalSiret
        })
        .eq('id', testCompany.id);
      
      if (restoreError) {
        console.error('Erreur lors de la restauration des valeurs originales:', restoreError);
      } else {
        console.log('✅ Valeurs originales restaurées avec succès');
      }
    }
    
    return true;
  } catch (err) {
    console.error('Exception lors du test du trigger:', err);
    return false;
  }
}

// Fonction principale
async function main() {
  console.log('Démarrage de l\'ajout du trigger de préservation des champs email et siret...');
  
  // Exécuter le script SQL
  const executeResult = await executeSQL();
  
  if (executeResult) {
    // Tester le trigger
    await testTrigger();
  }
  
  console.log('\nTerminé.');
}

// Exécuter le script
main().catch(err => {
  console.error('Erreur non gérée:', err);
  process.exit(1);
}); 