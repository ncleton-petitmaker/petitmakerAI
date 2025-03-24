/**
 * Utilitaires pour la gestion des signatures
 */

import { supabase } from '../lib/supabase';
import { 
  DocumentType, 
  SignatureType, 
  SignatureMetadata,
  SignatureSearchOptions,
  SignatureSaveOptions,
  generateStandardSignatureFilename,
  getDocumentTypeFromString,
  getSignatureTypeFromString 
} from '../types/SignatureTypes';

/**
 * Vérifie si l'URL d'image est valide et accessible
 * @param url URL de l'image à vérifier
 * @returns Promise<boolean> true si l'URL est valide, false sinon
 */
export const isValidImageUrl = async (url: string | null): Promise<boolean> => {
  if (!url) return false;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    return response.ok && contentType !== null && contentType.startsWith('image/');
  } catch (error) {
    console.error(`❌ [IMAGE] Erreur lors de la vérification de l'URL d'image:`, error);
    return false;
  }
};

/**
 * Interface pour une signature récupérée
 */
export interface SignatureResult {
  url: string;
  filename: string;
  signatureType: SignatureType;
  documentType: DocumentType;
  metadata?: SignatureMetadata;
  userId?: string;
  trainingId?: string;
  createdAt?: string;
  found: boolean;
  source?: 'document_signatures' | 'documents' | 'storage';
  id?: string;
}

/**
 * Service de gestion des signatures
 */
export class SignatureService {
  /**
   * Recherche une signature selon les critères spécifiés
   * Cherche d'abord dans la table document_signatures, 
   * puis dans la table documents, 
   * puis directement dans le stockage
   */
  static async findSignature(options: SignatureSearchOptions): Promise<SignatureResult> {
    console.log(`🔍 [SIGNATURE] Recherche d'une signature de type ${options.signatureType} pour ${options.documentType}`);
    
    // Normaliser les types
    const signatureType = typeof options.signatureType === 'string' 
      ? getSignatureTypeFromString(options.signatureType)
      : options.signatureType;
      
    const documentType = typeof options.documentType === 'string'
      ? getDocumentTypeFromString(options.documentType)
      : options.documentType;
    
    // Résultat par défaut si rien n'est trouvé
    const emptyResult: SignatureResult = {
      url: '',
      filename: '',
      signatureType,
      documentType,
      found: false
    };
    
    try {
      // 1. Chercher dans la table document_signatures
      const signature = await this.findSignatureInDocumentSignatures(
        signatureType,
        documentType,
        options.trainingId,
        options.userId,
        options
      );
      
      if (signature.found) {
        console.log(`✅ [SIGNATURE] Signature trouvée dans document_signatures`);
        return signature;
      }
      
      // 2. Chercher dans la table documents (ancienne méthode)
      const legacySignature = await this.findSignatureInDocumentsTable(
        signatureType,
        documentType,
        options.trainingId,
        options.userId
      );
      
      if (legacySignature.found) {
        console.log(`✅ [SIGNATURE] Signature trouvée dans la table documents`);
        return legacySignature;
      }
      
      // 3. Chercher directement dans le bucket de stockage
      const storageSignature = await this.findSignatureInStorage(
        signatureType,
        documentType,
        options.trainingId,
        options.userId
      );
      
      if (storageSignature.found) {
        console.log(`✅ [SIGNATURE] Signature trouvée dans le stockage`);
        return storageSignature;
      }
      
      console.log(`⚠️ [SIGNATURE] Aucune signature trouvée`);
      return emptyResult;
      } catch (error) {
      console.error(`❌ [SIGNATURE] Erreur lors de la recherche de signature:`, error);
      return emptyResult;
    }
  }
  
  /**
   * Recherche une signature dans la table document_signatures
   */
  private static async findSignatureInDocumentSignatures(
    signatureType: SignatureType,
    documentType: DocumentType,
    trainingId?: string,
    userId?: string,
    options?: SignatureSearchOptions
  ): Promise<SignatureResult> {
    try {
      // Construire la requête de base
      let query = supabase
        .from('document_signatures')
        .select('*')
        .eq('signature_type', signatureType.toLowerCase())
        .eq('document_type', documentType.toLowerCase());
      
      // Ajouter les filtres optionnels
      if (trainingId) {
        query = query.eq('training_id', trainingId);
      }
      
      // Pour les signatures de formateur, on peut se passer de l'ID utilisateur
      // Pour les tampons de l'organisme, on peut se passer de l'ID utilisateur
      if (userId && 
          signatureType !== SignatureType.TRAINER && 
          signatureType !== SignatureType.ORGANIZATION_SEAL) {
        query = query.eq('user_id', userId);
      }
      
      // Pour les représentants, chercher d'abord par user_id, puis par company_id si disponible
      if (signatureType === SignatureType.REPRESENTATIVE && !userId) {
        // Option avancée: permettre de chercher les signatures de représentant par entreprise
        if (options?.metadata?.companyId) {
          query = query.contains('metadata', { companyId: options.metadata.companyId });
        }
      }
      
      const { data: signatures, error } = await query;
      
      if (error || !signatures || signatures.length === 0) {
        return {
          url: '',
          filename: '',
          signatureType,
          documentType,
          found: false
        };
      }
      
      // Prendre la signature la plus récente
      const signature = signatures[0];
      
      return {
        url: signature.signature_url,
        filename: signature.signature_url.split('/').pop() || '',
        signatureType,
        documentType,
        metadata: signature.metadata,
        userId: signature.user_id,
        trainingId: signature.training_id,
        createdAt: signature.created_at,
        id: signature.id,
        found: true,
        source: 'document_signatures'
      };
  } catch (error) {
      console.error(`❌ [SIGNATURE] Erreur lors de la recherche dans document_signatures:`, error);
      return {
        url: '',
        filename: '',
        signatureType,
        documentType,
        found: false
      };
    }
  }
  
