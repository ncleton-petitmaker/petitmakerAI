// Script pour vérifier spécifiquement les colonnes email et siret dans la table companies
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

// Fonction pour vérifier les colonnes email et siret
async function checkEmailAndSiretColumns() {
  console.log('=== VÉRIFICATION DES COLONNES EMAIL ET SIRET ===');
  
  try {
    // Vérifier si la table companies existe
    const { data: tableData, error: tableError } = await supabase
      .from('companies')
      .select('count(*)', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('Erreur lors de la vérification de la table companies:', tableError);
      return false;
    }
    
    console.log('✅ La table companies existe et est accessible');
    
    // Récupérer un échantillon pour vérifier les colonnes
    const { data: sampleData, error: sampleError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('Erreur lors de la récupération d\'un échantillon:', sampleError);
      return false;
    }
    
    if (!sampleData || sampleData.length === 0) {
      console.log('⚠️ Aucune donnée dans la table companies');
      
      // Créer une entreprise de test pour vérifier les colonnes
      console.log('Création d\'une entreprise de test...');
      
      const { data: newCompany, error: insertError } = await supabase
        .from('companies')
        .insert([
          {
            name: 'Entreprise de test',
            status: 'active',
            email: 'test-columns@example.com',
            siret: '12345678901234'
          }
        ])
        .select();
      
      if (insertError) {
        console.error('Erreur lors de la création d\'une entreprise de test:', insertError);
        console.log('Détails de l\'erreur:', insertError.details);
        console.log('Message d\'erreur:', insertError.message);
        
        // Vérifier si l'erreur est liée aux colonnes email ou siret
        if (insertError.message && (insertError.message.includes('email') || insertError.message.includes('siret'))) {
          console.log('⚠️ L\'erreur semble être liée aux colonnes email ou siret');
        }
        
        return false;
      }
      
      console.log('✅ Entreprise de test créée avec succès');
      console.log('Données de l\'entreprise de test:', newCompany[0]);
      
      // Vérifier si les colonnes email et siret ont été enregistrées
      if (newCompany[0].email === 'test-columns@example.com' && newCompany[0].siret === '12345678901234') {
        console.log('✅ Les colonnes email et siret ont été correctement enregistrées');
      } else {
        console.log('❌ Problème avec l\'enregistrement des colonnes email et siret:');
        console.log('  - Email attendu: test-columns@example.com, obtenu:', newCompany[0].email);
        console.log('  - Siret attendu: 12345678901234, obtenu:', newCompany[0].siret);
      }
      
      // Supprimer l'entreprise de test
      const { error: deleteError } = await supabase
        .from('companies')
        .delete()
        .eq('id', newCompany[0].id);
      
      if (deleteError) {
        console.error('Erreur lors de la suppression de l\'entreprise de test:', deleteError);
      } else {
        console.log('✅ Entreprise de test supprimée avec succès');
      }
    } else {
      console.log('Structure de la table companies:');
      const columns = Object.keys(sampleData[0]);
      console.log(`Colonnes (${columns.length}): ${columns.join(', ')}`);
      
      // Vérifier si les colonnes email et siret existent
      const emailExists = columns.includes('email');
      const siretExists = columns.includes('siret');
      
      if (emailExists) {
        console.log('✅ La colonne email existe dans la table');
      } else {
        console.log('❌ La colonne email n\'existe PAS dans la table');
      }
      
      if (siretExists) {
        console.log('✅ La colonne siret existe dans la table');
      } else {
        console.log('❌ La colonne siret n\'existe PAS dans la table');
      }
      
      // Vérifier les politiques RLS sur la table companies
      console.log('\n=== VÉRIFICATION DES POLITIQUES RLS ===');
      
      try {
        // Tenter de mettre à jour une entreprise existante avec email et siret
        const testCompany = sampleData[0];
        
        // Sauvegarder les valeurs actuelles
        const originalEmail = testCompany.email;
        const originalSiret = testCompany.siret;
        
        console.log('Tentative de mise à jour avec email et siret...');
        
        const { data: updatedCompany, error: updateError } = await supabase
          .from('companies')
          .update({
            email: 'test-update@example.com',
            siret: '98765432109876'
          })
          .eq('id', testCompany.id)
          .select();
        
        if (updateError) {
          console.error('Erreur lors de la mise à jour avec email et siret:', updateError);
          console.log('Détails de l\'erreur:', updateError.details);
          console.log('Message d\'erreur:', updateError.message);
          
          // Vérifier si l'erreur est liée aux politiques RLS
          if (updateError.message && updateError.message.includes('permission denied')) {
            console.log('❌ Erreur de permission - Problème potentiel avec les politiques RLS');
          }
        } else {
          console.log('✅ Mise à jour avec email et siret réussie');
          
          // Vérifier si les valeurs ont été correctement mises à jour
          if (updatedCompany[0].email === 'test-update@example.com' && updatedCompany[0].siret === '98765432109876') {
            console.log('✅ Les valeurs email et siret ont été correctement mises à jour');
          } else {
            console.log('❌ Problème avec la mise à jour des valeurs email et siret:');
            console.log('  - Email attendu: test-update@example.com, obtenu:', updatedCompany[0].email);
            console.log('  - Siret attendu: 98765432109876, obtenu:', updatedCompany[0].siret);
          }
          
          // Restaurer les valeurs originales
          await supabase
            .from('companies')
            .update({
              email: originalEmail,
              siret: originalSiret
            })
            .eq('id', testCompany.id);
          
          console.log('✅ Valeurs originales restaurées');
        }
      } catch (err) {
        console.error('Exception lors de la vérification des politiques RLS:', err);
      }
    }
    
    // Vérifier les contraintes sur la table companies
    console.log('\n=== VÉRIFICATION DES CONTRAINTES ===');
    
    try {
      // Utiliser l'API REST pour exécuter une requête SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          sql_query: `
            SELECT
              tc.constraint_name,
              tc.constraint_type,
              kcu.column_name
            FROM
              information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE
              tc.table_schema = 'public'
              AND tc.table_name = 'companies'
              AND kcu.column_name IN ('email', 'siret')
          `
        })
      });
      
      if (!response.ok) {
        console.error('Erreur lors de la vérification des contraintes:', await response.text());
      } else {
        const constraints = await response.json();
        
        if (constraints && constraints.length > 0) {
          console.log('Contraintes sur les colonnes email et siret:');
          constraints.forEach(constraint => {
            console.log(`  - ${constraint.constraint_name} (${constraint.constraint_type}) sur ${constraint.column_name}`);
          });
        } else {
          console.log('Aucune contrainte trouvée sur les colonnes email et siret');
        }
      }
    } catch (err) {
      console.error('Exception lors de la vérification des contraintes:', err);
    }
    
    return true;
  } catch (err) {
    console.error('Exception lors de la vérification des colonnes email et siret:', err);
    return false;
  }
}

// Fonction principale
async function main() {
  console.log('Démarrage de la vérification des colonnes email et siret...');
  
  await checkEmailAndSiretColumns();
  
  console.log('\nTerminé.');
}

// Exécuter le script
main().catch(err => {
  console.error('Erreur non gérée:', err);
  process.exit(1);
}); 