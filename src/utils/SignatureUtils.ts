/**
 * Utilitaires pour la gestion des signatures
 */

import { supabase } from '../lib/supabase';
import { 
  DocumentType, 
  SignatureType, 
  SignatureMetadata,
  SignatureSearchOptions,
  DocumentSaveOptions,
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
  source?: 'documents' | 'storage';
  id?: string;
}

/**
 * Service de gestion des signatures
 */
export class SignatureService {
  /**
   * Recherche une signature
   */
  static async findSignature(
    signatureType: SignatureType,
    documentType: DocumentType,
    trainingId?: string,
    userId?: string,
    additionalFilters?: Record<string, any>
  ): Promise<SignatureResult>;
  
  static async findSignature(options: SignatureSearchOptions): Promise<SignatureResult>;
  
  static async findSignature(...args: any[]): Promise<SignatureResult> {
    // Normaliser les arguments, selon la signature utilisée
    let signatureType: SignatureType;
    let documentType: DocumentType;
    let trainingId: string | undefined;
    let userId: string | undefined;
    let additionalFilters: Record<string, any> | undefined;
    
    if (typeof args[0] === 'object') {
      // Utilisation avec un objet d'options
      const options = args[0] as SignatureSearchOptions;
      signatureType = options.signature_type || SignatureType.PARTICIPANT;
      documentType = options.type ? getDocumentTypeFromString(options.type.toString()) : DocumentType.CONVENTION;
      trainingId = options.training_id;
      userId = options.user_id;
      additionalFilters = options;
    } else {
      // Utilisation avec des arguments positionnels
      signatureType = args[0];
      documentType = args[1];
      trainingId = args[2];
      userId = args[3];
      additionalFilters = args[4];
    }
    
    // S'assurer que les types requis sont définis
    if (!signatureType) {
      console.error('❌ [SIGNATURE] Type de signature non défini dans findSignature');
      return {
        url: '',
        filename: '',
        signatureType: SignatureType.PARTICIPANT, // Valeur par défaut
        documentType: documentType || DocumentType.CONVENTION, // Valeur par défaut
        found: false
      };
    }
    
    // Rechercher d'abord en base de données
    const result = await this.findSignatureInDatabase(
      signatureType,
      documentType,
      trainingId,
      userId,
      additionalFilters
    );
    
    if (result.found) {
      return result;
    }
    
    // Si non trouvé en base, chercher dans le stockage
    return this.findSignatureInStorage(
      signatureType,
      documentType,
      trainingId,
      userId
    );
  }