  /**
   * Recherche une signature dans la table documents (ancienne méthode)
   */
  private static async findSignatureInDocumentsTable(
    signatureType: SignatureType,
    documentType: DocumentType,
    trainingId?: string,
    userId?: string
  ): Promise<SignatureResult> {
    try {
      // Déterminer le titre en fonction du type de signature
      let title: string;
      
      switch (signatureType) {
        case SignatureType.TRAINER:
          title = 'Signature du formateur';
          break;
        case SignatureType.PARTICIPANT:
          title = 'Signature de l\'apprenant';
          break;
        case SignatureType.REPRESENTATIVE:
          title = 'Signature du représentant légal';
          break;
        case SignatureType.COMPANY_SEAL:
          title = 'Tampon de l\'entreprise';
          break;
        case SignatureType.ORGANIZATION_SEAL:
          title = 'Tampon de l\'organisme';
          break;
        default:
          title = '';
      }
      
      if (!title) {
      return {
          url: '',
          filename: '',
          signatureType,
          documentType,
          found: false
        };
      }
      
      // Construire la requête
      let query = supabase
        .from('documents')
        .select('*')
        .eq('title', title);
      
      // Déterminer le type de document
      let docType: string;
      switch (documentType) {
        case DocumentType.CONVENTION:
          docType = 'convention';
          break;
        case DocumentType.ATTESTATION:
          docType = 'attestation';
          break;
        case DocumentType.ATTENDANCE_SHEET:
          docType = 'emargement';
          break;
        case DocumentType.CERTIFICATE:
          docType = 'attestation';
          break;
        default:
          docType = 'convention';
      }
      
      query = query.eq('type', docType);
      
      // Ajouter les filtres optionnels
      if (trainingId) {
        query = query.eq('training_id', trainingId);
      }
      
      // Pour les signatures de formateur, on peut se passer de l'ID utilisateur
      // Pour les tampons de l'organisme, on peut se passer de l'ID utilisateur
      if (userId && 
          signatureType !== SignatureType.TRAINER && 
          signatureType !== SignatureType.ORGANIZATION_SEAL) {
        query = query.eq('user_id', userId);
      }
      
      const { data: documents, error } = await query;
      
      if (error || !documents || documents.length === 0) {
          return {
          url: '',
          filename: '',
          signatureType,
          documentType,
          found: false
        };
      }
      
      // Prendre le document le plus récent
      const document = documents[0];
      
          return {
        url: document.url,
        filename: document.url.split('/').pop() || '',
        signatureType,
        documentType,
        userId: document.user_id,
        trainingId: document.training_id,
        createdAt: document.created_at,
        id: document.id,
        found: true,
        source: 'documents'
      };
  } catch (error) {
      console.error(`❌ [SIGNATURE] Erreur lors de la recherche dans documents:`, error);
    return {
        url: '',
        filename: '',
        signatureType,
        documentType,
        found: false
      };
    }
  }
  
