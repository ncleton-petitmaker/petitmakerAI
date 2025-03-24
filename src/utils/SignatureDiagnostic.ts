/**
 * Utilitaires de diagnostic et correction pour les signatures
 */

import { supabase } from '../lib/supabase';
import { DocumentType, SignatureType } from '../types/SignatureTypes';

/**
 * Interface pour un rapport de diagnostic
 */
interface DiagnosticReport {
  missingUserIds: number;
  missingTrainingIds: number;
  inconsistentSignatureTypes: number;
  problematicRecords: any[];
  suggestedFixes: any[];
  fixesApplied: boolean;
}

/**
 * Classe pour diagnostiquer et corriger les problèmes de signatures
 */
export class SignatureDiagnostic {
  /**
   * Diagnostique les problèmes dans la table documents
   */
  static async diagnoseDocumentsTable(): Promise<DiagnosticReport> {
    console.log('🔍 [DIAGNOSTIC] Analyse de la table documents...');
    
    const report: DiagnosticReport = {
      missingUserIds: 0,
      missingTrainingIds: 0,
      inconsistentSignatureTypes: 0,
      problematicRecords: [],
      suggestedFixes: [],
      fixesApplied: false
    };
    
    try {
      // Récupérer tous les enregistrements avec des signatures ou tampons
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .or('title.eq.Signature du formateur,title.eq.Signature de l\'apprenant,title.eq.Tampon de l\'entreprise,title.eq.Tampon de l\'organisme');
      
      if (error) {
        console.error('❌ [DIAGNOSTIC] Erreur lors de la récupération des documents:', error);
        return report;
      }
      
      if (!documents || documents.length === 0) {
        console.log('ℹ️ [DIAGNOSTIC] Aucun document trouvé');
        return report;
      }
      
      console.log(`✅ [DIAGNOSTIC] ${documents.length} documents analysés`);
      
      // Analyser chaque document
      for (const doc of documents) {
        const issues = [];
        const fixes = {};
        
        // Vérifier l'ID utilisateur manquant
        if (!doc.user_id && (doc.title !== 'Signature du formateur' && doc.title !== 'Tampon de l\'organisme')) {
          report.missingUserIds++;
          issues.push('ID utilisateur manquant');
          
          // Pour les signatures de formateur, essayer de trouver l'ID du créateur
          if (doc.title === 'Signature du formateur' && doc.created_by) {
            fixes['user_id'] = doc.created_by;
          }
        }
        
        // Vérifier l'ID de formation manquant
        if (!doc.training_id) {
          report.missingTrainingIds++;
          issues.push('ID formation manquant');
        }
        
        // Vérifier la cohérence du type
        if (doc.type !== 'convention' && doc.type !== 'attestation' && doc.type !== 'emargement') {
          report.inconsistentSignatureTypes++;
          issues.push(`Type de document incohérent: ${doc.type}`);
          fixes['type'] = 'convention'; // Type par défaut
        }
        
        // Si des problèmes ont été détectés
        if (issues.length > 0) {
          const problematic = {
            id: doc.id,
            title: doc.title,
            issues,
            record: doc
          };
          
          report.problematicRecords.push(problematic);
          
          // Si des corrections sont possibles
          if (Object.keys(fixes).length > 0) {
            report.suggestedFixes.push({
              id: doc.id,
              fixes
            });
          }
        }
      }
      
      console.log(`🔍 [DIAGNOSTIC] Résultats:
        - ID utilisateur manquants: ${report.missingUserIds}
        - ID formation manquants: ${report.missingTrainingIds}
        - Types incohérents: ${report.inconsistentSignatureTypes}
        - Enregistrements problématiques: ${report.problematicRecords.length}
        - Corrections suggérées: ${report.suggestedFixes.length}`);
      
      return report;
    } catch (error) {
      console.error('❌ [DIAGNOSTIC] Erreur lors du diagnostic:', error);
      return report;
    }
  }
  
  /**
   * Corrige les problèmes identifiés dans la table documents
   */
  static async fixDocumentsTable(report: DiagnosticReport): Promise<DiagnosticReport> {
    if (report.suggestedFixes.length === 0) {
      console.log('✅ [FIX] Aucune correction nécessaire');
      return report;
    }
    
    console.log(`🔧 [FIX] Application de ${report.suggestedFixes.length} corrections...`);
    
    let fixCount = 0;
    
    for (const fix of report.suggestedFixes) {
      try {
        // Mettre à jour l'enregistrement
        const { error } = await supabase
          .from('documents')
          .update(fix.fixes)
          .eq('id', fix.id);
        
        if (error) {
          console.error(`❌ [FIX] Erreur lors de la correction de l'ID ${fix.id}:`, error);
        } else {
          fixCount++;
          console.log(`✅ [FIX] Correction appliquée pour l'ID ${fix.id}`);
        }
      } catch (error) {
        console.error(`❌ [FIX] Exception lors de la correction de l'ID ${fix.id}:`, error);
      }
    }
    
    report.fixesApplied = true;
    console.log(`🔧 [FIX] ${fixCount} corrections appliquées sur ${report.suggestedFixes.length}`);
    
    return report;
  }
  
