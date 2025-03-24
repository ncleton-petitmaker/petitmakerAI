/**
 * Types pour la gestion standardisée des signatures et des documents
 */

/**
 * Énumération des types de signatures supportés
 */
export enum SignatureType {
  PARTICIPANT = 'participant',      // Signature de l'apprenant (attestations/émargements)
  REPRESENTATIVE = 'representative', // Signature du représentant légal (conventions)
  TRAINER = 'trainer',              // Signature du formateur (tous documents)
  COMPANY_SEAL = 'companySeal',     // Tampon de l'entreprise
  ORGANIZATION_SEAL = 'organizationSeal' // Tampon de l'organisme de formation
}

/**
 * Énumération des types de documents supportés
 */
export enum DocumentType {
  CONVENTION = 'convention',         // Convention de formation
  ATTESTATION = 'attestation',       // Attestation de présence
  ATTENDANCE_SHEET = 'emargement',   // Feuille d'émargement
  CERTIFICATE = 'certificate'        // Certificat de fin de formation
}

/**
 * Interface pour les métadonnées d'une signature
 */
export interface SignatureMetadata {
  training_id: string;
  user_id?: string;
  company_id?: string;
  type: DocumentType;
  signature_type: SignatureType;
  signature_url?: string;
  path?: string;
  shared_from_user_id?: string;
  created_at?: string;
}

/**
 * Interface pour les options de recherche de signatures
 */
export interface SignatureSearchOptions {
  training_id: string;
  user_id?: string;
  company_id?: string;
  type?: DocumentType;
  signature_type?: SignatureType;
  include_shared?: boolean;
  metadata?: {
    companyId?: string;
    [key: string]: any;
  };
}

/**
 * Interface pour les options de sauvegarde de signatures
 */
export interface SignatureSaveOptions {
  training_id: string;
  user_id: string;
  company_id?: string;
  type: DocumentType;
  signature_type: SignatureType;
  signature_data: string | Blob; // Base64 ou Blob de l'image
  file_name?: string;
  share_with_company?: boolean;
}

/**
 * Interface pour les entrées de la table document_signatures
 */
export interface DocumentSignatureRecord {
  id?: string;
  training_id: string;
  user_id: string;
  company_id?: string;
  type: DocumentType;
  signature_type: SignatureType;
  signature_url: string;
  path?: string;
  shared_from_user_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interface pour les entrées de la table documents
 */
export interface DocumentRecord {
  id?: string;
  title: string;
  type: DocumentType;
  company_id?: string;
  user_id?: string;
  training_id: string;
  file_url: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  need_stamp?: boolean;
}

/**
 * Utilitaire pour vérifier si un type de signature est un tampon
 */
export const isSealType = (type: SignatureType): boolean => {
  return type === SignatureType.COMPANY_SEAL || type === SignatureType.ORGANIZATION_SEAL;
};

/**
 * Utilitaire pour obtenir le type de document à partir de son nom
 */
export const getDocumentTypeFromString = (type: string): DocumentType => {
  switch (type.toLowerCase()) {
    case 'convention':
      return DocumentType.CONVENTION;
    case 'attestation':
      return DocumentType.ATTESTATION;
    case 'emargement':
    case 'attendance_sheet':
    case 'attendance-sheet':
      return DocumentType.ATTENDANCE_SHEET;
    case 'certificate':
    case 'certificat':
      return DocumentType.CERTIFICATE;
    default:
      console.warn(`Type de document inconnu: ${type}, utilisation du type convention par défaut`);
      return DocumentType.CONVENTION;
  }
};

/**
 * Utilitaire pour obtenir le type de signature à partir de son nom
 */
export const getSignatureTypeFromString = (type: string): SignatureType => {
  switch (type.toLowerCase()) {
    case 'participant':
      return SignatureType.PARTICIPANT;
    case 'representative':
    case 'representant':
    case 'représentant':
      return SignatureType.REPRESENTATIVE;
    case 'trainer':
    case 'formateur':
      return SignatureType.TRAINER;
    case 'companyseal':
    case 'company_seal':
    case 'company-seal':
    case 'seal_company':
      return SignatureType.COMPANY_SEAL;
    case 'organizationseal':
    case 'organization_seal':
    case 'organization-seal':
    case 'seal_organization':
      return SignatureType.ORGANIZATION_SEAL;
    default:
      console.warn(`Type de signature inconnu: ${type}, utilisation du type participant par défaut`);
      return SignatureType.PARTICIPANT;
  }
};

/**
 * Fonction pour déterminer automatiquement le type de signature 
 * en fonction du contexte (document, utilisateur)
 */
export const determineSignatureType = (
  documentType: DocumentType,
  isStudent: boolean = false,
  isTrainer: boolean = false
): SignatureType => {
  // Si c'est un formateur, toujours utiliser le type formateur
  if (isTrainer) {
    return SignatureType.TRAINER;
  }
  
  // Pour une convention, utiliser le type représentant pour les apprenants
  if (documentType === DocumentType.CONVENTION && isStudent) {
    return SignatureType.REPRESENTATIVE;
  }
  
  // Pour les autres documents, utiliser le type participant pour les apprenants
  if (isStudent) {
    return SignatureType.PARTICIPANT;
  }
  
  // Par défaut, retourner participant
  return SignatureType.PARTICIPANT;
};

/**
 * Fonction pour générer un nom de fichier standardisé pour une signature
 */
export const generateStandardSignatureFilename = (
  signatureType: SignatureType,
  documentType: DocumentType,
  trainingId: string,
  userId?: string
): string => {
  const timestamp = Date.now();
  
  switch (signatureType) {
    case SignatureType.PARTICIPANT:
      return `participant_${documentType}_${userId}_${timestamp}.png`;
    case SignatureType.REPRESENTATIVE:
      return `representative_${documentType}_${userId}_${timestamp}.png`;
    case SignatureType.TRAINER:
      return `trainer_${documentType}_${trainingId}_${timestamp}.png`;
    case SignatureType.COMPANY_SEAL:
      return `seal_company_${documentType}_${timestamp}.png`;
    case SignatureType.ORGANIZATION_SEAL:
      return `organization_seal_${timestamp}.png`;
    default:
      return `signature_${documentType}_${userId}_${timestamp}.png`;
  }
}; 