  /**
   * Recherche une signature directement dans le bucket de stockage
   */
  private static async findSignatureInStorage(
    signatureType: SignatureType,
    documentType: DocumentType,
    trainingId?: string,
    userId?: string
  ): Promise<SignatureResult> {
    try {
      if (!trainingId) {
        return {
          url: '',
          filename: '',
          signatureType,
          documentType,
          found: false
        };
      }
      
      // Générer des patterns de noms de fichiers possibles
      const patterns = [];
      
      // Pattern avec nouveau format standardisé
      if (userId) {
        patterns.push(generateStandardSignatureFilename(signatureType, documentType, trainingId, userId));
      }
      
      // Anciens patterns selon le type de signature
      switch (signatureType) {
        case SignatureType.TRAINER:
          patterns.push(`trainer_convention_${trainingId}`);
          break;
        case SignatureType.PARTICIPANT:
          if (userId) {
            patterns.push(`participant_convention_${userId}_${trainingId}`);
          }
          break;
        case SignatureType.COMPANY_SEAL:
          patterns.push(`seal_company_${trainingId}`);
          if (userId) {
            patterns.push(`seal_company_${userId}_${trainingId}`);
          }
          break;
        case SignatureType.ORGANIZATION_SEAL:
          patterns.push(`organization_seal`);
          patterns.push(`organization_seal_${trainingId}`);
          break;
      }
      
      // Rechercher dans le bucket pour chaque pattern
      for (const pattern of patterns) {
        const { data: files, error } = await supabase.storage
          .from('signatures')
          .list('', { search: pattern });
        
        if (error || !files || files.length === 0) {
          continue;
        }
        
        // Prendre le premier fichier correspondant
        const file = files[0];
        
        // Obtenir l'URL publique
        const { data: publicUrlData } = await supabase.storage
          .from('signatures')
          .getPublicUrl(file.name);
        
        if (!publicUrlData) {
          continue;
        }
        
        return {
          url: publicUrlData.publicUrl,
          filename: file.name,
          signatureType,
          documentType,
          found: true,
          source: 'storage'
        };
      }
      
      return {
        url: '',
        filename: '',
        signatureType,
        documentType,
        found: false
      };
      } catch (error) {
      console.error(`❌ [SIGNATURE] Erreur lors de la recherche dans le stockage:`, error);
      return {
        url: '',
        filename: '',
        signatureType,
        documentType,
        found: false
      };
    }
  }
  