  /**
   * Vérifie les signatures de formateur manquantes
   */
  static async findMissingTrainerSignatures(): Promise<any[]> {
    console.log('🔍 [TRAINER] Recherche des signatures de formateur manquantes...');
    
    const missingSignatures = [];
    
    try {
      // Récupérer toutes les formations
      const { data: trainings, error } = await supabase
        .from('trainings')
        .select('id, title, trainer_name');
      
      if (error) {
        console.error('❌ [TRAINER] Erreur lors de la récupération des formations:', error);
        return missingSignatures;
      }
      
      if (!trainings || trainings.length === 0) {
        console.log('ℹ️ [TRAINER] Aucune formation trouvée');
        return missingSignatures;
      }
      
      console.log(`✅ [TRAINER] ${trainings.length} formations analysées`);
      
      // Pour chaque formation, vérifier si une signature de formateur existe
      for (const training of trainings) {
        // Vérifier dans la table documents
        const { data: docs, error: docsError } = await supabase
          .from('documents')
          .select('*')
          .eq('training_id', training.id)
          .eq('title', 'Signature du formateur');
        
        if (docsError) {
          console.error(`❌ [TRAINER] Erreur lors de la vérification de la formation ${training.id}:`, docsError);
          continue;
        }
        
        // Vérifier dans la table document_signatures
        const { data: sigs, error: sigsError } = await supabase
          .from('document_signatures')
          .select('*')
          .eq('training_id', training.id)
          .eq('signature_type', 'trainer');
        
        if (sigsError) {
          console.error(`❌ [TRAINER] Erreur lors de la vérification des signatures pour ${training.id}:`, sigsError);
          continue;
        }
        
        // Vérifier dans le bucket de stockage
        const { data: files, error: storageError } = await supabase.storage
          .from('signatures')
          .list('', { 
            search: `trainer_convention_${training.id}` 
          });
        
        if (storageError) {
          console.error(`❌ [TRAINER] Erreur lors de la vérification du stockage pour ${training.id}:`, storageError);
          continue;
        }
        
        // Si aucune signature n'est trouvée, ajouter à la liste
        if ((!docs || docs.length === 0) && 
            (!sigs || sigs.length === 0) && 
            (!files || files.length === 0)) {
          missingSignatures.push({
            training_id: training.id,
            title: training.title,
            trainer_name: training.trainer_name
          });
        }
      }
      
      console.log(`🔍 [TRAINER] ${missingSignatures.length} formations sans signature de formateur`);
      return missingSignatures;
    } catch (error) {
      console.error('❌ [TRAINER] Erreur lors de la recherche des signatures manquantes:', error);
      return missingSignatures;
    }
  }
  
