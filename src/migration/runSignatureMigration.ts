/**
 * Script de migration automatisée des signatures
 * Ce script exécute la migration complète et enregistre les résultats dans un fichier log
 */

import fs from 'fs';
import path from 'path';
import { SignatureDiagnostic } from '../utils/SignatureDiagnostic';
import { SignatureMigration } from '../utils/SignatureMigration';

// Configuration
const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, `signature_migration_${new Date().toISOString().replace(/:/g, '-')}.log`);

// Assurer que le répertoire de logs existe
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log dans un fichier et console
function log(message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] `;
  let consoleMethod: 'log' | 'error' | 'warn' = 'log';
  let icon = '';
  
  switch (type) {
    case 'info':
      consoleMethod = 'log';
      icon = 'ℹ️';
      break;
    case 'error':
      consoleMethod = 'error';
      icon = '❌';
      break;
    case 'success':
      consoleMethod = 'log';
      icon = '✅';
      break;
    case 'warning':
      consoleMethod = 'warn';
      icon = '⚠️';
      break;
  }
  
  const logMessage = `${prefix}${icon} ${message}`;
  console[consoleMethod](logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Fonction principale exécutant la migration
export async function runMigration() {
  log('=== DÉBUT DE LA MIGRATION DES SIGNATURES ===', 'info');
  
  try {
    // 1. Diagnostic initial
    log('Étape 1: Exécution du diagnostic initial...', 'info');
    const diagnosticResults = await SignatureDiagnostic.runFullDiagnostic();
    
    log(`Diagnostic initial: ${diagnosticResults.documentsReport.problematicRecords.length} problèmes dans documents`, 'info');
    log(`Diagnostic initial: ${diagnosticResults.signaturesReport.problematicRecords.length} problèmes dans document_signatures`, 'info');
    log(`Diagnostic initial: ${diagnosticResults.missingTrainerSignatures.length} formations sans signature de formateur`, 'info');
    
    // 2. Correction des problèmes
    log('Étape 2: Correction des problèmes identifiés...', 'info');
    
    if (diagnosticResults.documentsReport.problematicRecords.length > 0) {
      await SignatureDiagnostic.fixDocumentsTable(diagnosticResults.documentsReport);
      log(`Corrections appliquées à la table documents`, 'success');
    } else {
      log(`Aucune correction nécessaire pour la table documents`, 'success');
    }
    
    if (diagnosticResults.signaturesReport.problematicRecords.length > 0) {
      await SignatureDiagnostic.fixDocumentSignatures(diagnosticResults.signaturesReport);
      log(`Corrections appliquées à la table document_signatures`, 'success');
    } else {
      log(`Aucune correction nécessaire pour la table document_signatures`, 'success');
    }
    
    // Correction spécifique pour les signatures de formateur sans user_id
    const fixedCount = await SignatureDiagnostic.fixTrainerSignatureUserIds();
    if (fixedCount > 0) {
      log(`${fixedCount} signatures de formateur corrigées (user_id)`, 'success');
    } else {
      log(`Aucune signature de formateur à corriger (user_id)`, 'success');
    }
    
    // 3. Migration des données
    log('Étape 3: Migration des signatures de documents vers document_signatures...', 'info');
    const migrationReport = await SignatureMigration.migrateSignaturesFromDocumentsTable();
    
    log(`Migration terminée: ${migrationReport.processedRecords} documents traités`, 'info');
    log(`Migration terminée: ${migrationReport.successfulMigrations} migrations réussies`, 'success');
    
    if (migrationReport.failedMigrations.length > 0) {
      log(`Migration terminée: ${migrationReport.failedMigrations.length} migrations échouées`, 'warning');
      
      // Enregistrer les détails des échecs
      log('Détails des échecs de migration:', 'warning');
      for (const [id, error] of Object.entries(migrationReport.errors)) {
        log(`  - ID ${id}: ${error}`, 'warning');
      }
    } else {
      log(`Migration terminée: aucun échec`, 'success');
    }
    
    // 4. Vérification des résultats
    log('Étape 4: Vérification des résultats de la migration...', 'info');
    const verificationResults = await SignatureMigration.verifyMigrationResults();
    
    log(`Vérification: ${verificationResults.documentsCount} signatures dans table documents`, 'info');
    log(`Vérification: ${verificationResults.documentSignaturesCount} signatures dans table document_signatures`, 'info');
    
    if (verificationResults.missingSignatures.length > 0) {
      log(`Vérification: ${verificationResults.missingSignatures.length} formations sans signature de formateur`, 'warning');
      
      // Enregistrer les détails des formations sans signature
      log('Formations sans signature de formateur:', 'warning');
      for (const training of verificationResults.missingSignatures.slice(0, 10)) {
        log(`  - ID ${training.training_id}: ${training.title} (Formateur: ${training.trainer_name || 'Non spécifié'})`, 'warning');
      }
      
      if (verificationResults.missingSignatures.length > 10) {
        log(`  - ... et ${verificationResults.missingSignatures.length - 10} autres formations`, 'warning');
      }
    } else {
      log(`Vérification: toutes les formations ont une signature de formateur`, 'success');
    }
    
    // Diagnostic final
    log('Étape 5: Diagnostic final pour vérifier l\'état après migration...', 'info');
    const finalDiagnosticResults = await SignatureDiagnostic.runFullDiagnostic();
    
    log(`Diagnostic final: ${finalDiagnosticResults.documentsReport.problematicRecords.length} problèmes dans documents`, 'info');
    log(`Diagnostic final: ${finalDiagnosticResults.signaturesReport.problematicRecords.length} problèmes dans document_signatures`, 'info');
    log(`Diagnostic final: ${finalDiagnosticResults.missingTrainerSignatures.length} formations sans signature de formateur`, 'info');
    
    // Rapport de succès/échec
    if (finalDiagnosticResults.documentsReport.problematicRecords.length === 0 &&
        finalDiagnosticResults.signaturesReport.problematicRecords.length === 0 &&
        verificationResults.documentSignaturesCount >= verificationResults.documentsCount) {
      log('=== MIGRATION RÉUSSIE ===', 'success');
    } else {
      log('=== MIGRATION TERMINÉE AVEC AVERTISSEMENTS ===', 'warning');
    }
    
    return {
      initialDiagnostic: diagnosticResults,
      migrationReport,
      verificationResults,
      finalDiagnostic: finalDiagnosticResults,
      success: finalDiagnosticResults.documentsReport.problematicRecords.length === 0 &&
               finalDiagnosticResults.signaturesReport.problematicRecords.length === 0
    };
  } catch (error) {
    log(`ERREUR FATALE: ${error instanceof Error ? error.message : String(error)}`, 'error');
    log('=== MIGRATION ÉCHOUÉE ===', 'error');
    throw error;
  }
}

// Export par défaut de la fonction principale
export default runMigration;

// Exécution principale
if (require.main === module) {
  // Si exécuté directement (et non importé)
  runMigration()
    .then((results) => {
      // Sauvegarde des résultats en JSON pour référence
      const resultsFilePath = path.join(LOG_DIR, `signature_migration_results_${new Date().toISOString().replace(/:/g, '-')}.json`);
      fs.writeFileSync(resultsFilePath, JSON.stringify(results, null, 2));
      
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Erreur fatale lors de la migration:', error);
      process.exit(1);
    });
} 