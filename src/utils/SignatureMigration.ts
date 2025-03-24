/**
 * Utilitaires pour la migration des signatures
 */

import { supabase } from '../lib/supabase';
import { DocumentType, SignatureType, generateStandardSignatureFilename } from '../types/SignatureTypes';
import { SignatureDiagnostic } from './SignatureDiagnostic';

/**
 * Interface pour un rapport de migration
 */
interface MigrationReport {
  processedRecords: number;
  successfulMigrations: number;
  failedMigrations: number[];
  errors: Record<string, string>;
}

/**
 * Classe pour effectuer la migration des signatures
 */
export class SignatureMigration {
  /**
   * Migre les signatures de la table documents vers document_signatures
   */
  static async migrateSignaturesFromDocumentsTable(): Promise<MigrationReport> {
    console.log('🚀 [MIGRATION] Début de la migration des signatures depuis la table documents...');
    
    const report: MigrationReport = {
      processedRecords: 0,
      successfulMigrations: 0,
      failedMigrations: [],
      errors: {}
    };
    
    try {
      // Récupérer toutes les signatures et tampons
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .or('title.eq.Signature du formateur,title.eq.Signature de l\'apprenant,title.eq.Tampon de l\'entreprise,title.eq.Tampon de l\'organisme');
      
      if (error) {
        console.error('❌ [MIGRATION] Erreur lors de la récupération des documents:', error);
        return report;
      }
      
      if (!documents || documents.length === 0) {
        console.log('ℹ️ [MIGRATION] Aucun document trouvé');
        return report;
      }
      
      console.log(`✅ [MIGRATION] ${documents.length} documents trouvés`);
      report.processedRecords = documents.length;
      
      // Migrer chaque document
      for (const doc of documents) {
        try {
          // Déterminer le type de signature
          let signatureType: SignatureType;
          let documentType: DocumentType = DocumentType.CONVENTION;
          
          switch (doc.title) {
            case 'Signature du formateur':
              signatureType = SignatureType.TRAINER;
              break;
            case 'Signature de l\'apprenant':
              signatureType = SignatureType.PARTICIPANT;
              break;
            case 'Tampon de l\'entreprise':
              signatureType = SignatureType.COMPANY_SEAL;
              break;
            case 'Tampon de l\'organisme':
              signatureType = SignatureType.ORGANIZATION_SEAL;
              break;
            default:
              console.log(`⚠️ [MIGRATION] Type de document inconnu: ${doc.title}`);
              report.failedMigrations.push(doc.id);
              report.errors[doc.id] = `Type de document inconnu: ${doc.title}`;
              continue;
          }
          
          // Déterminer le type de document
          switch (doc.type) {
            case 'convention':
              documentType = DocumentType.CONVENTION;
              break;
            case 'attestation':
              documentType = DocumentType.ATTESTATION;
              break;
            case 'emargement':
              documentType = DocumentType.ATTENDANCE_SHEET;
              break;
            default:
              documentType = DocumentType.CONVENTION;
              break;
          }
          
          // S'assurer que user_id est défini pour les signatures de formateur
          if (signatureType === SignatureType.TRAINER && !doc.user_id) {
            if (doc.created_by) {
              doc.user_id = doc.created_by;
            } else {
              // Essayer de trouver un participant
              const { data: participants } = await supabase
                .from('training_participants')
                .select('user_id')
                .eq('training_id', doc.training_id)
                .limit(1);
                
              if (participants && participants.length > 0) {
                doc.user_id = participants[0].user_id;
              } else {
                console.log(`⚠️ [MIGRATION] Impossible de trouver un user_id pour la signature du formateur ID ${doc.id}`);
                report.failedMigrations.push(doc.id);
                report.errors[doc.id] = 'Impossible de déterminer user_id';
                continue;
              }
            }
          }
          
          // Générer un nom de fichier standardisé
          const standardFilename = generateStandardSignatureFilename(
            signatureType,
            documentType,
            doc.training_id,
            doc.user_id
          );
          
          // Vérifier si l'entrée existe déjà dans document_signatures
          const { data: existingSignatures } = await supabase
            .from('document_signatures')
            .select('*')
            .eq('training_id', doc.training_id)
            .eq('signature_type', signatureType.toLowerCase())
            .eq('document_type', documentType.toLowerCase());
          
          if (existingSignatures && existingSignatures.length > 0) {
            console.log(`ℹ️ [MIGRATION] Signature déjà présente dans document_signatures pour formation ${doc.training_id}`);
            
            // Vérifier si le fichier doit être renommé
            if (doc.url && !doc.url.includes(standardFilename)) {
              await this.renameSignatureFile(doc.url, standardFilename);
            }
            
            report.successfulMigrations++;
            continue;
          }
          
          // Insérer dans document_signatures
          const newSignature = {
            training_id: doc.training_id,
            user_id: doc.user_id,
            signature_type: signatureType.toLowerCase(),
            document_type: documentType.toLowerCase(),
            signature_url: doc.url,
            created_at: doc.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {
              original_document_id: doc.id,
              migrated_from: 'documents',
              original_title: doc.title
            }
          };
          
          const { error: insertError } = await supabase
            .from('document_signatures')
            .insert(newSignature);
          
          if (insertError) {
            console.error(`❌ [MIGRATION] Erreur lors de l'insertion de la signature ID ${doc.id}:`, insertError);
            report.failedMigrations.push(doc.id);
            report.errors[doc.id] = insertError.message;
          } else {
            // Renommer le fichier si nécessaire
            if (doc.url && !doc.url.includes(standardFilename)) {
              await this.renameSignatureFile(doc.url, standardFilename);
            }
            
            report.successfulMigrations++;
            console.log(`✅ [MIGRATION] Signature ID ${doc.id} migrée avec succès`);
          }
        } catch (error) {
          console.error(`❌ [MIGRATION] Erreur lors de la migration du document ID ${doc.id}:`, error);
          report.failedMigrations.push(doc.id);
          report.errors[doc.id] = error.message || 'Erreur inconnue';
        }
      }
      
      console.log(`🏁 [MIGRATION] Migration terminée:
        - Documents traités: ${report.processedRecords}
        - Migrations réussies: ${report.successfulMigrations}
        - Migrations échouées: ${report.failedMigrations.length}`);
      
      return report;
    } catch (error) {
      console.error('❌ [MIGRATION] Erreur lors de la migration:', error);
      return report;
    }
  }
  