  /**
   * Vérifie les problèmes dans la table document_signatures
   */
  static async diagnoseDocumentSignatures(): Promise<DiagnosticReport> {
    console.log('🔍 [SIGNATURES] Analyse de la table document_signatures...');
    
    const report: DiagnosticReport = {
      missingUserIds: 0,
      missingTrainingIds: 0,
      inconsistentSignatureTypes: 0,
      problematicRecords: [],
      suggestedFixes: [],
      fixesApplied: false
    };
    
    try {
      // Récupérer tous les enregistrements
      const { data: signatures, error } = await supabase
        .from('document_signatures')
        .select('*');
      
      if (error) {
        console.error('❌ [SIGNATURES] Erreur lors de la récupération des signatures:', error);
        return report;
      }
      
      if (!signatures || signatures.length === 0) {
        console.log('ℹ️ [SIGNATURES] Aucune signature trouvée');
        return report;
      }
      
      console.log(`✅ [SIGNATURES] ${signatures.length} signatures analysées`);
      
      // Analyser chaque signature
      for (const sig of signatures) {
        const issues = [];
        const fixes = {};
        
        // Vérifier l'ID utilisateur manquant
        if (!sig.user_id) {
          report.missingUserIds++;
          issues.push('ID utilisateur manquant');
          
          // Essayer de trouver l'utilisateur à partir de l'URL
          if (sig.signature_url && sig.signature_url.includes('_')) {
            const parts = sig.signature_url.split('_');
            const possibleUserId = parts[parts.length - 2];
            
            // Vérifier si c'est un UUID valide
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(possibleUserId)) {
              fixes['user_id'] = possibleUserId;
            }
          }
        }
        
        // Vérifier l'ID de formation manquant
        if (!sig.training_id) {
          report.missingTrainingIds++;
          issues.push('ID formation manquant');
        }
        
        // Vérifier la cohérence du type de signature
        const validTypes = ['participant', 'representative', 'trainer', 'companySeal', 'organizationSeal'];
        if (!validTypes.includes(sig.signature_type)) {
          report.inconsistentSignatureTypes++;
          issues.push(`Type de signature incohérent: ${sig.signature_type}`);
          
          // Déterminer le type correct à partir de l'URL
          if (sig.signature_url) {
            if (sig.signature_url.includes('trainer')) {
              fixes['signature_type'] = 'trainer';
            } else if (sig.signature_url.includes('participant')) {
              fixes['signature_type'] = 'participant';
            } else if (sig.signature_url.includes('seal_company') || sig.signature_url.includes('companySeal')) {
              fixes['signature_type'] = 'companySeal';
            } else if (sig.signature_url.includes('organization_seal') || sig.signature_url.includes('organizationSeal')) {
              fixes['signature_type'] = 'organizationSeal';
            }
          }
        }
        
        // Si des problèmes ont été détectés
        if (issues.length > 0) {
          const problematic = {
            id: sig.id,
            issues,
            record: sig
          };
          
          report.problematicRecords.push(problematic);
          
          // Si des corrections sont possibles
          if (Object.keys(fixes).length > 0) {
            report.suggestedFixes.push({
              id: sig.id,
              fixes
            });
          }
        }
      }
      
      console.log(`🔍 [SIGNATURES] Résultats:
        - ID utilisateur manquants: ${report.missingUserIds}
        - ID formation manquants: ${report.missingTrainingIds}
        - Types incohérents: ${report.inconsistentSignatureTypes}
        - Enregistrements problématiques: ${report.problematicRecords.length}
        - Corrections suggérées: ${report.suggestedFixes.length}`);
      
      return report;
    } catch (error) {
      console.error('❌ [SIGNATURES] Erreur lors du diagnostic:', error);
      return report;
    }
  }
  
  /**
   * Corrige les problèmes dans la table document_signatures
   */
  static async fixDocumentSignatures(report: DiagnosticReport): Promise<DiagnosticReport> {
    if (report.suggestedFixes.length === 0) {
      console.log('✅ [FIX] Aucune correction nécessaire');
      return report;
    }
    
    console.log(`🔧 [FIX] Application de ${report.suggestedFixes.length} corrections...`);
    
    let fixCount = 0;
    
    for (const fix of report.suggestedFixes) {
      try {
        // Mettre à jour l'enregistrement
        const { error } = await supabase
          .from('document_signatures')
          .update(fix.fixes)
          .eq('id', fix.id);
        
        if (error) {
          console.error(`❌ [FIX] Erreur lors de la correction de l'ID ${fix.id}:`, error);
        } else {
          fixCount++;
          console.log(`✅ [FIX] Correction appliquée pour l'ID ${fix.id}`);
        }
      } catch (error) {
        console.error(`❌ [FIX] Exception lors de la correction de l'ID ${fix.id}:`, error);
      }
    }
    
    report.fixesApplied = true;
    console.log(`🔧 [FIX] ${fixCount} corrections appliquées sur ${report.suggestedFixes.length}`);
    
    return report;
  }
  
  /**
   * Exécute tous les diagnostics et corrections
   */
  static async runFullDiagnostic(): Promise<{
    documentsReport: DiagnosticReport;
    signaturesReport: DiagnosticReport;
    missingTrainerSignatures: any[];
  }> {
    console.log('🔍 [FULL DIAGNOSTIC] Démarrage du diagnostic complet...');
    
    // Diagnostiquer les tables
    const documentsReport = await this.diagnoseDocumentsTable();
    const signaturesReport = await this.diagnoseDocumentSignatures();
    const missingTrainerSignatures = await this.findMissingTrainerSignatures();
    
    console.log('✅ [FULL DIAGNOSTIC] Diagnostic terminé');
    
    return {
      documentsReport,
      signaturesReport,
      missingTrainerSignatures
    };
  }
  
  /**
   * Corrige spécifiquement le problème de user_id NULL pour les signatures de formateur
   */
  static async fixTrainerSignatureUserIds(): Promise<number> {
    console.log('🔧 [TRAINER FIX] Correction des ID utilisateur manquants pour les signatures de formateur...');
    
    try {
      // Récupérer toutes les signatures de formateur sans user_id
      const { data: trainerDocs, error } = await supabase
        .from('documents')
        .select('*')
        .eq('title', 'Signature du formateur')
        .is('user_id', null);
      
      if (error) {
        console.error('❌ [TRAINER FIX] Erreur lors de la récupération des signatures:', error);
        return 0;
      }
      
      if (!trainerDocs || trainerDocs.length === 0) {
        console.log('ℹ️ [TRAINER FIX] Aucune signature de formateur sans user_id trouvée');
        return 0;
      }
      
      console.log(`🔧 [TRAINER FIX] ${trainerDocs.length} signatures de formateur à corriger`);
      
      let fixCount = 0;
      
      // Pour chaque signature
      for (const doc of trainerDocs) {
        // Si created_by est disponible, l'utiliser comme user_id
        if (doc.created_by) {
          const { error: updateError } = await supabase
            .from('documents')
            .update({ user_id: doc.created_by })
            .eq('id', doc.id);
          
          if (updateError) {
            console.error(`❌ [TRAINER FIX] Erreur lors de la correction de l'ID ${doc.id}:`, updateError);
          } else {
            fixCount++;
            console.log(`✅ [TRAINER FIX] Correction appliquée pour l'ID ${doc.id}`);
          }
        } else {
          // Sinon, essayer de trouver des participants pour cette formation
          const { data: participants, error: participantsError } = await supabase
            .from('training_participants')
            .select('user_id')
            .eq('training_id', doc.training_id)
            .limit(1);
          
          if (participantsError || !participants || participants.length === 0) {
            console.log(`⚠️ [TRAINER FIX] Impossible de trouver un participant pour la formation ${doc.training_id}`);
            continue;
          }
          
          // Utiliser l'ID du premier participant
          const { error: updateError } = await supabase
            .from('documents')
            .update({ user_id: participants[0].user_id })
            .eq('id', doc.id);
          
          if (updateError) {
            console.error(`❌ [TRAINER FIX] Erreur lors de la correction de l'ID ${doc.id}:`, updateError);
          } else {
            fixCount++;
            console.log(`✅ [TRAINER FIX] Correction appliquée pour l'ID ${doc.id} avec participant ${participants[0].user_id}`);
          }
        }
      }
      
      console.log(`🔧 [TRAINER FIX] ${fixCount} signatures corrigées sur ${trainerDocs.length}`);
      return fixCount;
    } catch (error) {
      console.error('❌ [TRAINER FIX] Erreur lors de la correction:', error);
      return 0;
    }
  }
}

