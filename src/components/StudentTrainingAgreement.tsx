import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import UnifiedTrainingAgreementTemplate, { 
  OrganizationSettings as TemplateOrganizationSettings 
} from './shared/templates/unified/TrainingAgreementTemplate';
import SignatureCanvas from './SignatureCanvas';
import { createPortal } from 'react-dom';
import { X, Download, CheckCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { createRoot } from 'react-dom/client';
import { DocumentManager } from './shared/DocumentManager';
import { toast } from 'react-hot-toast';
// @ts-ignore
import { Helmet } from 'react-helmet';
// @ts-ignore
import Confetti from 'react-confetti';
// @ts-ignore
import { BeatLoader } from 'react-spinners';
import { optimizeSealUrl } from '../utils/SignatureUtils';
// Utiliser l'alias pour éviter conflit
type OrganizationSettings = TemplateOrganizationSettings;

// Types
interface Company {
  id?: string;
  name: string;
  address?: string;
  postal_code?: string;
  city?: string;
  siret?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  isIndependent?: boolean;
}

// Dans la section des types, d'abord ajouter une définition de type pour les participants
interface ParticipantData {
  id: string;
  first_name: string;
  last_name: string;
  job_position?: string;
  company?: string;
  email?: string;
  status?: string;
}

// Fonction utilitaire pour parser un champ JSON qui pourrait être doublement échappé
const parseJsonField = (field: any) => {
  if (!field) return null;
  
  // Si c'est déjà un objet, le retourner tel quel
  if (typeof field === 'object') return field;
  
  // Si c'est une chaîne, essayer de la parser comme JSON
  if (typeof field === 'string') {
    try {
      // Gérer le cas où le JSON est doublement échappé (comme dans tracking_methods)
      if (field.startsWith('"') && field.endsWith('"')) {
        // Supprimer les guillemets externes et parser le contenu
        const unescapedField = field.substring(1, field.length - 1).replace(/\\"/g, '"');
        return JSON.parse(unescapedField);
      }
      
      // Parser directement si c'est un format JSON standard
      return JSON.parse(field);
    } catch (e) {
      // Ne pas logguer ici pour éviter le bruit
      // console.error('Erreur lors du parsing JSON:', e, 'field:', field);
      return null;
    }
  }
  
  return null;
};

// Définition des paramètres par défaut pour l'organisation
const DEFAULT_ORGANIZATION_SETTINGS: TemplateOrganizationSettings = {
  organization_name: 'PETITMAKER',
  address: '2 rue Héraclès',
  siret: '928 386 044 00012',
  activity_declaration_number: '32 59 10753 59',
  representative_name: 'Nicolas Cleton',
  representative_title: 'Président',
  city: 'Villeneuve-d\'Ascq',
  postal_code: '59650',
  country: 'France'
};

// Interface pour le cache global de signatures
interface SignatureCacheItem {
  participantSig: string | null;
  representativeSig?: string | null; // AJOUT: Signature du représentant pour la convention
  companySeal: string | null;
  organizationSeal: string | null;
  trainerSig: string | null;
  timestamp: number;
}

// Cache global des signatures
const GLOBAL_SIGNATURE_CACHE = {
  cache: {} as Record<string, Record<string, SignatureCacheItem>>,
  
  getCache(trainingId: string, participantId: string): SignatureCacheItem {
    if (!this.cache[trainingId]) {
      this.cache[trainingId] = {};
    }
    return this.cache[trainingId][participantId] || {};
  },
  
  setCache(trainingId: string, participantId: string, data: SignatureCacheItem): void {
    if (!this.cache[trainingId]) {
      this.cache[trainingId] = {};
    }
    const currentData = this.cache[trainingId][participantId] || {};
    this.cache[trainingId][participantId] = {
      ...currentData,
      ...data,
      timestamp: Date.now()
    };
  },
  
  preloadImages(urls: (string | null | undefined)[]): void {
    urls.filter(Boolean).forEach(url => {
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }
};

// Fonction utilitaire pour charger les signatures de façon synchrone
function loadSignaturesSync(trainingId: string, participantId: string): SignatureCacheItem {
  try {
    // console.log('⚡ [INIT] Chargement synchrone initial...'); // Log supprimé
    
    // Récupérer depuis le cache local
    const cached = GLOBAL_SIGNATURE_CACHE.getCache(trainingId, participantId);
    
    // Vérifier également dans le localStorage pour plus de robustesse
    try {
      const localStorageKey = `signatures_cache_${trainingId}_${participantId}`;
      const storedData = localStorage.getItem(localStorageKey);
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        
        // Si le cache en mémoire est vide mais qu'on a des données dans le localStorage
        if (!cached.participantSig && !cached.companySeal && 
            (parsedData.participantSig || parsedData.companySeal)) {
          // Mettre à jour le cache en mémoire avec les données du localStorage
          GLOBAL_SIGNATURE_CACHE.setCache(trainingId, participantId, parsedData);
          
          // Retourner les données du localStorage
          return parsedData;
        }
      }
    } catch (e) {
      // Ne pas logguer ici pour éviter le bruit
      // console.error('❌ [INIT] Erreur lors de la récupération depuis localStorage:', e);
    }
    
    // Précharger les images si disponibles
    if (cached.participantSig || cached.companySeal || cached.organizationSeal) {
      GLOBAL_SIGNATURE_CACHE.preloadImages([
        cached.participantSig, 
        cached.companySeal,
        cached.organizationSeal
      ]);
    }
    
    // Retourner les données du cache, en s'assurant que tous les champs sont présents
    return {
      participantSig: cached?.participantSig ?? null,
      representativeSig: cached?.representativeSig ?? null,
      companySeal: cached?.companySeal ?? null,
      trainerSig: cached?.trainerSig ?? null, // Assurer que trainerSig est inclus
      organizationSeal: cached?.organizationSeal ?? null,
      timestamp: cached?.timestamp ?? 0 // Assurer que timestamp est inclus
    };
  } catch (e) {
    // Ne pas logguer ici pour éviter le bruit
    // console.error('❌ [INIT] Erreur du chargement synchrone des signatures:', e);
    // Retourner un objet complet même en cas d'erreur
    return { 
      participantSig: null, 
      representativeSig: null,
      companySeal: null, 
      trainerSig: null,
      organizationSeal: null, 
      timestamp: 0 
    };
  }
}

interface StudentTrainingAgreementProps {
  training: {
    id: string;
    title: string;
    duration: string;
    trainer_name: string;
    trainer_id?: string;
    location: string;
    start_date: string | null;
    end_date: string | null;
    objectives?: string[];
    content?: string;
    price?: number | null;
    company_id?: string;
    evaluation_methods?: {
      profile_evaluation?: boolean;
      skills_evaluation?: boolean;
      knowledge_evaluation?: boolean;
      satisfaction_survey?: boolean;
    };
    tracking_methods?: {
      attendance_sheet?: boolean;
      completion_certificate?: boolean;
    };
    pedagogical_methods?: {
      needs_evaluation?: boolean;
      theoretical_content?: boolean;
      practical_exercises?: boolean;
      case_studies?: boolean;
      experience_sharing?: boolean;
      digital_support?: boolean;
    };
    material_elements?: {
      computer_provided?: boolean;
      pedagogical_material?: boolean;
      digital_support_provided?: boolean;
    };
  };
  participant: {
    id: string;
    first_name: string;
    last_name: string;
    job_position?: string;
    company?: string;
    has_signed_agreement?: boolean;
  };
  onCancel: () => void;
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
}

export const StudentTrainingAgreement: React.FC<StudentTrainingAgreementProps> = ({
  training,
  participant,
  onCancel,
  onDocumentOpen,
  onDocumentClose
}) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [organizationSettings, setOrganizationSettings] = useState<TemplateOrganizationSettings | null>(null);
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [showSealCanvas, setShowSealCanvas] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [signatureInProgress, setSignatureInProgress] = useState(false);
  const [sealsVerified, setSealsVerified] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Ajouter un cache global d'images pour réduire les clignotements
  const PRELOADED_IMAGES: Record<string, boolean> = {};

  // État pour stocker tous les apprenants liés à la formation
  const [allTrainingParticipants, setAllTrainingParticipants] = useState<ParticipantData[]>([]);

  // Dans la partie des déclarations d'état initiales (autour de la ligne 300)
  // Ajouter cette référence pour suivre la dernière fois que les signatures ont été chargées
  const lastSignatureLoadTimeRef = useRef<number>(0);

  // Charger immédiatement les signatures avant le premier rendu
  const initialSignatures = loadSignaturesSync(training.id, participant.id);

  // Initialiser les états AVEC les valeurs du cache (sauf représentant), en gérant les undefined
  // Déplacer CES declarations AVANT updateSignatureCache
  const [participantSignature, setParticipantSignature] = useState<string | null>(initialSignatures.participantSig ?? null);
  const [representativeSignature, setRepresentativeSignature] = useState<string | null>(null); // Représentant n'est pas dans le cache sync
  const [trainerSignature, setTrainerSignature] = useState<string | null>(initialSignatures.trainerSig ?? null);
  const [companySeal, setCompanySeal] = useState<string | null>(initialSignatures.companySeal ?? null);
  const [organizationSeal, setOrganizationSeal] = useState<string | null>(initialSignatures.organizationSeal ?? null);

  // Fonction pour mettre à jour le cache de signatures (MAINTENANT APRES LES STATES)
  const updateSignatureCache = useCallback((
    newParticipantSig?: string | null,
    newCompanySeal?: string | null,
    newOrganizationSeal?: string | null,
    newTrainerSig?: string | null
  ) => {
    // console.log('🔄 [CACHE_UPDATE] Mise à jour du cache de signatures'); // Log supprimé
    
    try {
      // Utiliser les nouvelles valeurs ou conserver les valeurs actuelles
      const updatedCache: SignatureCacheItem = {
        participantSig: newParticipantSig !== undefined ? newParticipantSig : participantSignature,
        companySeal: newCompanySeal !== undefined ? newCompanySeal : companySeal,
        organizationSeal: newOrganizationSeal !== undefined ? newOrganizationSeal : organizationSeal,
        trainerSig: newTrainerSig !== undefined ? newTrainerSig : trainerSignature,
        timestamp: Date.now()
      };
      
      // Mettre à jour le cache global
      GLOBAL_SIGNATURE_CACHE.setCache(training.id, participant.id, updatedCache);
      
      // Sauvegarder dans le localStorage
      try {
      const localStorageKey = `signatures_cache_${training.id}_${participant.id}`;
        localStorage.setItem(localStorageKey, JSON.stringify(updatedCache));
    } catch (e) {
        // console.error('❌ [CACHE_UPDATE] Erreur lors de la sauvegarde localStorage:', e); // Log supprimé
      }
      
      // console.log('✅ [CACHE_UPDATE] Cache de signatures mis à jour avec succès'); // Log supprimé
    } catch (e) {
      // console.error('❌ [CACHE_UPDATE] Erreur lors de la mise à jour du cache:', e); // Log supprimé
    }
  }, [participantSignature, companySeal, organizationSeal, trainerSignature, training.id, participant.id]);

  // AJOUT: Setter sécurisé pour representativeSignature
  const safeSetRepresentativeSignature = useCallback((url: string | null) => {
    setRepresentativeSignature(prev => url !== null ? url : prev);
  }, []);

  // SUPPRIMÉ: useEffect d'initialisation, car on initialise directement avec useState

  // Log critique pour diagnostiquer le problème initial (après initialisation)
  // console.log('🚨 [DIAGNOSTIC_CRITIQUE] États initiaux après chargement sync:', { // Log supprimé
  //   participantSig: participantSignature,
  //   representativeSig: representativeSignature,
  //   trainerSig: trainerSignature,
  //   companySeal,
  //   organizationSeal,
  // });

  const pdfContentRef = useRef<HTMLDivElement>(null);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
  const [existingDocumentUrl, setExistingDocumentUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [isOnlyTrainerSignature, setIsOnlyTrainerSignature] = useState(false);
  const documentCloseCalled = useRef(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [localSignatureDataURL, setLocalSignatureDataURL] = useState<string | null>(null);
  const [hasParticipantSignature, setHasParticipantSignature] = useState(false);
  const [signatureAction, setSignatureAction] = useState<string | null>(null);
  
  // Référence pour savoir si les signatures ont été chargées depuis Supabase
  const signaturesLoadedRef = useRef(false);
  // Référence à l'élément conteneur du document
  const documentRef = useRef<HTMLDivElement>(null);
  // Référence pour les tentatives de correction du tampon
  const sealAttemptsRef = useRef(0);
  
  // État pour protéger contre les états null qui écraseraient les signatures chargées
  const [signaturesLocked, setSignaturesLocked] = useState(!!initialSignatures.participantSig || !!initialSignatures.companySeal);

  // Ajouter les états pour la signature du formateur (vers ligne 270-280 avec les autres états)
  const [hasTrainerSignature, setHasTrainerSignature] = useState<boolean>(false);

  // --- États pour la prévisualisation PDF ---
  const [isPreviewingPdf, setIsPreviewingPdf] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  // --- Fin États prévisualisation ---

  // Effet séparé pour récupérer tous les participants de la formation
  useEffect(() => {
    const fetchAllParticipants = async () => {
      const companyName = participant.company || '';
      
      console.log('🚨🚨🚨 DÉBUT CHARGEMENT DES PARTICIPANTS POUR FORMATION', training.id);
      
      try {
        console.log(`🔍 [PARTICIPANTS] Recherche des apprenants pour l'entreprise: ${companyName}`);
           
        // MÉTHODE ULTRA-DRASTIQUE: Utiliser une nouvelle fonction SQL encore plus spécifique
        // qui retourne exactement les champs dont nous avons besoin sans RLS
        const { data: participantsData, error: participantsError } = await supabase
          .rpc('find_training_participants', {
            training_id_param: training.id
          });
        
        // Vérifier si on a des erreurs
        if (participantsError) {
          console.error('❌ [PARTICIPANTS] Erreur lors de la récupération des participants:', participantsError);
            
          // En cas d'erreur, utiliser au moins le participant actuel
          const defaultParticipant: ParticipantData = {
              id: participant.id,
              first_name: participant.first_name,
              last_name: participant.last_name,
              job_position: participant.job_position || '',
              company: participant.company || '',
              email: '',
            status: 'Inscrit'
            };
          
          setAllTrainingParticipants([defaultParticipant]);
          return;
        }
        
        if (participantsData && participantsData.length > 0) {
          console.log(`✅ [PARTICIPANTS] ${participantsData.length} apprenants trouvés pour la formation`);
          
          // Transformer les données dans le bon format avec un typage explicite
          const formattedParticipants: ParticipantData[] = participantsData.map((p: any) => ({
            id: p.id,
            first_name: p.first_name || '',
            last_name: p.last_name || '',
            job_position: p.job_position || '',
            company: p.company || '',
            email: p.email || '',
            status: p.status || 'Inscrit'
          }));
        
          // S'assurer que l'apprenant actuel est toujours présent dans la liste si son entreprise correspond
        const currentParticipantIncluded = formattedParticipants.some(p => p.id === participant.id);
        
          if (!currentParticipantIncluded && participant.company && 
              participant.company.toLowerCase().includes(companyName.toLowerCase())) {
            console.log('➕ [PARTICIPANTS] Ajout du participant actuel (même entreprise) qui n\'était pas dans la liste');
          
            const currentParticipant: ParticipantData = {
            id: participant.id,
            first_name: participant.first_name,
            last_name: participant.last_name,
            job_position: participant.job_position || '',
            company: participant.company || '',
            email: '',
            status: 'Inscrit'
            };
            
            formattedParticipants.push(currentParticipant);
          }
          
        setAllTrainingParticipants(formattedParticipants);
        console.log('🚨🚨🚨 PARTICIPANTS CHARGÉS:', JSON.stringify(formattedParticipants));
        console.log('🚨🚨🚨 NOMBRE DE PARTICIPANTS:', formattedParticipants.length);
        } else {
          console.log(`⚠️ [PARTICIPANTS] Aucun apprenant trouvé pour l'entreprise ${companyName}`);
          console.log('🚨🚨🚨 AUCUN PARTICIPANT TROUVÉ DANS LA REQUÊTE');
          
          // Si aucun participant n'est trouvé et que le participant actuel est de cette entreprise
          if (participant.company && participant.company.toLowerCase().includes(companyName.toLowerCase())) {
          const defaultParticipant: ParticipantData = {
            id: participant.id,
            first_name: participant.first_name,
            last_name: participant.last_name,
            job_position: participant.job_position || '',
            company: participant.company || '',
            email: '',
            status: 'Inscrit'
          };
          
            console.log('➕ [PARTICIPANTS] Utilisation du participant actuel (même entreprise)');
          setAllTrainingParticipants([defaultParticipant]);
          } else {
            // Si le participant actuel n'est pas de cette entreprise, liste vide
            console.log('⚠️ [PARTICIPANTS] Le participant actuel n\'est pas de l\'entreprise associée à la formation');
            setAllTrainingParticipants([]);
          }
        }
      } catch (error) {
        console.error('❌ [PARTICIPANTS] Erreur générale lors de la récupération des participants:', error);
        console.log('🚨🚨🚨 ERREUR CRITIQUE LORS DU CHARGEMENT DES PARTICIPANTS:', error);
        
        // Fallback au participant actuel
        const defaultParticipant: ParticipantData = {
          id: participant.id,
          first_name: participant.first_name,
          last_name: participant.last_name,
          job_position: participant.job_position || '',
          company: participant.company || '',
          email: '',
          status: 'Inscrit'
        };
        
        setAllTrainingParticipants([defaultParticipant]);
      }
+      
+      console.log('🚨🚨🚨 FIN CHARGEMENT DES PARTICIPANTS');
    };
    
    fetchAllParticipants();
  }, [training.id, training.company_id, participant.id, participant.first_name, participant.last_name, participant.job_position, participant.company]);

  // Wrapper pour setParticipantSignature qui protège contre les nulls indésirables
  const safeSetParticipantSignature = useCallback((value: string | null) => {
    if (value || !signaturesLocked) {
      setParticipantSignature(value);
    } else {
      // console.log('🔒 [PROTECT] Tentative de définir participantSignature à null bloquée'); // Log supprimé
    }
  }, [signaturesLocked]);

  // Ajouter la fonction pour mettre à jour le tampon d'entreprise de manière sécurisée
  const safeSetCompanySeal = useCallback((value: string | null) => {
    if (value || !signaturesLocked) {
      setCompanySeal(value);
    } else {
      // console.log('🔒 [PROTECT] Set companySeal to null blocked'); // Log supprimé
    }
  }, [signaturesLocked]);

  // Ajouter la fonction pour mettre à jour le tampon d'organisme de manière sécurisée
  const safeSetOrganizationSeal = useCallback((value: string | null) => {
    if (value || !signaturesLocked) {
      setOrganizationSeal(value);
    } else {
      // console.log('🔒 [PROTECT] Set organizationSeal to null blocked'); // Log supprimé
    }
  }, [signaturesLocked]);

  // Ajouter la fonction pour mettre à jour la signature du formateur de manière sécurisée
  const safeSetTrainerSignature = useCallback((url: string | null) => {
    // console.log('🔒 [TRAINER] Mise à jour sécurisée de la signature du formateur:', url ? `${url.substring(0, 50)}...` : 'null'); // Log supprimé
    setTrainerSignature(url);
    setHasTrainerSignature(!!url);
  }, []);

  // Effet pour charger les signatures depuis Supabase (asynchrone, après le premier rendu)
  useEffect(() => {
    const loadSignaturesFromSupabase = async () => {
      if (signaturesLoadedRef.current) {
        return;
      }
      
      try {
        console.log('🔄 [SUPABASE] Chargement des signatures depuis Supabase:', {
          training_id: training.id,
          type: 'convention'
        });
        
        // Récupérer toutes les signatures pour cette formation et ce type de document
        let documentsData = [];
        
        // 1. Chercher tous les documents pour cette formation, y compris les signatures
        const { data: documentData, error: documentsError } = await supabase
          .from('documents')
          .select('*')
          .eq('training_id', training.id)
          .eq('type', 'convention')
          .order('created_at', { ascending: false });
          
        if (documentData && documentData.length > 0) {
          documentsData = documentData;
          console.log(`✅ [DOCUMENTS] ${documentData.length} documents trouvés pour la formation`);
        } else {
          console.log(`⚠️ [DOCUMENTS] Aucun document trouvé pour la formation id=${training.id}`);
        }
          
        // Chercher spécifiquement le tampon de l'organisation (qui peut être sans training_id)
        const { data: orgSealData, error: orgSealError } = await supabase
          .from('documents')
          .select('*')
          .is('training_id', null)
          .eq('signature_type', 'organizationSeal')
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (orgSealData && orgSealData.length > 0) {
          console.log(`✅ [DOCUMENTS] Tampon d'organisation global trouvé`);
          documentsData = [...(documentsData || []), ...orgSealData];
        }
        
        // Si l'entreprise est définie, chercher aussi les signatures partagées pour le tampon de l'entreprise
        if (company && company.id) {
          // Récupérer les tampons d'entreprise pour cette formation et cette entreprise
          const { data: sharedDocs, error: sharedError } = await supabase
            .from('documents')
            .select('*')
            .eq('training_id', training.id)
            .eq('company_id', company.id)
            .eq('type', 'convention')
            .in('signature_type', ['companySeal'])
            .order('created_at', { ascending: false });
          
          if (!sharedError && sharedDocs && sharedDocs.length > 0) {
            // Ajouter les signatures partagées aux documents personnels
            documentsData = [...(documentsData || []), ...sharedDocs];
            console.log(`✅ [COMPANY_SEAL] ${sharedDocs.length} tampons d'entreprise trouvés`);
          }
        } 
      
        if (documentsError) {
          console.error('❌ [DOCUMENTS] Erreur lors de la récupération des documents:', documentsError);
            return;
          }
        
        if (!documentsData || documentsData.length === 0) {
            console.log('⚠️ [DOCUMENTS] Aucun document trouvé après fusion');
            return;
          }

        console.log(`🔍 [DEBUG] Traitement de ${documentsData.length} documents pour les signatures`);
          
          // Traiter les données de la table documents
        let participantSigUrl: string | null = null; // On ne cherche plus la signature participant ici
        let representativeSigUrl: string | null = null; 
        let companySealUrl: string | null = null;
        let trainerSigUrl: string | null = null;
        let organizationSealUrl: string | null = null;
        
        // Vérifier quels types de signatures sont présents dans les données
        const signatureTypes = documentsData.map(doc => doc.signature_type);
        console.log('🔍 [DEBUG] Types de signatures disponibles:', [...new Set(signatureTypes)].filter(Boolean));
          
          for (const doc of documentsData) {
            if (!doc.file_url) continue;
            
            const baseUrl = doc.file_url.split('?')[0];
            const timestamp = Date.now();
            const antiCacheUrl = `${baseUrl}?t=${timestamp}&forcereload=true`;
            
          // MODIFIÉ: Chercher la signature du représentant sans vérifier company_id
          if (doc.signature_type === 'representative') {
            if (!representativeSigUrl) {
              representativeSigUrl = antiCacheUrl;
              console.log('✅ [DEBUG] Representative signature document FOUND in loop', antiCacheUrl);
            }
          } else if ((doc.signature_type === 'companySeal' || doc.title === "Tampon de l'entreprise") && company?.id) {
            // Permettre un sceau d'entreprise même sans company_id correspondant
            if (!companySealUrl) {
              companySealUrl = antiCacheUrl;
              console.log('✅ [DEBUG] Company seal FOUND', antiCacheUrl);
            }
          } else if (doc.signature_type === 'trainer' || doc.title === "Signature du formateur") {
            if (!trainerSigUrl) {
              trainerSigUrl = antiCacheUrl;
              console.log('✅ [DEBUG] Trainer signature FOUND', antiCacheUrl);
            }
          } else if (doc.signature_type === 'organizationSeal' || doc.title === "Tampon de l'organisme") {
            if (!organizationSealUrl) {
              organizationSealUrl = antiCacheUrl;
              console.log('✅ [DEBUG] Organization seal FOUND in documents table', antiCacheUrl);
              // Force reload for organization seal to ensure it's visible
              const forceReloadUrl = `${doc.file_url.split('?')[0]}?t=${Date.now()}&forcereload=true&nocache=${Math.random()}`;
              organizationSealUrl = forceReloadUrl;
            }
          }
        }
          
        // Si le tampon de l'organisme n'a pas été trouvé dans les documents, essayer de le récupérer depuis settings
        if (!organizationSealUrl) {
          console.log('🔍 [ORG_SEAL] Tampon non trouvé dans documents, recherche dans la table settings...');
          try {
            const { data: settingsData, error: settingsError } = await supabase
              .from('settings')
              .select('organization_seal_url, organization_seal_path')
              .single();
            
            if (settingsError) {
              console.error('❌ [ORG_SEAL] Erreur lors de la recherche dans settings:', settingsError);
            } else if (settingsData && settingsData.organization_seal_url) {
              console.log('✅ [ORG_SEAL] Tampon trouvé dans settings, URL:', settingsData.organization_seal_url);
              
              // Ajouter un anti-cache à l'URL avec plus de paramètres pour éviter tout problème de cache
              const timestamp = Date.now();
              const random = Math.random();
              organizationSealUrl = `${settingsData.organization_seal_url.split('?')[0]}?t=${timestamp}&forcereload=true&nocache=${random}`;
              
              // Test d'accessibilité de l'URL
              try {
                const testImg = new Image();
                testImg.onload = () => {
                  console.log('✅ [ORG_SEAL] Test d\'accès au tampon réussi:', organizationSealUrl);
                  // SUPPRIMÉ: Mise à jour forcée du DOM ici
                };
                testImg.onerror = () => {
                  console.error('❌ [ORG_SEAL] Test d\'accès au tampon échoué:', organizationSealUrl);
                };
                testImg.src = organizationSealUrl;
              } catch (testError) {
                console.error('❌ [ORG_SEAL] Erreur lors du test d\'accès au tampon:', testError);
              }
            } else if (settingsData && settingsData.organization_seal_path) {
              // Si nous avons un chemin mais pas d'URL, générer l'URL
              console.log('🔍 [ORG_SEAL] Génération d\'URL à partir du chemin:', settingsData.organization_seal_path);
              
              const { data: urlData } = await supabase.storage
                .from('organization-seals')
                .getPublicUrl(settingsData.organization_seal_path);
              
              if (urlData && urlData.publicUrl) {
                // Ajouter un anti-cache à l'URL
                const timestamp = Date.now();
                organizationSealUrl = `${urlData.publicUrl.split('?')[0]}?t=${timestamp}&forcereload=true`;
                console.log('✅ [ORG_SEAL] URL générée à partir du chemin:', organizationSealUrl);
              } else {
                console.error('❌ [ORG_SEAL] Impossible de générer une URL publique pour le chemin');
              }
            } else {
              console.log('⚠️ [ORG_SEAL] Aucune information de tampon trouvée dans settings');
              
              // Dernière tentative: chercher directement dans le bucket organization-seals
              console.log('🔍 [ORG_SEAL] Recherche directe dans le bucket organization-seals');
              
              const { data: sealFiles, error: sealListError } = await supabase.storage
                .from('organization-seals')
                .list('', { 
                  sortBy: { column: 'created_at', order: 'desc' },
                  limit: 1
                });
                
              if (sealListError) {
                console.error('❌ [ORG_SEAL] Erreur lors de la recherche dans le bucket:', sealListError);
              } else if (sealFiles && sealFiles.length > 0) {
                const sealFile = sealFiles[0];
                console.log('✅ [ORG_SEAL] Fichier trouvé dans le bucket:', sealFile.name);
                
                const { data: urlData } = await supabase.storage
                  .from('organization-seals')
                  .getPublicUrl(sealFile.name);
                  
                if (urlData && urlData.publicUrl) {
            const timestamp = Date.now();
                  organizationSealUrl = `${urlData.publicUrl.split('?')[0]}?t=${timestamp}&forcereload=true`;
                  console.log('✅ [ORG_SEAL] URL générée depuis le bucket:', organizationSealUrl);
                }
              } else {
                console.log('⚠️ [ORG_SEAL] Aucun fichier trouvé dans le bucket organization-seals');
              }
            }
          } catch (settingsErr) {
            console.error('❌ [ORG_SEAL] Exception lors de la recherche dans settings:', settingsErr);
          }
        }
          
        // Mettre à jour les états si on a trouvé des signatures/tampons
        
        // AJOUT: Mettre à jour l'état de la signature du représentant
        if (representativeSigUrl) {
          safeSetRepresentativeSignature(representativeSigUrl);
          console.log('✅ [DEBUG] safeSetRepresentativeSignature CALLED with URL:', representativeSigUrl);
          setIsSigned(true); // Considérer comme signé si le représentant a signé
        }
        
        if (companySealUrl) {
          safeSetCompanySeal(companySealUrl);
          console.log('✅ [DEBUG] safeSetCompanySeal CALLED with URL:', companySealUrl);
        }
        
        if (trainerSigUrl) {
          safeSetTrainerSignature(trainerSigUrl);
          console.log('✅ [DEBUG] safeSetTrainerSignature CALLED with URL:', trainerSigUrl);
          setHasTrainerSignature(true);
        }
        
        if (organizationSealUrl) {
          console.log('✅ [ORG_SEAL] Mise à jour du tampon de l\'organisme avec URL:', organizationSealUrl);
          safeSetOrganizationSeal(organizationSealUrl);
        } else {
          console.error('❌ [ORG_SEAL] Échec de toutes les tentatives de récupération du tampon de l\'organisme');
        }
          
        // Mettre à jour le cache global et localStorage (MODIFIÉ)
        if (representativeSigUrl || companySealUrl || trainerSigUrl || organizationSealUrl) {
          const cacheData: SignatureCacheItem = {
            participantSig: null, // Participant ne signe pas la convention
            representativeSig: representativeSigUrl, 
          companySeal: companySealUrl,
            trainerSig: trainerSigUrl,
            organizationSeal: organizationSealUrl,
            timestamp: Date.now()
          };
          
          GLOBAL_SIGNATURE_CACHE.setCache(training.id, participant.id, cacheData);
        
        // Mettre à jour le localStorage
        try {
          const localStorageKey = `signatures_cache_${training.id}_${participant.id}`;
          localStorage.setItem(localStorageKey, JSON.stringify(cacheData));
            // SUPPRIMÉ: Log cache
        } catch (e) {
            console.error('❌ [CACHE] Erreur lors de la mise à jour du cache:', e);
          }
      
          // SUPPRIMÉ: Rafraîchissement forcé
        } else {
          // console.log('⚠️ [SIGNATURES] Aucune signature ni tampon trouvé'); // Log conservé pour info
        }
      } catch (error) {
        console.error('❌ [GLOBAL] Erreur lors du chargement des signatures:', error);
      } finally {
        signaturesLoadedRef.current = true;
      }
    };
    
    // Lancer le chargement asynchrone
    loadSignaturesFromSupabase();
  }, [training.id, participant.id, safeSetParticipantSignature, safeSetCompanySeal, safeSetOrganizationSeal, organizationSeal, company, trainerSignature, safeSetRepresentativeSignature]);

  // Moniteur d'état des signatures SIMPLIFIÉ
  useEffect(() => {
    // console.log('👁️ [MONITOR] État actuel:', { // Log supprimé
    //   Représentant: representativeSignature ? '✅' : '❌',
    //   TamponEnt: companySeal ? '✅' : '❌',
    //   Formateur: trainerSignature ? '✅' : '❌',
    //   TamponOrg: organizationSeal ? '✅' : '❌'
    // });
  }, [representativeSignature, companySeal, trainerSignature, organizationSeal]);

  // Ajouter une fonction pour charger la signature du formateur depuis Supabase
  const loadTrainerSignature = async () => {
    try {
      // console.log('🔄', '[TRAINER]', 'Chargement signature formateur...'); // Log supprimé
      
      // Récupérer d'abord depuis la table documents
      const { data: trainerDocs, error: docsError } = await supabase
        .from('documents')
        .select('file_url')
        .eq('title', 'Signature du formateur')
        .eq('training_id', training.id)
        .eq('type', 'convention')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (docsError) {
        // console.error('❌ [TRAINER] ERROR', 'Erreur recherche documents:', docsError); // Log supprimé
      } else if (trainerDocs && trainerDocs.length > 0 && trainerDocs[0].file_url) {
        // console.log('✅', '[TRAINER]', 'Signature formateur trouvée dans documents'); // Log supprimé
        // console.log('✅ [TRAINER] Signature du formateur trouvée dans documents:', trainerDocs[0].file_url.substring(0, 50) + '...'); // Log supprimé
        
        // Ajouter un anti-cache à l'URL
        const baseUrl = trainerDocs[0].file_url.split('?')[0];
        const timestamp = Date.now();
        const antiCacheUrl = `${baseUrl}?t=${timestamp}&forcereload=true`;
        
        // Mettre à jour l'état
        safeSetTrainerSignature(antiCacheUrl);
        
        // Mettre à jour le cache
        updateSignatureCache(undefined, undefined, undefined, antiCacheUrl);
        
        return;
      }
      
      // En dernier recours, rechercher dans le bucket signatures
        const { data: storageFiles, error: storageError } = await supabase.storage
          .from('signatures')
          .list('', { 
          search: `trainer_convention_${training.id}`,
            sortBy: { column: 'created_at', order: 'desc' }
          });
        
        if (storageError) {
        // console.error('❌ [TRAINER] ERROR', 'Erreur recherche bucket:', storageError); // Log supprimé
        } else if (storageFiles && storageFiles.length > 0) {
        const sigFile = storageFiles[0];
        // Générer l'URL du fichier trouvé
            const { data: urlData } = await supabase.storage
              .from('signatures')
          .getPublicUrl(sigFile.name);
            
            if (urlData && urlData.publicUrl) {
          // console.log('✅ [TRAINER]', 'Signature formateur trouvée dans le bucket:', urlData.publicUrl.substring(0, 50) + '...'); // Log supprimé
          
          // Ajouter un anti-cache à l'URL
          const baseUrl = urlData.publicUrl.split('?')[0];
          const timestamp = Date.now();
          const antiCacheUrl = `${baseUrl}?t=${timestamp}&forcereload=true`;
          
          // Mettre à jour l'état
          safeSetTrainerSignature(antiCacheUrl);
          
          // Mettre à jour le cache
          updateSignatureCache(undefined, undefined, undefined, antiCacheUrl);
          
          return;
        }
      }
      
      // console.warn('ℹ️ [TRAINER] Aucune signature de formateur trouvée pour cette formation'); // Log supprimé
      
    } catch (error) {
      // console.error('❌ [TRAINER] ERROR', 'Erreur chargement signature formateur:', error); // Log supprimé
    }
  };

  // Ajouter un useEffect pour charger la signature du formateur
  useEffect(() => {
    // Charger depuis le cache d'abord
    if (initialSignatures.trainerSig) {
      // console.log('✅', '[INIT]', 'Signature formateur trouvée cache local'); // Log supprimé
      safeSetTrainerSignature(initialSignatures.trainerSig);
    } else {
      // Charger depuis Supabase si pas dans le cache
      loadTrainerSignature();
    }
  }, [training.id, safeSetTrainerSignature, initialSignatures.trainerSig]);

  // Effet doublon de chargement des signatures supprimé

  // Effet pour vérifier l'accessibilité des tampons dès le chargement
  useEffect(() => {
    const verifySeals = async () => {
      const currentCompanySeal = companySeal;
      const currentOrganizationSeal = organizationSeal;
      
      if (currentCompanySeal || currentOrganizationSeal) {
        // console.log('🔍 [INIT] Verifying seal accessibility'); // Log supprimé
        
        try {
          const { checkSealAccess } = await import('../utils/SignatureUtils');
          
          const { 
            companySeal: optimizedCompanySeal, 
            organizationSeal: optimizedOrgSeal, 
            diagnosticMessage 
          } = await checkSealAccess({
            companySeal: currentCompanySeal,
            organizationSeal: currentOrganizationSeal
          });
          
          // console.log(`🔍 [INIT] Seal diagnostic:`, diagnosticMessage); // Log supprimé
          
          // Fonction pour extraire l'URL de base sans les paramètres
          const getBaseUrl = (url: string | null | undefined): string | null => {
            if (!url) return null;
            return url.split('?')[0];
          };
          
          const currentCompanySealBase = getBaseUrl(currentCompanySeal);
          const optimizedCompanySealBase = getBaseUrl(optimizedCompanySeal);
          const currentOrganizationSealBase = getBaseUrl(currentOrganizationSeal);
          const optimizedOrgSealBase = getBaseUrl(optimizedOrgSeal);

          // Comparer les URLs de base
          if (optimizedCompanySealBase && optimizedCompanySealBase !== currentCompanySealBase) {
            // console.log('🔄 [INIT] Updating company seal URL (base different)'); // Log supprimé
            safeSetCompanySeal(optimizedCompanySeal); // Utiliser l'URL optimisée complète (avec timestamp)
          } else {
             // console.log('✅ [INIT] Company seal base URL up-to-date or unchanged'); // Log supprimé
          }
          
          // Comparer les URLs de base
          if (optimizedOrgSealBase && optimizedOrgSealBase !== currentOrganizationSealBase) {
            // console.log('🔄 [INIT] Updating organization seal URL (base different)'); // Log supprimé
            safeSetOrganizationSeal(optimizedOrgSeal); // Utiliser l'URL optimisée complète (avec timestamp)
          } else {
             // console.log('✅ [INIT] Organization seal base URL up-to-date or unchanged'); // Log supprimé
          }
          
          setSealsVerified(true);
          
    } catch (error) {
          // console.error('❌ [ERROR] Error verifying seals:', error); // Log supprimé
          setSealsVerified(true); // Avoid loop on error
        }
      }
    };
    
    verifySeals();
  }, [companySeal, organizationSeal, safeSetCompanySeal, safeSetOrganizationSeal]);

  useEffect(() => {
    // Créer un élément div pour le portail s'il n'existe pas déjà
    const existingPortal = document.getElementById('training-agreement-portal');
    if (existingPortal) {
      setPortalElement(existingPortal);
    } else {
      const newPortalElement = document.createElement('div');
      newPortalElement.id = 'training-agreement-portal';
      document.body.appendChild(newPortalElement);
      setPortalElement(newPortalElement);
    }

    // Appeler onDocumentOpen si fourni
    if (onDocumentOpen) {
      onDocumentOpen();
    }
    
    // Désactiver le cache des images pour les signatures
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Cache-Control';
    meta.content = 'no-cache, no-store, must-revalidate';
    document.head.appendChild(meta);
    
    const pragmaMeta = document.createElement('meta');
    pragmaMeta.httpEquiv = 'Pragma';
    pragmaMeta.content = 'no-cache';
    document.head.appendChild(pragmaMeta);
    
    const expiresMeta = document.createElement('meta');
    expiresMeta.httpEquiv = 'Expires';
    expiresMeta.content = '0';
    document.head.appendChild(expiresMeta);

    // Configurer les options de visualisation pour les images externes
    document.querySelectorAll('img').forEach(img => {
      img.setAttribute('crossorigin', 'anonymous');
      
      // Si c'est une signature, appliquer des attributs supplémentaires
      if (img.src.includes('signatures/') || img.alt?.toLowerCase().includes('signature')) {
        img.setAttribute('loading', 'eager');
        img.setAttribute('decoding', 'async');
        img.style.visibility = 'visible';
        img.style.display = 'block';
      }
    });

    // Cleanup function
    return () => {
      // Appeler onDocumentClose si fourni et s'il n'a pas déjà été appelé
      if (onDocumentClose && !documentCloseCalled.current) {
        documentCloseCalled.current = true;
        onDocumentClose();
      }
      
      // Nettoyer les meta tags
      document.querySelectorAll('meta[http-equiv="Cache-Control"]').forEach(el => el.remove());
      document.querySelectorAll('meta[http-equiv="Pragma"]').forEach(el => el.remove());
      document.querySelectorAll('meta[http-equiv="Expires"]').forEach(el => el.remove());
      
      const portal = document.getElementById('training-agreement-portal');
      if (portal && portal.childNodes.length === 0) {
        portal.remove();
      }
    };
  }, []);

  // Effet pour récupérer les données de l'entreprise et de l'organisme
  useEffect(() => {
    const fetchCompanyAndSettings = async () => {
      try {
        // Récupérer les paramètres de l'organisme de formation
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('*')
          .single();

        if (settingsError) {
          // console.error('Erreur lors de la récupération des paramètres:', settingsError); // Log supprimé
        } else if (settingsData) {
          // Transformer les données dans le format attendu par le template
          const formattedSettings: OrganizationSettings = {
            organization_name: settingsData.company_name || 'PETITMAKER',
            siret: settingsData.siret || '928 386 044 00012',
            address: settingsData.address || '2 rue Héraclès',
            postal_code: settingsData.postal_code || '59650',
            city: settingsData.city || 'Villeneuve-d\'Ascq',
            country: settingsData.country || 'France',
            representative_name: 'Nicolas Cleton',
            representative_title: 'Président',
            activity_declaration_number: settingsData.training_number || '32 59 10753 59',
            // organization_seal_url: settingsData.organization_seal_url // Propriété supprimée car non existante dans le type importé
          };
          setOrganizationSettings(formattedSettings);
        }

        // Récupérer les données complètes de la formation pour corriger les problèmes de format des données
        const { data: fullTrainingData, error: fullTrainingError } = await supabase
          .from('trainings')
          .select('*')
          .eq('id', training.id)
          .single();
        
        if (fullTrainingError) {
          // console.error('Erreur lors de la récupération des données complètes de la formation:', fullTrainingError); // Log supprimé
        } else if (fullTrainingData) {
          // console.log('✅ [DATA] Données complètes de la formation récupérées:', fullTrainingData); // Log supprimé
          // console.log('✅ [PRICE] Prix récupéré:', fullTrainingData.price); // Log supprimé
          
          // S'assurer que le prix est bien un nombre ou null
          const price = fullTrainingData.price !== undefined ? 
            (typeof fullTrainingData.price === 'string' ? parseFloat(fullTrainingData.price) : fullTrainingData.price) : 
            null;
          
          // Parser correctement les données qui sont parfois stockées sous forme de chaînes JSON
          const parsedTraining = {
            ...training,
            price: price,
            objectives: parseJsonField(fullTrainingData.objectives) || training.objectives,
            evaluation_methods: parseJsonField(fullTrainingData.evaluation_methods) || training.evaluation_methods,
            tracking_methods: parseJsonField(fullTrainingData.tracking_methods) || training.tracking_methods,
            pedagogical_methods: parseJsonField(fullTrainingData.pedagogical_methods) || training.pedagogical_methods,
            material_elements: parseJsonField(fullTrainingData.material_elements) || training.material_elements,
          };
          
          // console.log('🔄 [DATA] Données de formation parsées:', parsedTraining); // Log supprimé
          // console.log('🔄 [PRICE] Prix après parsing:', parsedTraining.price); // Log supprimé
          
          // Mise à jour directe des propriétés de l'objet training
          Object.assign(training, parsedTraining);
        }

        // Récupérer les informations sur la société associée à la formation
        if (training.company_id) {
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', training.company_id)
            .single();

          if (companyError) {
            // console.error('Erreur lors de la récupération de la société:', companyError); // Log supprimé
            
            // Si pas de company_id mais que le participant a une entreprise renseignée, essayer de la trouver
            if (participant.company) {
              // console.log('🔍 [DEBUG] Pas de company_id trouvée, recherche par nom:', participant.company); // Log supprimé
              
              const { data: companyByNameData, error: companyByNameError } = await supabase
                .from('companies')
                .select('*')
                .ilike('name', `%${participant.company}%`)
                .limit(1)
                .single();
              
              if (companyByNameError) {
                // console.warn('⚠️ [WARN] Entreprise non trouvée par nom:', companyByNameError); // Log supprimé
                
                // Créer une entreprise de base à partir du nom
                setCompany({
                  name: participant.company,
                  address: participant.company ? 'Adresse non renseignée' : 'À compléter',
                  postal_code: '',
                  city: '',
                  siret: participant.company ? 'SIRET non renseigné' : 'À compléter'
                });
              } else if (companyByNameData) {
                // console.log('✅ [SUCCESS] Entreprise trouvée par nom:', companyByNameData); // Log supprimé
                setCompany(companyByNameData);
              }
            } else {
              // Si pas d'entreprise renseignée, utiliser une valeur par défaut
              setCompany({
                name: 'À compléter',
                address: 'À compléter',
                postal_code: '',
                city: '',
                siret: 'À compléter'
              });
            }
          } else if (companyData) {
            setCompany(companyData);
          }
        } else if (participant.company) {
          // Si pas de company_id mais que le participant a une entreprise renseignée, essayer de la trouver
          // console.log('🔍 [DEBUG] Pas de company_id, recherche par nom:', participant.company); // Log supprimé
          
          const { data: companyByNameData, error: companyByNameError } = await supabase
            .from('companies')
            .select('*')
            .ilike('name', `%${participant.company}%`)
            .limit(1)
            .single();
          
          if (companyByNameError) {
            // console.warn('⚠️ [WARN] Entreprise non trouvée par nom:', companyByNameError); // Log supprimé
            
            // Créer une entreprise de base à partir du nom
            setCompany({
              name: participant.company,
              address: participant.company ? 'Adresse non renseignée' : 'À compléter',
              postal_code: '',
              city: '',
              siret: participant.company ? 'SIRET non renseigné' : 'À compléter'
            });
          } else if (companyByNameData) {
            // console.log('✅ [SUCCESS] Entreprise trouvée par nom:', companyByNameData); // Log supprimé
            setCompany(companyByNameData);
          }
        } else {
          // Si pas d'entreprise renseignée, utiliser une valeur par défaut
          setCompany({
            name: 'À compléter',
            address: 'À compléter',
            postal_code: '',
            city: '',
            siret: 'À compléter'
          });
                      }
                    } catch (error) {
        // console.error('Erreur lors de la récupération des données:', error); // Log supprimé
                    }
                  };
                  
                  fetchCompanyAndSettings();
  }, [training.company_id, participant.company]);

  // Lors de la signature locale
  const handleSignatureComplete = (dataURL: string) => {
    setLocalSignatureDataURL(dataURL);
    setHasParticipantSignature(true);
  };

  const generatePDF = async () => {
    if (!pdfContentRef.current) {
        console.error("❌ [PDF_GEN] Référence pdfContentRef non trouvée.");
        toast.error('Erreur : impossible de trouver le contenu du document.');
        return;
    }
    if (isGeneratingPDF) {
        console.log("⏳ [PDF_GEN] Génération déjà en cours.");
        return;
    }

    console.log("🚀 [PDF_GEN] Déclenchement de la génération PDF...");
    setIsGeneratingPDF(true);
    toast.loading('Génération du PDF en cours...', { id: 'pdf-gen-toast' });

    try {
        const elementToRender = pdfContentRef.current;
        
        const pdfOptions = {
            margin: 10,
            filename: `Convention_${participant.first_name}_${participant.last_name}_${training.title.replace(/\\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { 
                scale: 2, 
                logging: true, 
                useCORS: true,
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } 
        };
        
        console.log("📄 [PDF_GEN] Options html2pdf:", JSON.stringify(pdfOptions, null, 2));

        console.log("⏳ [PDF_GEN] Appel de html2pdf...");
        const pdfBlob: Blob = await html2pdf().set(pdfOptions).from(elementToRender).outputPdf('blob');
        console.log("✅ [PDF_GEN] Blob PDF généré, taille:", pdfBlob.size);

        // --- Activer la prévisualisation ---
        console.log("👁️ [PDF_PREVIEW] Création de l'URL Blob pour la prévisualisation...");
        const url = URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(url); // Stocker l'URL pour l'iframe
        setIsPreviewingPdf(true); // Activer le mode prévisualisation
        console.log("👁️ [PDF_PREVIEW] Mode prévisualisation activé.");

        toast.success('PDF prêt pour prévisualisation !', { id: 'pdf-gen-toast' });
        console.log("✅ [PDF_GEN] Processus terminé avec succès (prévisualisation).");

    } catch (error) {
        console.error("❌ [PDF_GEN] Erreur lors de la génération pour prévisualisation:", error);
        toast.error('Erreur lors de la génération du PDF.', { id: 'pdf-gen-toast' });
        console.log("❌ [PDF_GEN] Processus terminé avec erreur.");
        setPdfPreviewUrl(null);
        setIsPreviewingPdf(false);
    } finally {
        setIsGeneratingPDF(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: fr });
    } catch (e) {
      // console.error('Erreur de formatage de date:', e); // Log supprimé
      return dateString;
    }
  };

  const getCurrentDate = () => {
    return format(new Date(), 'dd MMMM yyyy', { locale: fr });
  };

  const getTrainingDates = () => {
    const startDate = formatDate(training.start_date);
    const endDate = formatDate(training.end_date);
    
    if (startDate && endDate) {
      if (startDate === endDate) {
        return `Le ${startDate}`;
      }
      return `Du ${startDate} au ${endDate}`;
    }
    return 'Dates à définir';
  };

  const getObjectives = () => {
    // Gérer les différents formats d'objectifs possibles
    if (Array.isArray(training.objectives) && training.objectives.length > 0) {
      return training.objectives;
    }
    
    if (typeof training.objectives === 'string') {
      try {
        // Tenter de parser si c'est un JSON stringifié
        const parsed = JSON.parse(training.objectives);
        if (Array.isArray(parsed)) {
          return parsed;
        } else if (typeof parsed === 'object') {
          // Si c'est un objet, extraire ses valeurs
          return Object.values(parsed).filter(v => !!v);
        }
        // Sinon, traiter comme une chaîne
        return [training.objectives];
      } catch {
        // Si ce n'est pas du JSON valide, traiter comme une chaîne simple
        return [training.objectives];
      }
    }
    
    return ['Objectifs à définir'];
  };

  const getEvaluationMethods = () => {
    const methods = [];
    const evals = training.evaluation_methods || {};
    
    if (evals.profile_evaluation) methods.push('Évaluation de profil');
    if (evals.skills_evaluation) methods.push('Évaluation des compétences');
    if (evals.knowledge_evaluation) methods.push('Évaluation des connaissances');
    if (evals.satisfaction_survey) methods.push('Questionnaire de satisfaction');
    
    return methods.length > 0 ? methods : ['Méthode d\'évaluation à définir'];
  };

  const getPedagogicalMethods = () => {
    const methods = [];
    const pedagogy = training.pedagogical_methods || {};
    
    if (pedagogy.needs_evaluation) methods.push('Évaluation des besoins');
    if (pedagogy.theoretical_content) methods.push('Contenu théorique');
    if (pedagogy.practical_exercises) methods.push('Exercices pratiques');
    if (pedagogy.case_studies) methods.push('Études de cas');
    if (pedagogy.experience_sharing) methods.push('Partage d\'expérience');
    if (pedagogy.digital_support) methods.push('Support numérique');
    
    return methods.length > 0 ? methods : ['Méthodes pédagogiques à définir'];
  };

  const getMaterialElements = () => {
    const elements = [];
    const material = training.material_elements || {};
    
    if (material.computer_provided) elements.push('Ordinateur fourni');
    if (material.pedagogical_material) elements.push('Support pédagogique');
    if (material.digital_support_provided) elements.push('Support numérique fourni');
    
    return elements.length > 0 ? elements : ['Éléments matériels à définir'];
  };

  // Fonction pour trouver les signatures dans le document
  const findSignatureImagesInDocument = (): { participantImage?: HTMLImageElement; representativeImage?: HTMLImageElement } => {
    const result: { participantImage?: HTMLImageElement; representativeImage?: HTMLImageElement } = {};
    
    if (!pdfContentRef.current) {
      // console.log('🔍 [DEBUG] pdfContentRef est null, impossible de chercher les signatures'); // Log supprimé
      return result;
    }
    
    // Rechercher avec les sélecteurs les plus précis en premier
    // 1. Rechercher par attributs data-* spécifiques (méthode la plus fiable)
    const dataSignatureImages = pdfContentRef.current.querySelectorAll('[data-signature="true"]');
    // console.log(`🔍 [DEBUG] ${dataSignatureImages.length} images avec attribut data-signature="true" trouvées`); // Log supprimé
    
    if (dataSignatureImages.length > 0) {
      dataSignatureImages.forEach((img) => {
        const imgEl = img as HTMLImageElement;
        const type = imgEl.getAttribute('data-signature-type');
        // console.log(`🔍 [DEBUG] Image de signature trouvée avec type: ${type}`, imgEl); // Log supprimé
        
        if (type === 'participant') {
          result.participantImage = imgEl;
          // console.log('✅ [DEBUG] Image de signature du participant trouvée dans le document'); // Log supprimé
        } else if (type === 'representative') {
          result.representativeImage = imgEl;
          // console.log('✅ [DEBUG] Image de signature du représentant trouvée dans le document'); // Log supprimé
        }
      });
    }
    
    // 2. Si les attributs data-* n'ont pas fonctionné, rechercher par conteneurs parents
    if (!result.participantImage || !result.representativeImage) {
      // console.log('🔍 [DEBUG] Recherche de signatures par conteneurs parents'); // Log supprimé
      
      // Rechercher les conteneurs de signature
      const participantContainer = pdfContentRef.current.querySelector('[data-signature-container="participant"]');
      const representativeContainer = pdfContentRef.current.querySelector('[data-signature-container="representative"]');
      
      if (participantContainer && !result.participantImage) {
        const img = participantContainer.querySelector('img');
        if (img) {
          result.participantImage = img as HTMLImageElement;
          // console.log('✅ [DEBUG] Image de signature du participant trouvée par conteneur parent'); // Log supprimé
        }
      }
      
      if (representativeContainer && !result.representativeImage) {
        const img = representativeContainer.querySelector('img');
        if (img) {
          result.representativeImage = img as HTMLImageElement;
          // console.log('✅ [DEBUG] Image de signature du représentant trouvée par conteneur parent'); // Log supprimé
        }
      }
    }
    
    // 3. Si aucune image n'a été trouvée, utiliser une méthode moins précise
    if (!result.participantImage && !result.representativeImage) {
      // console.log('⚠️ [DEBUG] Aucune signature trouvée avec les méthodes précises, utilisation d\'heuristiques'); // Log supprimé
      
      // Rechercher toutes les images du document
      const allImages = pdfContentRef.current.querySelectorAll('img');
      // console.log(`🔍 [DEBUG] ${allImages.length} images trouvées au total dans le document`); // Log supprimé
      
      allImages.forEach((img) => {
        const imgEl = img as HTMLImageElement;
        const src = imgEl.src || '';
        
        // Analyser l'URL pour déterminer le type de signature
        if (src.includes('participant_convention') && !result.participantImage) {
          result.participantImage = imgEl;
          // console.log('✅ [DEBUG] Image de signature du participant trouvée par heuristique URL'); // Log supprimé
        } else if ((src.includes('representative_convention') || 
                   src.includes('trainer_convention')) && 
                  !result.representativeImage) {
          result.representativeImage = imgEl;
          // console.log('✅ [DEBUG] Image de signature du représentant trouvée par heuristique URL'); // Log supprimé
        }
      });
    }
    
    // Résumé final
    // console.log('🔍 [DEBUG] Récapitulatif des signatures trouvées:'); // Log supprimé
    // console.log('- Participant:', result.participantImage ? '✅ Trouvée' : '❌ Non trouvée'); // Log supprimé
    // console.log('- Représentant:', result.representativeImage ? '✅ Trouvée' : '❌ Non trouvée'); // Log supprimé
    
    return result;
  };

  // Détecter si on est sur mobile
  const isMobile = window.innerWidth < 768;

  // Journaux pour le débogage des données du template
  useEffect(() => {
    // console.log('🧩 [DEBUG] StudentTrainingAgreement - Rendu principal du template avec:', { // Log supprimé
    //   'company complet': company,
    //   'a-t-on une entreprise': !!company,
    //   'props participant': participant,
    //   'a-t-on une entreprise participant': !!participant.company
    // });
  }, [company, participant]);

  // Effet pour gérer l'insertion des tampons qui n'apparaissent pas correctement
  useEffect(() => {
    if (!companySeal && !organizationSeal) return;
    
    // Fonction de vérification avec limitation des tentatives
    const checkAndFixSeal = () => {
      // Limiter à 2 tentatives maximum pour éviter les boucles infinies
      if (sealAttemptsRef.current >= 2) {
        // console.log('🔍 [INFO] Nombre maximum de tentatives atteint pour corriger l\'affichage du tampon'); // Log supprimé
      return;
    }

      sealAttemptsRef.current++;
      
      if (companySeal) {
        const companySealDisplayed = document.querySelector('.company-seal img, [data-seal-container="company"] img');
        if (!companySealDisplayed) {
          // console.log(`🔍 [WARN] Le tampon n'est pas correctement affiché après enregistrement (tentative ${sealAttemptsRef.current}/2)`); // Log supprimé
          // forceSealDisplay(); // Supprimer cet appel car la fonction n'existe plus
        } else {
          // console.log('✅ [SUCCESS] Tampon correctement affiché après correction'); // Log supprimé
        }
      }
    };
    
    // Une seule vérification après un délai raisonnable
    const sealCheckTimeout = setTimeout(() => {
      checkAndFixSeal();
    }, 1500);
    
    // Nettoyage des timeouts lors du démontage du composant
    return () => {
      clearTimeout(sealCheckTimeout);
    };
  }, [companySeal, organizationSeal]);

  // S'assurer que l'état initial est correctement initialisé à partir du cache
  useEffect(() => {
    if (initialSignatures.participantSig || initialSignatures.companySeal || initialSignatures.trainerSig) {
      // console.log('🔄 [INIT] Initialisation des signatures depuis le cache:'); // Log supprimé
      
      if (initialSignatures.participantSig) {
        // console.log('✅ [INIT] Signature participant trouvée dans le cache'); // Log supprimé
        safeSetParticipantSignature(initialSignatures.participantSig);
        setIsSigned(true);
        setHasParticipantSignature(true);
      }
      
      if (initialSignatures.companySeal) {
        // console.log('✅ [INIT] Tampon entreprise trouvé dans le cache'); // Log supprimé
        safeSetCompanySeal(initialSignatures.companySeal);
      }
      
      if (initialSignatures.organizationSeal) {
        // console.log('✅ [INIT] Tampon organisme trouvé dans le cache'); // Log supprimé
        setOrganizationSeal(initialSignatures.organizationSeal);
      }
      
      if (initialSignatures.trainerSig) {
        // console.log('✅ [INIT] Signature formateur trouvée dans le cache'); // Log supprimé
        safeSetTrainerSignature(initialSignatures.trainerSig);
      }
      
      // Définir les signatures comme verrouillées pour éviter les écrasements accidentels
      setSignaturesLocked(true);
    }
  }, []);
  
  // Fonction pour sauvegarder une signature
  const handleSignatureSave = async (signatureDataUrl: string, type: 'participant' | 'companySeal' = 'participant') => {
    // Vérifier l'authentification
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('Vous devez être connecté pour signer ce document.');
      return;
    }
    
    if (isSaving) return;
    setIsSaving(true);
    
    // Empêcher la fermeture accidentelle de la page pendant l'enregistrement
    const preventUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Enregistrement en cours. Êtes-vous sûr de vouloir quitter?';
    };
    window.addEventListener('beforeunload', preventUnload);
    
    try {
      // console.log(`🔍 [SAVE] Sauvegarde du ${type === 'companySeal' ? 'tampon' : 'signature'} dans DocumentManager`); // Log supprimé

      // Déterminer le type de signature (représentant pour les conventions)
      const signatureType =
        type === 'participant' ? 'representative' : type;

      // console.log(`🔍 [SAVE] Type de signature utilisé: ${signatureType} pour un document de type convention`); // Log supprimé

      // Sauvegarder l'image avec le DocumentManager
      try {
        const signatureUrl = await DocumentManager.saveSignature({
            training_id: training.id,
          user_id: participant.id,
          signature: signatureDataUrl,
          type: 'convention',
          signature_type: signatureType as 'participant' | 'representative' | 'trainer' | 'companySeal' | 'organizationSeal',
            created_by: session.user.id
        });
        
        if (!signatureUrl) {
          throw new Error(`Impossible d'obtenir l'URL de ${type === 'companySeal' ? 'tampon' : 'signature'}`);
        }
        
        // console.log(`🔍 [SAVE] ${type === 'companySeal' ? 'Tampon' : 'Signature'} enregistré:`, signatureUrl.substring(0, 50) + '...'); // Log supprimé
        
        // Anticacher l'URL
        const baseUrl = signatureUrl.split('?')[0];
        const timestamp = Date.now();
        const antiCacheUrl = `${baseUrl}?t=${timestamp}&forcereload=true`;

        // Si c'est une signature de représentant, la partager avec tous les participants de la même entreprise
        if (type === 'participant' && company && company.id) {
          try {
            // console.log('🔄 [SHARE] Partage de la signature...'); // Log supprimé
            // Importer et utiliser le service de partage
            const { SignatureService } = await import('../utils/SignatureUtils');

            const shareResult = await SignatureService.shareRepresentativeSignature(
              training.id,
              participant.id,
              company.id
            );

            if (shareResult) {
              // console.log('✅ [SHARE] Signature partagée avec succès'); // Log supprimé
            } else {
              // console.warn('⚠️ [SHARE] Aucun partage effectué'); // Log supprimé
            }
          } catch (shareError) {
            // console.error('❌ [SHARE] ERROR', 'Erreur partage signature:', shareError); // Log supprimé
          }
        }
        
        // Précharger l'image avant de mettre à jour l'interface
        const img = new Image();
        img.onload = () => {
          // console.log(`✅ [SAVE] Image de ${type === 'companySeal' ? 'tampon' : 'signature'} préchargée avec succès`); // Log supprimé
          
          // Mettre à jour les états selon le type
          if (type === 'companySeal') {
            safeSetCompanySeal(antiCacheUrl);
            
            // Notification pour le tampon
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[10000] flex items-center';
            notification.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <span>Tampon appliqué avec succès !</span>
            `;
            document.body.appendChild(notification);
            
            // Supprimer après 3 secondes
            setTimeout(() => {
              if (document.body.contains(notification)) {
                document.body.removeChild(notification);
              }
            }, 3000);
          } else {
            // Pour une signature normale de participant
            safeSetParticipantSignature(antiCacheUrl);
            setIsSigned(true);
            setHasParticipantSignature(true);
            
            // Mise à jour du statut de signature dans la base de données
            try {
              // console.log('🔄 [SAVE] Mise à jour du statut de signature dans user_profiles'); // Log supprimé
              supabase
                .from('user_profiles')
                .update({ has_signed_agreement: true })
                .eq('id', participant.id)
                .then(({ error }) => {
                  if (error) {
                    // console.error('❌ [SAVE] Erreur lors de la mise à jour du statut de signature:', error); // Log supprimé
                  } else {
                    // console.log('✅ [SAVE] Statut de signature mis à jour avec succès'); // Log supprimé
                  }
                });
            } catch (e) {
              // console.error('❌ [SAVE] Erreur inattendue lors de la mise à jour du statut:', e); // Log supprimé
            }
          }
          
          // Mettre à jour le cache global avec la nouvelle valeur
          updateSignatureCache(
            type === 'participant' ? antiCacheUrl : undefined,
            type === 'companySeal' ? antiCacheUrl : undefined
          );
          
          // Fermer les canvas
          setShowSignatureCanvas(false);
          setShowSealCanvas(false);
          
          // Terminer le chargement et rafraîchir
          setIsSaving(false);
          // SUPPRIMÉ: Rafraîchissement forcé
        };
        
        img.onerror = () => {
          // console.error(`❌ [SAVE] ERROR Erreur de préchargement de l\'image de ${type === 'companySeal' ? 'tampon' : 'signature'}`); // Log supprimé
          // Continuer malgré l'erreur
          if (type === 'companySeal') {
            safeSetCompanySeal(antiCacheUrl);
          } else {
            safeSetParticipantSignature(antiCacheUrl);
            setIsSigned(true);
            setHasParticipantSignature(true);
          }
          
          // Mettre à jour le cache global avec la nouvelle valeur
          updateSignatureCache(
            type === 'participant' ? antiCacheUrl : undefined,
            type === 'companySeal' ? antiCacheUrl : undefined
          );
          
          setShowSignatureCanvas(false);
          setShowSealCanvas(false);
          setIsSaving(false);
          alert(`Le ${type === 'companySeal' ? 'tampon' : 'la signature'} a été enregistré, mais il pourrait y avoir un problème d'affichage. Veuillez rafraîchir la page si nécessaire.`);
        };
        
        // Déclencher le chargement
        img.src = antiCacheUrl;
      } catch (saveError) {
        // console.error(`❌ [SAVE] ERROR Erreur sauvegarde DocumentManager:`, saveError); // Log supprimé
        // Mode de secours: utiliser le dataURL local
        if (type === 'companySeal') {
          safeSetCompanySeal(signatureDataUrl);
        } else {
          safeSetParticipantSignature(signatureDataUrl);
          setIsSigned(true);
          setHasParticipantSignature(true);
        }
        
        // Mettre à jour le cache global avec la valeur locale
        updateSignatureCache(
          type === 'participant' ? signatureDataUrl : undefined,
          type === 'companySeal' ? signatureDataUrl : undefined
        );
        
        setShowSignatureCanvas(false);
        setShowSealCanvas(false);
        setIsSaving(false);
        alert(`Le ${type === 'companySeal' ? 'tampon' : 'la signature'} a été enregistré localement, mais n'a pas pu être sauvegardé sur le serveur. Veuillez réessayer si nécessaire.`);
      }
    } catch (error) {
      // console.error(`❌ [SAVE] ERROR Erreur générale sauvegarde:`, error); // Log supprimé
      alert(`Une erreur est survenue lors de la sauvegarde. Veuillez réessayer.`);
      setIsSaving(false);
    } finally {
      // Nettoyer l'événement beforeunload
      window.removeEventListener('beforeunload', preventUnload);
    }
  };

  // Si un document existe déjà, afficher un bouton pour le visualiser
  if (existingDocumentUrl && !isOnlyTrainerSignature && participantSignature) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Convention de formation signée</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto flex-grow">
            {pdfLoading ? (
              <div className="flex flex-col items-center justify-center h-[70vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-white">Chargement du document...</p>
              </div>
            ) : pdfError ? (
              <div className="flex flex-col items-center justify-center h-[70vh] bg-gray-700 rounded-lg text-center p-8">
                <p className="text-white mb-4">Une erreur est survenue lors du chargement du document.</p>
                <p className="text-gray-300">Veuillez réessayer ultérieurement ou contacter le support.</p>
              </div>
            ) : (
              <iframe 
                src={documentUrl} 
                title="Convention de formation signée" 
                className="w-full h-full min-h-[70vh] rounded-lg border border-gray-600"
                style={{ backgroundColor: 'white' }}
                onLoad={() => { /* console.log('✅ [IFRAME] Document iframe loaded successfully (convention)') */ }} // Log supprimé
                onError={() => {
                  // console.error('❌ [IFRAME] Error loading document iframe (convention)'); // Log supprimé
                  setPdfError(true);
                }}
              />
            )}
          </div>
          
          <div className="p-6 border-t border-gray-700 flex justify-end">
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              download="convention_formation.pdf"
              className={`flex items-center gap-2 font-medium py-2 px-6 rounded-lg ${
                pdfLoading || pdfError
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              onClick={(e) => {
                if (pdfLoading || pdfError) {
                  e.preventDefault();
                }
              }}
            >
              <Download className="w-5 h-5" /> Télécharger la convention
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Si le canvas de signature est affiché
  if (showSignatureCanvas) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Signature de la convention
            </h2>
            <button
              onClick={() => setShowSignatureCanvas(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              disabled={isSaving}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-4 text-gray-900">
              Apposez votre signature
            </h3>
            
            <div className="mb-8">
              <div className="border border-gray-300 rounded-lg">
                <SignatureCanvas
                  onSave={(dataURL) => {
                    handleSignatureComplete(dataURL);
                    // Enregistrer comme une signature normale
                    handleSignatureSave(dataURL);
                  }}
                  onCancel={() => setShowSignatureCanvas(false)}
                  isLoading={isSaving}
                  initialName={`${participant.first_name} ${participant.last_name}`}
                  signatureType="participant"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si le canvas de tampon est affiché
  if (showSealCanvas) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Tampon de l'entreprise
            </h2>
            <button
              onClick={() => setShowSealCanvas(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              disabled={isSaving}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-4 text-gray-900">
              Apposez le tampon de votre entreprise
            </h3>
            
            <div className="mb-8">
              <div className="border border-gray-300 rounded-lg">
                <SignatureCanvas
                  onSave={(dataURL) => {
                    handleSignatureComplete(dataURL);
                    handleSignatureSave(dataURL, 'companySeal');
                  }}
                  onCancel={() => setShowSealCanvas(false)}
                  isLoading={isSaving}
                  signatureType="companySeal"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Affichage principale de la convention (avec ou sans signature)
  console.log('[DEBUG] Value passed to template - representativeSignature:', representativeSignature); // AJOUT: Vérifier la valeur passée
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* En-tête de la modale */}
        <div className="p-6 flex items-center justify-between border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isPreviewingPdf ? "Prévisualisation PDF" : (participantSignature ? "Convention de formation signée" : "Convention de formation")}
            {/* ... (badge "Signée" reste pareil) ... */} 
            {participantSignature && !isPreviewingPdf && <span className="ml-2 text-sm bg-green-600 text-white px-2 py-0.5 rounded-full">Signée</span>}
          </h2>
          <button
            onClick={() => {
              if (isPreviewingPdf && pdfPreviewUrl) {
                console.log("🧹 [PREVIEW_CLOSE] Révocation de l'URL Blob:", pdfPreviewUrl.substring(0,50)+"...");
                URL.revokeObjectURL(pdfPreviewUrl);
              }
              setIsPreviewingPdf(false);
              setPdfPreviewUrl(null);
              onCancel();
            }}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenu principal (conditionnel) */}
        <div className="p-6 overflow-y-auto flex-grow">
          {isPreviewingPdf && pdfPreviewUrl ? (
            // --- Mode Prévisualisation PDF ---
            <iframe
              src={pdfPreviewUrl}
              title="Prévisualisation Convention"
              className="w-full h-full min-h-[65vh] rounded-lg border border-gray-300"
              style={{ backgroundColor: 'lightgrey' }}
            />
          ) : (
            // --- Mode Affichage Template ---
            <div
              ref={pdfContentRef}
              className="bg-white text-black p-8 rounded-lg"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '14px' }}
            >
              <div id="training-agreement-template">
                <UnifiedTrainingAgreementTemplate
                   // ... (props du template restent les mêmes) ...
                   training={training}
                   company={company || { name: '' }}
                   participant={participant ? {
                     id: participant.id,
                     first_name: participant.first_name,
                     last_name: participant.last_name,
                     job_position: participant.job_position || '',
                     email: '',
                     company: participant.company
                   } : undefined}
                   participants={allTrainingParticipants}
                   participantSignature={participantSignature}
                   representativeSignature={representativeSignature}
                   companySeal={companySeal}
                   organizationSeal={organizationSeal}
                   viewContext="student"
                   pdfMode={false}
                   organizationSettings={{
                     organization_name: organizationSettings?.organization_name || DEFAULT_ORGANIZATION_SETTINGS.organization_name,
                     address: organizationSettings?.address || DEFAULT_ORGANIZATION_SETTINGS.address,
                     siret: organizationSettings?.siret || DEFAULT_ORGANIZATION_SETTINGS.siret,
                     activity_declaration_number: organizationSettings?.activity_declaration_number || DEFAULT_ORGANIZATION_SETTINGS.activity_declaration_number,
                     representative_name: organizationSettings?.representative_name || DEFAULT_ORGANIZATION_SETTINGS.representative_name,
                     representative_title: organizationSettings?.representative_title || DEFAULT_ORGANIZATION_SETTINGS.representative_title,
                     city: organizationSettings?.city || DEFAULT_ORGANIZATION_SETTINGS.city,
                     postal_code: organizationSettings?.postal_code || DEFAULT_ORGANIZATION_SETTINGS.postal_code,
                     country: organizationSettings?.country || DEFAULT_ORGANIZATION_SETTINGS.country,
                   }}
                   trainerId={training.trainer_id}
                   trainerSignature={trainerSignature}
                   onRenderComplete={() => {
                     console.log('✅ [RENDER_COMPLETE] Template rendu.');
                   }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Pied de page (adapter les boutons) */}
        <div className="p-6 border-t border-gray-200 flex flex-wrap gap-3 justify-between items-center">
          {isPreviewingPdf ? (
            // --- Boutons en mode Prévisualisation ---
            <>
              <button
                 onClick={() => {
                   if (pdfPreviewUrl) {
                    console.log("🧹 [PREVIEW_BACK] Révocation de l'URL Blob:", pdfPreviewUrl.substring(0,50)+"...");
                     URL.revokeObjectURL(pdfPreviewUrl);
                   }
                   setIsPreviewingPdf(false);
                   setPdfPreviewUrl(null);
                 }}
                 className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg"
              >
                Retour à la convention
              </button>
               <a
                 href={pdfPreviewUrl || '#'}
                 download={`Convention_${participant.first_name}_${participant.last_name}_${training.title.replace(/\\s+/g, '_')}.pdf`}
                 className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg flex items-center justify-center gap-2 ${!pdfPreviewUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                 aria-disabled={!pdfPreviewUrl}
                 onClick={(e) => !pdfPreviewUrl && e.preventDefault()}
               >
                 <Download className="w-5 h-5" /> Télécharger PDF
               </a>
            </>
          ) : (
            // --- Boutons en mode Normal ---
            <>
              {!participantSignature ? (
                 <div className="flex flex-wrap gap-3">
                    <button
                       onClick={() => setShowSignatureCanvas(true)}
                       className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg flex-grow md:flex-grow-0"
                     >
                       Signer la convention
                     </button>
                     <button
                       onClick={() => setShowSealCanvas(true)}
                       className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg flex items-center justify-center gap-2"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                         <circle cx="12" cy="12" r="10"></circle>
                         <path d="M12 8v8"></path>
                         <path d="M8 12h8"></path>
                       </svg>
                       Ajouter un tampon
                     </button>
                 </div>
               ) : (
                 <div className="flex flex-wrap gap-3">
                    <button
                       onClick={() => setShowSignatureCanvas(true)}
                       className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg flex-grow md:flex-grow-0"
                     >
                       Signer (Modifier)
                     </button>
                     <button
                       onClick={() => setShowSealCanvas(true)}
                       className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg flex items-center justify-center gap-2"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                         <circle cx="12" cy="12" r="10"></circle>
                         <path d="M12 8v8"></path>
                         <path d="M8 12h8"></path>
                       </svg>
                       Ajouter/Modifier Tampon
                     </button>
                 </div>
               )}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={generatePDF} // Ce bouton active maintenant la prévisualisation
                  className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg flex items-center justify-center gap-2"
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Génération...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" /> Prévisualiser PDF
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};