  /**
   * Renomme un fichier de signature dans le bucket de stockage
   */
  private static async renameSignatureFile(oldUrl: string, newFilename: string): Promise<boolean> {
    try {
      if (!oldUrl) return false;
      
      // Extraire le nom du fichier actuel
      const parts = oldUrl.split('/');
      const oldFilename = parts[parts.length - 1];
      
      // Si le nom est déjà bon, ne rien faire
      if (oldFilename === newFilename) return true;
      
      console.log(`🔄 [RENAME] Renommage de ${oldFilename} vers ${newFilename}`);
      
      // Télécharger le fichier
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('signatures')
        .download(oldFilename);
      
      if (downloadError) {
        console.error(`❌ [RENAME] Erreur lors du téléchargement de ${oldFilename}:`, downloadError);
        return false;
      }
      
      // Uploader avec le nouveau nom
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(newFilename, fileData, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (uploadError) {
        console.error(`❌ [RENAME] Erreur lors de l'upload de ${newFilename}:`, uploadError);
        return false;
      }
      
      // Obtenir l'URL publique
      const { data: publicUrlData } = await supabase.storage
        .from('signatures')
        .getPublicUrl(newFilename);
      
      const newUrl = publicUrlData?.publicUrl;
      
      // Mettre à jour les références dans la base de données
      await this.updateSignatureUrls(oldUrl, newUrl);
      
      // Supprimer l'ancien fichier (optionnel, peut être fait après vérification)
      // await supabase.storage.from('signatures').remove([oldFilename]);
      
      console.log(`✅ [RENAME] Fichier renommé: ${oldFilename} -> ${newFilename}`);
      return true;
    } catch (error) {
      console.error('❌ [RENAME] Erreur lors du renommage du fichier:', error);
      return false;
    }
  }
  
  /**
   * Met à jour les URLs de signature dans la base de données
   */
  private static async updateSignatureUrls(oldUrl: string, newUrl: string): Promise<void> {
    if (!oldUrl || !newUrl) return;
    
    try {
      // Mettre à jour dans la table documents
      const { error: docsError } = await supabase
        .from('documents')
        .update({ url: newUrl })
        .eq('url', oldUrl);
      
      if (docsError) {
        console.error(`❌ [URL] Erreur lors de la mise à jour des URLs dans documents:`, docsError);
      }
      
      // Mettre à jour dans la table document_signatures
      const { error: sigsError } = await supabase
        .from('document_signatures')
        .update({ signature_url: newUrl })
        .eq('signature_url', oldUrl);
      
      if (sigsError) {
        console.error(`❌ [URL] Erreur lors de la mise à jour des URLs dans document_signatures:`, sigsError);
      }
    } catch (error) {
      console.error('❌ [URL] Erreur lors de la mise à jour des URLs:', error);
    }
  }
  
  /**
   * Effectue la migration complète:
   * 1. Diagnostic des problèmes
   * 2. Correction des problèmes identifiés
   * 3. Migration des données
   */
  static async runFullMigration(): Promise<{
    diagnosticResults: any;
    migrationReport: MigrationReport;
  }> {
    console.log('🚀 [FULL MIGRATION] Démarrage de la migration complète...');
    
    // 1. Exécuter le diagnostic
    console.log('🔍 [FULL MIGRATION] Étape 1: Diagnostic des problèmes...');
    const diagnosticResults = await SignatureDiagnostic.runFullDiagnostic();
    
    // 2. Corriger les problèmes identifiés
    console.log('🔧 [FULL MIGRATION] Étape 2: Correction des problèmes...');
    await SignatureDiagnostic.fixDocumentsTable(diagnosticResults.documentsReport);
    await SignatureDiagnostic.fixDocumentSignatures(diagnosticResults.signaturesReport);
    await SignatureDiagnostic.fixTrainerSignatureUserIds();
    
    // 3. Migrer les données
    console.log('🔄 [FULL MIGRATION] Étape 3: Migration des signatures...');
    const migrationReport = await this.migrateSignaturesFromDocumentsTable();
    
    console.log('🏁 [FULL MIGRATION] Migration complète terminée');
    
    return {
      diagnosticResults,
      migrationReport
    };
  }
  
  /**
   * Vérifie la cohérence après la migration
   */
  static async verifyMigrationResults(): Promise<{
    documentsCount: number;
    documentSignaturesCount: number;
    missingSignatures: any[];
  }> {
    console.log('🔍 [VERIFY] Vérification des résultats de la migration...');
    
    try {
      // Compter les signatures dans la table documents
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select('count')
        .or('title.eq.Signature du formateur,title.eq.Signature de l\'apprenant,title.eq.Tampon de l\'entreprise,title.eq.Tampon de l\'organisme');
      
      const documentsCount = documents ? parseInt(documents[0].count) : 0;
      
      if (docError) {
        console.error('❌ [VERIFY] Erreur lors du comptage des documents:', docError);
      }
      
      // Compter les signatures dans la table document_signatures
      const { data: signatures, error: sigError } = await supabase
        .from('document_signatures')
        .select('count');
      
      const documentSignaturesCount = signatures ? parseInt(signatures[0].count) : 0;
      
      if (sigError) {
        console.error('❌ [VERIFY] Erreur lors du comptage des signatures:', sigError);
      }
      
      // Vérifier les signatures de formateur manquantes
      const missingSignatures = await SignatureDiagnostic.findMissingTrainerSignatures();
      
      console.log(`📊 [VERIFY] Résultats de la vérification:
        - Signatures dans table documents: ${documentsCount}
        - Signatures dans table document_signatures: ${documentSignaturesCount}
        - Formations sans signature de formateur: ${missingSignatures.length}`);
      
      return {
        documentsCount,
        documentSignaturesCount,
        missingSignatures
      };
    } catch (error) {
      console.error('❌ [VERIFY] Erreur lors de la vérification:', error);
      return {
        documentsCount: 0,
        documentSignaturesCount: 0,
        missingSignatures: []
      };
    }
  }
}

/**
 * Point d'entrée pour exécuter la migration depuis la console
 */
export const runMigration = async () => {
  console.log('🚀 [MIGRATION] Lancement de la migration des signatures...');
  
  try {
    // Demander confirmation
    console.log('⚠️ [MIGRATION] Cette opération va migrer toutes les signatures. Voulez-vous continuer?');
    console.log('Pour exécuter la migration complète, utilisez: SignatureMigration.runFullMigration()');
    console.log('Pour vérifier les résultats après migration, utilisez: SignatureMigration.verifyMigrationResults()');
    
    return {
      StartMigration: SignatureMigration.runFullMigration,
      VerifyResults: SignatureMigration.verifyMigrationResults
    };
  } catch (error) {
    console.error('❌ [MIGRATION] Erreur lors du lancement de la migration:', error);
    return null;
  }
};

// Exposer pour utilisation dans la console du navigateur
if (typeof window !== 'undefined') {
  (window as any).SignatureMigration = SignatureMigration;
  (window as any).runSignatureMigration = runMigration;
} 