/**
 * Point d'entrée pour exécuter le diagnostic depuis la console
 */
export const runDiagnostic = async () => {
  console.log('🚀 [DIAGNOSTIC] Lancement du diagnostic des signatures...');
  
  try {
    // Exécuter le diagnostic complet
    const results = await SignatureDiagnostic.runFullDiagnostic();
    
    // Afficher un résumé
    console.log(`📊 [RÉSUMÉ] Résultats du diagnostic:
      Table documents:
      - Enregistrements problématiques: ${results.documentsReport.problematicRecords.length}
      - Corrections suggérées: ${results.documentsReport.suggestedFixes.length}
      
      Table document_signatures:
      - Enregistrements problématiques: ${results.signaturesReport.problematicRecords.length}
      - Corrections suggérées: ${results.signaturesReport.suggestedFixes.length}
      
      Formations sans signature de formateur: ${results.missingTrainerSignatures.length}
    `);
    
    // Demander confirmation pour appliquer les corrections
    console.log('⚠️ [ACTION] Pour appliquer les corrections, exécutez:');
    console.log('SignatureDiagnostic.fixDocumentsTable(results.documentsReport)');
    console.log('SignatureDiagnostic.fixDocumentSignatures(results.signaturesReport)');
    console.log('SignatureDiagnostic.fixTrainerSignatureUserIds()');
    
    return results;
  } catch (error) {
    console.error('❌ [DIAGNOSTIC] Erreur lors de l\'exécution du diagnostic:', error);
    return null;
  }
};

// Exposer pour utilisation dans la console du navigateur
if (typeof window !== 'undefined') {
  (window as any).SignatureDiagnostic = SignatureDiagnostic;
  (window as any).runSignatureDiagnostic = runDiagnostic;
} 