  private static async findSignatureInDocumentsTable(
    signatureType: SignatureType,
    documentType: DocumentType,
    trainingId?: string,
    userId?: string
  ): Promise<SignatureResult> {
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('type', documentType.toLowerCase());

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

      // Déterminer le titre en fonction du type de signature
      let title = '';
      switch (signatureType) {
        case SignatureType.PARTICIPANT:
          title = "Signature de l'apprenant";
          break;
        case SignatureType.REPRESENTATIVE:
          title = "Signature du représentant";
          break;
        case SignatureType.TRAINER:
          title = "Signature du formateur";
          break;
        case SignatureType.COMPANY_SEAL:
          title = "Tampon de l'entreprise";
          break;
        case SignatureType.ORGANIZATION_SEAL:
          title = "Tampon de l'organisme de formation";
          break;
      }

      query = query.eq('title', title);
      
      const { data: documents, error } = await query.order('created_at', { ascending: false }).limit(1);
      
      if (error || !documents || documents.length === 0) {
        return {
          url: '',
          filename: '',
          signatureType,
          documentType,
          found: false
        };
      }
      
      const document = documents[0];
      
      return {
        url: document.file_url,
        filename: document.file_url.split('/').pop() || '',
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
  static async saveSignature(options: DocumentSaveOptions): Promise<SignatureResult> {
    try {
      // Vérifier que la signature est valide
      if (!options.signature_type || !options.document_type || !options.file_url) {
        throw new Error('Type de signature, type de document et URL du fichier requis');
      }

      // Déterminer le titre en fonction du type de signature
      let title = '';
      switch (options.signature_type) {
        case SignatureType.PARTICIPANT:
          title = "Signature de l'apprenant";
          break;
        case SignatureType.REPRESENTATIVE:
          title = "Signature du représentant";
          break;
        case SignatureType.TRAINER:
          title = "Signature du formateur";
          break;
        case SignatureType.COMPANY_SEAL:
          title = "Tampon de l'entreprise";
          break;
        case SignatureType.ORGANIZATION_SEAL:
          title = "Tampon de l'organisme de formation";
          break;
      }

      // Préparer les données à insérer
      const documentData = {
        title,
        type: options.document_type.toLowerCase(),
        file_url: options.file_url,
        training_id: options.training_id,
        user_id: options.user_id,
        metadata: options.metadata
      };

      // Insérer dans la table documents
      const { data: document, error } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        url: document.file_url,
        filename: document.file_url.split('/').pop() || '',
        signatureType: options.signature_type,
        documentType: options.document_type,
        metadata: document.metadata,
        userId: document.user_id,
        trainingId: document.training_id,
        createdAt: document.created_at,
        id: document.id,
        found: true,
        source: 'documents'
      };
    } catch (error) {
      console.error(`❌ [SIGNATURE] Erreur lors de la sauvegarde de la signature:`, error);
      return {
        url: '',
        filename: '',
        signatureType: options.signature_type,
        documentType: options.document_type,
        found: false
      };
    }
  }
  
  /**
   * Supprime une signature
   */
  static async deleteSignature(
    signatureType: SignatureType,
    documentType: DocumentType,
    trainingId: string,
    userId?: string
  ): Promise<boolean> {
    try {
      // Déterminer le titre en fonction du type de signature
      let title = '';
      switch (signatureType) {
        case SignatureType.PARTICIPANT:
          title = "Signature de l'apprenant";
          break;
        case SignatureType.REPRESENTATIVE:
          title = "Signature du représentant";
          break;
        case SignatureType.TRAINER:
          title = "Signature du formateur";
          break;
        case SignatureType.COMPANY_SEAL:
          title = "Tampon de l'entreprise";
          break;
        case SignatureType.ORGANIZATION_SEAL:
          title = "Tampon de l'organisme de formation";
          break;
      }

      // Construire la requête de suppression
      let query = supabase
        .from('documents')
        .delete()
        .eq('type', documentType.toLowerCase())
        .eq('title', title)
        .eq('training_id', trainingId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error(`❌ [SIGNATURE] Erreur lors de la suppression de la signature:`, error);
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
    try {
      // 1. Trouver la signature du représentant
      const signature = await this.findSignature(
        SignatureType.REPRESENTATIVE,
        DocumentType.CONVENTION,
        trainingId,
        userId,
        {
          training_id: trainingId,
          user_id: userId,
          company_id: companyId,
          type: DocumentType.CONVENTION,
          signature_type: SignatureType.REPRESENTATIVE,
          metadata: { companyId }
        }
      );
      
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
      
      // 3. Pour chaque participant, créer une entrée dans la table documents
      let successCount = 0;
      
      for (const participant of participants) {
        // Ne pas re-créer pour l'utilisateur d'origine
        if (participant.user_id === userId) {
          continue;
        }
        
        // Vérifier si une entrée existe déjà
        const { data: existingDocuments } = await supabase
          .from('documents')
          .select('*')
          .eq('training_id', trainingId)
          .eq('user_id', participant.user_id)
          .eq('type', DocumentType.CONVENTION.toLowerCase())
          .eq('title', "Signature du représentant");
        
        if (existingDocuments && existingDocuments.length > 0) {
          console.log(`ℹ️ [SIGNATURE] Le participant ${participant.user_id} a déjà une signature de représentant`);
          continue;
        }
        
        // Créer une nouvelle entrée
        const newDocument = {
          title: "Signature du représentant",
          type: DocumentType.CONVENTION.toLowerCase(),
          training_id: trainingId,
          user_id: participant.user_id,
          file_url: signature.url,
          signature_type: SignatureType.REPRESENTATIVE,
          metadata: {
            companyId,
            sharedFrom: userId,
            originalSignatureId: signature.id
          }
        };
        
        const { error: insertError } = await supabase
          .from('documents')
          .insert(newDocument);
        
        if (insertError) {
          console.error(`❌ [SIGNATURE] Erreur lors du partage avec ${participant.user_id}:`, insertError);
        } else {
          successCount++;
        }
      }
      
      return successCount > 0;
    } catch (error) {
      console.error(`❌ [SIGNATURE] Erreur lors du partage:`, error);
      return false;
    }
  }

  /**
   * Recherche une signature en base de données
   */
  private static async findSignatureInDatabase(
    signatureType: SignatureType,
    documentType: DocumentType,
    trainingId?: string,
    userId?: string,
    additionalFilters?: Record<string, any>
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
      
      // Déterminer le titre à chercher
      let title = '';
      switch (signatureType) {
        case SignatureType.PARTICIPANT:
          title = "Signature de l'apprenant";
          break;
        case SignatureType.REPRESENTATIVE:
          title = "Signature du représentant";
          break;
        case SignatureType.TRAINER:
          title = "Signature du formateur";
          break;
        case SignatureType.COMPANY_SEAL:
          title = "Tampon de l'entreprise";
          break;
        case SignatureType.ORGANIZATION_SEAL:
          title = "Tampon de l'organisme de formation";
          break;
      }
      
      // Construire la requête de base
      let query = supabase.from('documents')
        .select('*')
        .eq('training_id', trainingId)
        .eq('type', documentType.toLowerCase());
      
      // Ajouter des filtres selon le type de signature
      switch (signatureType) {
        case SignatureType.PARTICIPANT:
        case SignatureType.REPRESENTATIVE:
          if (userId) {
            query = query.eq('user_id', userId);
          }
          break;
        case SignatureType.ORGANIZATION_SEAL:
          // Pas de filtre user_id pour les tampons d'organisation
          break;
        case SignatureType.COMPANY_SEAL:
          if (userId) {
            // Pour les tampons d'entreprise, on préfère ceux liés à l'utilisateur spécifique,
            // mais on accepte aussi ceux qui ne sont pas liés à un utilisateur spécifique
            // Cette logique pourrait être affinée selon les besoins
          }
          break;
        case SignatureType.TRAINER:
          // Pas de filtre user_id pour les signatures de formateur
          break;
      }

      // Appliquer des filtres supplémentaires si fournis
      if (additionalFilters) {
        Object.entries(additionalFilters).forEach(([key, value]) => {
          if (key !== 'metadata' && value !== undefined) {
            query = query.eq(key, value);
          }
        });
      }

      // Chercher par signature_type ET par titre pour plus de robustesse
      const { data: documentsByType, error: typeError } = await query
        .eq('signature_type', signatureType)
        .order('created_at', { ascending: false })
        .limit(1);
        
      // Si on trouve par signature_type, retourner ce résultat
      if (!typeError && documentsByType && documentsByType.length > 0) {
        const document = documentsByType[0];
        return {
          url: document.file_url,
          filename: document.file_url.split('/').pop() || '',
          signatureType,
          documentType,
          userId: document.user_id,
          trainingId: document.training_id,
          createdAt: document.created_at,
          id: document.id,
          found: true,
          source: 'documents'
        };
      }
      
      // Sinon, chercher par titre (méthode historique)
      const { data: documentsByTitle, error: titleError } = await query
        .eq('title', title)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (titleError || !documentsByTitle || documentsByTitle.length === 0) {
        return {
          url: '',
          filename: '',
          signatureType,
          documentType,
          found: false
        };
      }
      
      const document = documentsByTitle[0];
      
      return {
        url: document.file_url,
        filename: document.file_url.split('/').pop() || '',
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
      const sealResult = await SignatureService.findSignature(
        SignatureType.ORGANIZATION_SEAL,
        DocumentType.CONVENTION,
        'default',
        undefined,
        {
          training_id: 'default',
          type: DocumentType.CONVENTION,
          signature_type: SignatureType.ORGANIZATION_SEAL
        }
      );
      
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
  let optimizedCompanySeal: string | null = null;
  let optimizedOrganizationSeal: string | null = null;
  let diagnosticMessage = '';

  try {
    // Vérifier le tampon d'entreprise
    if (seals.companySeal) {
      const companySealValid = await validateSealUrl(seals.companySeal);
      if (companySealValid) {
        optimizedCompanySeal = addCacheBuster(seals.companySeal);
      }
    }

    // Vérifier le tampon d'organisation
    if (seals.organizationSeal) {
      const organizationSealValid = await validateSealUrl(seals.organizationSeal);
      if (organizationSealValid) {
        optimizedOrganizationSeal = addCacheBuster(seals.organizationSeal);
      } else {
        // Récupérer le tampon d'organisation depuis les settings
        const { data: settings } = await supabase
          .from('settings')
          .select('organization_seal_url, organization_seal_path')
          .single();
        
        if (settings?.organization_seal_url) {
          const settingsSealValid = await validateSealUrl(settings.organization_seal_url);
          
          if (settingsSealValid) {
            optimizedOrganizationSeal = addCacheBuster(settings.organization_seal_url);
            diagnosticMessage += ' Tampon d\'organisation récupéré depuis settings.';
          } else if (settings?.organization_seal_path) {
            try {
              const { data: urlData } = await supabase.storage
                .from('signatures')
                .getPublicUrl(settings.organization_seal_path);
              
              if (urlData && urlData.publicUrl) {
                const pathSealValid = await validateSealUrl(urlData.publicUrl);
                
                if (pathSealValid) {
                  optimizedOrganizationSeal = addCacheBuster(urlData.publicUrl);
                  diagnosticMessage += ' Tampon d\'organisation généré depuis le chemin.';
                } else {
                  diagnosticMessage += ' Échec d\'accès au tampon d\'organisation.';
                }
              }
            } catch (error) {
              console.error('❌ [SEAL_CHECK] Erreur lors de la génération de l\'URL:', error);
            }
          }
        }
      }
    }
    
    return {
      companySeal: optimizedCompanySeal,
      organizationSeal: optimizedOrganizationSeal,
      diagnosticMessage: diagnosticMessage || 'Vérification des tampons terminée.'
    };
  } catch (error) {
    console.error('❌ [SEAL_CHECK] Erreur lors de la vérification des tampons:', error);
    return {
      companySeal: null,
      organizationSeal: null,
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