  /**
   * Enregistre une signature
   */
  static async saveSignature(
    signatureData: string | File,
    options: SignatureSaveOptions
  ): Promise<SignatureResult> {
    console.log(`🔍 [SIGNATURE] Enregistrement d'une signature de type ${options.signatureType}`);
    
    try {
      // Normaliser les types
      const signatureType = typeof options.signatureType === 'string' 
        ? getSignatureTypeFromString(options.signatureType)
        : options.signatureType;
        
      const documentType = typeof options.documentType === 'string'
        ? getDocumentTypeFromString(options.documentType)
        : options.documentType;
      
      if (!options.trainingId) {
        throw new Error('trainingId est obligatoire pour enregistrer une signature');
      }
      
      // Pour certains types de signatures, userId est obligatoire
      if (!options.userId && 
          signatureType !== SignatureType.TRAINER && 
          signatureType !== SignatureType.ORGANIZATION_SEAL) {
        throw new Error('userId est obligatoire pour ce type de signature');
      }
      
      // Générer un nom de fichier standardisé
      const filename = generateStandardSignatureFilename(
        signatureType,
        documentType,
        options.trainingId,
        options.userId
      );
      
      // Uploader le fichier
      let fileData: File | Blob;
      
      if (typeof signatureData === 'string' && signatureData.startsWith('data:image')) {
        // Convertir la data URL en Blob
        const res = await fetch(signatureData);
        fileData = await res.blob();
      } else if (signatureData instanceof File) {
        fileData = signatureData;
          } else {
        throw new Error('Format de signature non supporté');
      }
      
      // Uploader dans le bucket
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(filename, fileData, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (uploadError) {
        throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
      }
      
      // Obtenir l'URL publique
      const { data: publicUrlData } = await supabase.storage
        .from('signatures')
        .getPublicUrl(filename);
      
      if (!publicUrlData) {
        throw new Error('Impossible d\'obtenir l\'URL publique');
      }
      
      const signatureUrl = publicUrlData.publicUrl;
      
      // Enregistrer dans la table document_signatures
      const newSignature = {
        training_id: options.trainingId,
        user_id: options.userId || null,
        signature_type: signatureType.toLowerCase(),
        document_type: documentType.toLowerCase(),
        signature_url: signatureUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: options.metadata || {}
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('document_signatures')
        .insert(newSignature)
        .select();
      
      if (insertError) {
        throw new Error(`Erreur lors de l'insertion dans document_signatures: ${insertError.message}`);
      }
      
      console.log(`✅ [SIGNATURE] Signature enregistrée avec succès: ${filename}`);
      
      return {
        url: signatureUrl,
        filename,
        signatureType,
        documentType,
        metadata: options.metadata,
        userId: options.userId,
        trainingId: options.trainingId,
        createdAt: new Date().toISOString(),
        id: insertData && insertData.length > 0 ? insertData[0].id : undefined,
        found: true,
        source: 'document_signatures'
      };
        } catch (error) {
      console.error(`❌ [SIGNATURE] Erreur lors de l'enregistrement:`, error);
      throw error;
    }
  }
  
  /**
   * Supprime une signature
   */
  static async deleteSignature(
    signatureType: SignatureType | string,
    documentType: DocumentType | string,
    trainingId: string,
    userId?: string
  ): Promise<boolean> {
    console.log(`🗑️ [SIGNATURE] Suppression d'une signature de type ${signatureType}`);
    
    try {
      // Normaliser les types
      const normalizedSignatureType = typeof signatureType === 'string' 
        ? getSignatureTypeFromString(signatureType)
        : signatureType;
        
      const normalizedDocumentType = typeof documentType === 'string'
        ? getDocumentTypeFromString(documentType)
        : documentType;
      
      // 1. Trouver la signature
      const signature = await this.findSignature({
        signatureType: normalizedSignatureType,
        documentType: normalizedDocumentType,
        trainingId,
        userId
      });
      
      if (!signature.found) {
        console.log(`⚠️ [SIGNATURE] Aucune signature trouvée à supprimer`);
        return false;
      }
      
      // 2. Supprimer l'entrée de la base de données
      if (signature.source === 'document_signatures') {
        // Construire la requête
        let query = supabase
          .from('document_signatures')
          .delete()
          .eq('signature_type', normalizedSignatureType.toLowerCase())
          .eq('document_type', normalizedDocumentType.toLowerCase())
          .eq('training_id', trainingId);
        
        if (userId && 
            normalizedSignatureType !== SignatureType.TRAINER && 
            normalizedSignatureType !== SignatureType.ORGANIZATION_SEAL) {
          query = query.eq('user_id', userId);
        }
        
        const { error } = await query;
        
        if (error) {
          console.error(`❌ [SIGNATURE] Erreur lors de la suppression dans document_signatures:`, error);
        }
      } else if (signature.source === 'documents') {
        // Déterminer le titre en fonction du type de signature
        let title: string;
        
        switch (normalizedSignatureType) {
          case SignatureType.TRAINER:
            title = 'Signature du formateur';
            break;
          case SignatureType.PARTICIPANT:
            title = 'Signature de l\'apprenant';
            break;
          case SignatureType.REPRESENTATIVE:
            title = 'Signature du représentant légal';
            break;
          case SignatureType.COMPANY_SEAL:
            title = 'Tampon de l\'entreprise';
            break;
          case SignatureType.ORGANIZATION_SEAL:
            title = 'Tampon de l\'organisme';
            break;
        }
        
        // Construire la requête
        let query = supabase
          .from('documents')
          .delete()
          .eq('title', title)
          .eq('training_id', trainingId);
        
        if (userId && 
            normalizedSignatureType !== SignatureType.TRAINER && 
            normalizedSignatureType !== SignatureType.ORGANIZATION_SEAL) {
          query = query.eq('user_id', userId);
        }
        
        const { error } = await query;
        
        if (error) {
          console.error(`❌ [SIGNATURE] Erreur lors de la suppression dans documents:`, error);
        }
      }
      
      // 3. Supprimer le fichier du stockage si nécessaire
      if (signature.filename) {
        const { error: deleteError } = await supabase.storage
              .from('signatures')
          .remove([signature.filename]);
        
        if (deleteError) {
          console.error(`❌ [SIGNATURE] Erreur lors de la suppression du fichier:`, deleteError);
        }
      }
      
      console.log(`✅ [SIGNATURE] Signature supprimée avec succès`);
      return true;
      } catch (error) {
      console.error(`❌ [SIGNATURE] Erreur lors de la suppression:`, error);
      return false;
    }
  }
  
  /**
   * Partage une signature de représentant légal avec tous les apprenants de la même entreprise
   */
  static async shareRepresentativeSignature(
    trainingId: string,
    userId: string,
    companyId: string
  ): Promise<boolean> {
    console.log(`🔄 [SIGNATURE] Partage de la signature du représentant pour l'entreprise ${companyId}`);
    
    try {
      // 1. Trouver la signature du représentant
      const signature = await this.findSignature({
        signatureType: SignatureType.REPRESENTATIVE,
        documentType: DocumentType.CONVENTION,
        trainingId,
        userId,
        metadata: { companyId }
      });
      
      if (!signature.found) {
        console.log(`⚠️ [SIGNATURE] Aucune signature de représentant trouvée à partager`);
        return false;
      }
      
      // 2. Trouver tous les participants de la même entreprise pour cette formation
      const { data: participants, error: participantsError } = await supabase
        .from('training_participants')
        .select('user_id')
        .eq('training_id', trainingId)
        .eq('company_id', companyId);
      
      if (participantsError || !participants || participants.length === 0) {
        console.log(`⚠️ [SIGNATURE] Aucun participant trouvé pour l'entreprise ${companyId}`);
        return false;
      }
      
      console.log(`✅ [SIGNATURE] ${participants.length} participants trouvés pour l'entreprise ${companyId}`);
      
      // 3. Pour chaque participant, créer une entrée avec la même signature
      let successCount = 0;
      
      for (const participant of participants) {
        // Ne pas re-créer pour l'utilisateur d'origine
        if (participant.user_id === userId) {
          continue;
        }
        
        // Vérifier si une entrée existe déjà
        const { data: existingSignatures } = await supabase
          .from('document_signatures')
          .select('*')
          .eq('training_id', trainingId)
          .eq('user_id', participant.user_id)
          .eq('signature_type', SignatureType.REPRESENTATIVE.toLowerCase())
          .eq('document_type', DocumentType.CONVENTION.toLowerCase());
        
        if (existingSignatures && existingSignatures.length > 0) {
          console.log(`ℹ️ [SIGNATURE] Le participant ${participant.user_id} a déjà une signature de représentant`);
          continue;
        }
        
        // Créer une nouvelle entrée
        const newSignature = {
          training_id: trainingId,
          user_id: participant.user_id,
          signature_type: SignatureType.REPRESENTATIVE.toLowerCase(),
          document_type: DocumentType.CONVENTION.toLowerCase(),
          signature_url: signature.url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            companyId,
            sharedFrom: userId,
            originalSignatureId: signature.id
          }
        };
        
        const { error: insertError } = await supabase
          .from('document_signatures')
          .insert(newSignature);
        
        if (insertError) {
          console.error(`❌ [SIGNATURE] Erreur lors du partage avec ${participant.user_id}:`, insertError);
          } else {
          successCount++;
        }
      }
      
      console.log(`✅ [SIGNATURE] Signature partagée avec ${successCount} participants`);
      return successCount > 0;
    } catch (error) {
      console.error(`❌ [SIGNATURE] Erreur lors du partage:`, error);
      return false;
    }
  }
}

/**
 * Ajoute un cache buster à une URL pour forcer le rechargement
 * @param url URL à laquelle ajouter un cache buster
 * @returns URL avec cache buster
 */
export const addCacheBuster = (url: string): string => {
  if (!url) return '';
  
  // Nettoyer l'URL des paramètres existants t= et forcereload=
  let cleanUrl = url;
  try {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.origin}${urlObj.pathname}`;
    
    // Recréer les paramètres sans t= et forcereload=
    const params = new URLSearchParams();
    urlObj.searchParams.forEach((value, key) => {
      if (key !== 't' && key !== 'forcereload') {
        params.append(key, value);
      }
    });
    
    const queryString = params.toString();
    cleanUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
  } catch (e) {
    console.warn('⚠️ [CACHE] Impossible de parser l\'URL pour nettoyer les cache busters:', e);
    // Fallback: essayer de nettoyer avec une regex
    cleanUrl = url.split(/[?&]t=\d+/)[0].split(/[?&]forcereload=true/)[0];
  }
  
  // Ajouter un nouveau cache buster
  const timestamp = Date.now();
  const separator = cleanUrl.includes('?') ? '&' : '?';
  return `${cleanUrl}${separator}t=${timestamp}&forcereload=true`;
};

/**
 * Valide une URL de tampon d'organisation
 * @param url URL à valider
 * @returns Promise<boolean> true si l'URL est valide, false sinon
 */
export const validateSealUrl = async (url: string): Promise<boolean> => {
  try {
    if (!url) return false;
    
    // Vérifie si l'URL est accessible
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Erreur lors de la validation de l\'URL du tampon:', error);
    return false;
  }
};

/**
 * Optimise l'URL d'un tampon d'entreprise
 * @param url URL à optimiser
 * @returns URL optimisée avec cache buster
 */
export const optimizeSealUrl = (url: string | null): string | null => {
  if (!url) return null;
  return addCacheBuster(url);
};

/**
 * Vérifie et optimise l'URL d'une signature
 * @param url URL à vérifier et optimiser
 * @returns Promise<string | null> URL optimisée si valide, null sinon
 */
export const verifyAndOptimizeSignatureUrl = async (url: string | null): Promise<string | null> => {
  if (!url) return null;
  
  try {
    const isValid = await validateSealUrl(url);
    if (!isValid) return null;
    
    return addCacheBuster(url);
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'URL de signature:', error);
    return null;
  }
};

/**
 * Optimise l'URL d'un tampon d'organisation
 * @param url URL à optimiser
 * @returns URL optimisée avec cache buster ou null si invalide
 */
export const optimizeOrganizationSealUrl = async (url: string | null): Promise<string | null> => {
  if (!url) return null;
  
  try {
    const isValid = await validateSealUrl(url);
    if (!isValid) {
      // Si l'URL n'est pas valide, essayer de récupérer le tampon via le service
      const sealResult = await SignatureService.findSignature({
        training_id: 'default',
        signature_type: SignatureType.ORGANIZATION_SEAL,
        type: DocumentType.CONVENTION
      });
      
      if (sealResult.found) {
        return addCacheBuster(sealResult.url);
      }
      
      return null;
    }
    
    return addCacheBuster(url);
  } catch (error) {
    console.error('Erreur lors de l\'optimisation de l\'URL du tampon d\'organisation:', error);
    return null;
  }
};

/**
 * Analyser une URL de données (data URL) et extraire des informations sur son format
 * @param dataUrl URL de données à analyser
 * @returns Un objet contenant le type MIME, le format et la taille de l'image
 */
export const analyzeDataUrl = (dataUrl: string): { mimeType: string; format: string; size: number } => {
  const result = {
    mimeType: 'unknown',
    format: 'unknown',
    size: 0
  };
  
  if (!dataUrl || typeof dataUrl !== 'string') {
    return result;
  }
  
  try {
    // Extraire le type MIME
    const match = dataUrl.match(/^data:([^;]+);base64,/);
    if (match && match[1]) {
      result.mimeType = match[1];
      
      // Déterminer le format à partir du type MIME
      if (result.mimeType === 'image/png') {
        result.format = 'png';
      } else if (result.mimeType === 'image/jpeg') {
        result.format = 'jpeg';
      } else if (result.mimeType === 'image/svg+xml') {
        result.format = 'svg';
      } else if (result.mimeType.startsWith('image/')) {
        result.format = result.mimeType.split('/')[1];
      }
    }
    
    // Calculer la taille approximative (en octets)
    // Une dataUrl base64 occupe environ 4/3 de la taille en octets
    const base64Data = dataUrl.split(',')[1];
    if (base64Data) {
      result.size = Math.round((base64Data.length * 3) / 4);
    }
  } catch (error) {
    console.error('Erreur lors de l\'analyse de la dataUrl:', error);
  }
  
  return result;
};

/**
 * Convertir une URL de données (data URL) en Blob
 * @param dataUrl URL de données à convertir
 * @returns Blob créé à partir de l'URL de données
 */
export const dataURLtoBlob = (dataUrl: string): Blob => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
};

/**
 * Diagnostique et corrige les problèmes avec le tampon de l'organisme
 * @param currentUrl URL actuelle du tampon (peut être vide ou invalide)
 * @param trainingId ID de la formation (optionnel, pour contexte)
 * @returns Promise<string | null> URL valide du tampon ou null si impossible à corriger
 */
export const diagnoseAndFixOrganizationSeal = async (
  currentUrl: string | null,
  trainingId?: string
): Promise<string | null> => {
  console.log('🔍 [DIAGNOSTIC] Vérification du tampon de l\'organisme...');
  
  try {
    // Étape 1: Vérifier si l'URL actuelle est valide
    if (currentUrl) {
      console.log('🔍 [DIAGNOSTIC] Vérification de l\'URL actuelle:', currentUrl);
      const isValid = await isValidImageUrl(currentUrl);
      
      if (isValid) {
        console.log('✅ [DIAGNOSTIC] L\'URL actuelle du tampon est valide');
        return addCacheBuster(currentUrl);
      }
      
      console.log('⚠️ [DIAGNOSTIC] L\'URL actuelle du tampon est invalide');
    }
    
    // Étape 2: Rechercher dans la table document_signatures
    console.log('🔍 [DIAGNOSTIC] Recherche du tampon dans document_signatures...');
    
    const { data: sealEntries, error: sealError } = await supabase
      .from('document_signatures')
      .select('*')
      .eq('signature_type', SignatureType.ORGANIZATION_SEAL.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (sealError) {
      console.error('❌ [DIAGNOSTIC] Erreur lors de la recherche du tampon:', sealError);
    } else if (sealEntries && sealEntries.length > 0) {
      const sealUrl = sealEntries[0].signature_url;
      console.log('🔍 [DIAGNOSTIC] Tampon trouvé dans document_signatures:', sealUrl);
      
      // Vérifier si cette URL est valide
      const isValid = await isValidImageUrl(sealUrl);
      if (isValid) {
        console.log('✅ [DIAGNOSTIC] Tampon trouvé et valide dans document_signatures');
        return addCacheBuster(sealUrl);
      }
      
      console.log('⚠️ [DIAGNOSTIC] Tampon trouvé dans document_signatures mais URL invalide');
    } else {
      console.log('⚠️ [DIAGNOSTIC] Aucun tampon trouvé dans document_signatures');
    }
    
    // Étape 3: Rechercher dans la table documents (méthode legacy)
    console.log('🔍 [DIAGNOSTIC] Recherche du tampon dans la table documents...');
    
    const { data: legacyEntries, error: legacyError } = await supabase
      .from('documents')
      .select('*')
      .eq('title', 'Tampon de l\'organisme')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (legacyError) {
      console.error('❌ [DIAGNOSTIC] Erreur lors de la recherche du tampon dans documents:', legacyError);
    } else if (legacyEntries && legacyEntries.length > 0) {
      const sealUrl = legacyEntries[0].file_url;
      console.log('🔍 [DIAGNOSTIC] Tampon trouvé dans documents:', sealUrl);
      
      // Vérifier si cette URL est valide
      const isValid = await isValidImageUrl(sealUrl);
      if (isValid) {
        console.log('✅ [DIAGNOSTIC] Tampon trouvé et valide dans documents');
        return addCacheBuster(sealUrl);
      }
      
      console.log('⚠️ [DIAGNOSTIC] Tampon trouvé dans documents mais URL invalide');
    } else {
      console.log('⚠️ [DIAGNOSTIC] Aucun tampon trouvé dans documents');
    }
    
    // Étape 4: Rechercher directement dans le bucket de stockage
    console.log('🔍 [DIAGNOSTIC] Recherche du tampon dans le stockage...');
    
    const { data: files, error: storageError } = await supabase.storage
      .from('signatures')
      .list('', { search: 'organization_seal' });
    
    if (storageError) {
      console.error('❌ [DIAGNOSTIC] Erreur lors de la recherche dans le stockage:', storageError);
    } else if (files && files.length > 0) {
      // Trouver le fichier le plus récent (en supposant qu'il contient un timestamp dans le nom)
      const sortedFiles = [...files].sort((a, b) => b.name.localeCompare(a.name));
      const latestFile = sortedFiles[0];
      
      console.log('🔍 [DIAGNOSTIC] Tampon trouvé dans le stockage:', latestFile.name);
      
      // Obtenir l'URL publique
      const { data: publicUrlData } = await supabase.storage
        .from('signatures')
        .getPublicUrl(latestFile.name);
      
      if (publicUrlData) {
        const sealUrl = publicUrlData.publicUrl;
        
        // Vérifier si cette URL est valide
        const isValid = await isValidImageUrl(sealUrl);
        if (isValid) {
          console.log('✅ [DIAGNOSTIC] Tampon trouvé et valide dans le stockage');
          return addCacheBuster(sealUrl);
        }
        
        console.log('⚠️ [DIAGNOSTIC] Tampon trouvé dans le stockage mais URL invalide');
      }
    } else {
      console.log('⚠️ [DIAGNOSTIC] Aucun tampon trouvé dans le stockage');
    }
    
    // Étape 5: Récupérer dans les paramètres
    console.log('🔍 [DIAGNOSTIC] Recherche du tampon dans les paramètres...');
    
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('organization_stamp_url')
      .limit(1);
    
    if (settingsError) {
      console.error('❌ [DIAGNOSTIC] Erreur lors de la récupération des paramètres:', settingsError);
    } else if (settings && settings.length > 0 && settings[0].organization_stamp_url) {
      const sealUrl = settings[0].organization_stamp_url;
      console.log('🔍 [DIAGNOSTIC] Tampon trouvé dans les paramètres:', sealUrl);
      
      // Vérifier si cette URL est valide
      const isValid = await isValidImageUrl(sealUrl);
      if (isValid) {
        console.log('✅ [DIAGNOSTIC] Tampon trouvé et valide dans les paramètres');
        return addCacheBuster(sealUrl);
      }
      
      console.log('⚠️ [DIAGNOSTIC] Tampon trouvé dans les paramètres mais URL invalide');
    } else {
      console.log('⚠️ [DIAGNOSTIC] Aucun tampon trouvé dans les paramètres');
    }
    
    console.log('❌ [DIAGNOSTIC] Impossible de trouver un tampon valide');
    return null;
  } catch (error) {
    console.error('❌ [DIAGNOSTIC] Erreur lors du diagnostic du tampon:', error);
    return null;
  }
};

/**
 * Vérifie l'accessibilité des tampons et optimise leurs URLs si nécessaire
 * @param seals Objet contenant les tampons à vérifier
 * @returns URLs optimisées des tampons et message de diagnostic
 */
export const checkSealAccess = async (seals: { 
  companySeal?: string | null; 
  organizationSeal?: string | null;
}): Promise<{
  companySeal: string | null;
  organizationSeal: string | null;
  diagnosticMessage: string;
}> => {
  try {
    console.log('🔍 [SEAL_CHECK] Vérification de l\'accessibilité des tampons:', {
      companySeal: seals.companySeal ? `${seals.companySeal.substring(0, 50)}...` : null,
      organizationSeal: seals.organizationSeal ? `${seals.organizationSeal.substring(0, 50)}...` : null
    });
    
    let diagnosticMessage = 'Vérification des tampons terminée.';
    let optimizedCompanySeal = seals.companySeal;
    let optimizedOrganizationSeal = seals.organizationSeal;
    
    // Vérifier le tampon d'entreprise
    if (seals.companySeal) {
      const companySealValid = await validateSealUrl(seals.companySeal);
      
      if (companySealValid) {
        console.log('✅ [SEAL_CHECK] Tampon d\'entreprise accessible');
        optimizedCompanySeal = addCacheBuster(seals.companySeal);
      } else {
        console.log('❌ [SEAL_CHECK] Tampon d\'entreprise inaccessible, optimisation...');
        optimizedCompanySeal = await optimizeSealUrl(seals.companySeal);
        
        // Vérifier si l'optimisation a résolu le problème
        if (optimizedCompanySeal && optimizedCompanySeal !== seals.companySeal) {
          const recheck = await validateSealUrl(optimizedCompanySeal);
          if (recheck) {
            console.log('✅ [SEAL_CHECK] Tampon d\'entreprise optimisé accessible');
            diagnosticMessage += ' Tampon d\'entreprise optimisé.';
          } else {
            console.log('❌ [SEAL_CHECK] Tampon d\'entreprise optimisé inaccessible');
            diagnosticMessage += ' Échec d\'accès au tampon d\'entreprise.';
          }
        }
      }
    }
    
    // Vérifier le tampon d'organisation
    if (seals.organizationSeal) {
      const organizationSealValid = await validateSealUrl(seals.organizationSeal);
      
      if (organizationSealValid) {
        console.log('✅ [SEAL_CHECK] Tampon d\'organisation accessible');
        optimizedOrganizationSeal = addCacheBuster(seals.organizationSeal);
      } else {
        console.log('❌ [SEAL_CHECK] Tampon d\'organisation inaccessible, tentative de récupération...');
        
        // Récupérer le tampon d'organisation depuis les settings
        const { data: settings } = await supabase
          .from('settings')
          .select('organization_seal_url, organization_seal_path')
          .single();
        
        if (settings?.organization_seal_url) {
          console.log('🔍 [SEAL_CHECK] Essai avec l\'URL depuis settings:', settings.organization_seal_url);
          const settingsSealValid = await validateSealUrl(settings.organization_seal_url);
          
          if (settingsSealValid) {
            console.log('✅ [SEAL_CHECK] Tampon depuis settings accessible');
            optimizedOrganizationSeal = addCacheBuster(settings.organization_seal_url);
            diagnosticMessage += ' Tampon d\'organisation récupéré depuis settings.';
          } else {
            console.log('❌ [SEAL_CHECK] Tampon depuis settings inaccessible');
            
            // Essayer de générer l'URL à partir du chemin stocké
            if (settings?.organization_seal_path) {
              try {
                const { data: urlData } = await supabase.storage
                  .from('signatures')
                  .getPublicUrl(settings.organization_seal_path);
                
                if (urlData && urlData.publicUrl) {
                  const pathSealValid = await validateSealUrl(urlData.publicUrl);
                  
                  if (pathSealValid) {
                    console.log('✅ [SEAL_CHECK] Tampon généré depuis le chemin accessible');
                    optimizedOrganizationSeal = addCacheBuster(urlData.publicUrl);
                    diagnosticMessage += ' Tampon d\'organisation généré depuis le chemin.';
                  } else {
                    console.log('❌ [SEAL_CHECK] Tampon généré depuis le chemin inaccessible');
                    diagnosticMessage += ' Échec d\'accès au tampon d\'organisation.';
                  }
                }
              } catch (error) {
                console.error('❌ [SEAL_CHECK] Erreur lors de la génération de l\'URL:', error);
              }
            }
          }
        } else {
          console.log('⚠️ [SEAL_CHECK] Pas d\'URL de tampon disponible dans settings');
        }
      }
    }
    
    return {
      companySeal: optimizedCompanySeal,
      organizationSeal: optimizedOrganizationSeal,
      diagnosticMessage
    };
  } catch (error) {
    console.error('❌ [SEAL_CHECK] Erreur lors de la vérification des tampons:', error);
    return {
      companySeal: seals.companySeal,
      organizationSeal: seals.organizationSeal,
      diagnosticMessage: 'Erreur lors de la vérification des tampons.'
    };
  }
};

// Exposer pour utilisation dans la console du navigateur
if (typeof window !== 'undefined') {
  (window as any).SignatureService = SignatureService;
}

/**
 * Force l'affichage d'un tampon d'organisation dans le DOM
 * Utilisé pour résoudre les problèmes où le tampon ne s'affiche pas correctement
 * @param sealUrl URL du tampon
 * @param containerId ID du conteneur où forcer l'affichage
 * @returns Promise<boolean> true si le tampons a été injecté avec succès
 */
export const forceOrganizationSealInDOM = async (
  sealUrl: string | null,
  containerId: string
): Promise<boolean> => {
  if (!sealUrl) return false;
  if (typeof document === 'undefined') return false;
  
  try {
    console.log(`🔍 [SIGNATURE] Tentative d'injection forcée du tampon dans #${containerId}`);
    
    // Vérifier si l'URL est valide
    const isValid = await isValidImageUrl(sealUrl);
    if (!isValid) {
      console.error(`❌ [SIGNATURE] URL du tampon invalide: ${sealUrl}`);
      return false;
    }
    
    // Trouver le conteneur
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ [SIGNATURE] Conteneur #${containerId} non trouvé`);
      return false;
    }
    
    // Créer une image avec l'URL du tampon
    const img = document.createElement('img');
    img.src = addCacheBuster(sealUrl);
    img.alt = 'Tampon de l\'organisme';
    img.className = 'organization-seal forced';
    img.style.maxWidth = '150px';
    img.style.maxHeight = '150px';
    
    // Vider le conteneur et ajouter l'image
    container.innerHTML = '';
    container.appendChild(img);
    
    console.log(`✅ [SIGNATURE] Tampon injecté avec succès dans #${containerId}`);
    return true;
  } catch (error) {
    console.error(`❌ [SIGNATURE] Erreur lors de l'injection forcée du tampon:`, error);
    return false;
  }
};