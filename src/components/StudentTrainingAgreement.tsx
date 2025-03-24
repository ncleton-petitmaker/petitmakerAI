import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import UnifiedTrainingAgreementTemplate from './shared/templates/unified/TrainingAgreementTemplate';
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
import { OrganizationSettings } from './shared/DocumentUtils';

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
      console.error('Erreur lors du parsing JSON:', e, 'field:', field);
      return null;
    }
  }
  
  return null;
};

// Définition des paramètres par défaut pour l'organisation
const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
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

// Fonction utilitaire de log
const log = (emoji: string, type: string, message: string, data?: any) => {
  if (data) {
    console.log(`${emoji} ${type}`, message, data);
  } else {
    console.log(`${emoji} ${type}`, message);
  }
};

// Interface pour le cache global de signatures
interface SignatureCacheItem {
  participantSig?: string | null;
  companySeal?: string | null;
  organizationSeal?: string | null;
  trainerSig?: string | null;
  timestamp?: number;
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
    console.log('⚡ [INIT] Chargement synchrone des signatures:', { trainingId, participantId });
    
    // Récupérer depuis le cache local
    const cached = GLOBAL_SIGNATURE_CACHE.getCache(trainingId, participantId);
    console.log('📋 [INIT] Données du cache:', cached);
    
    // Vérifier également dans le localStorage pour plus de robustesse
    try {
      const localStorageKey = `signatures_cache_${trainingId}_${participantId}`;
      const storedData = localStorage.getItem(localStorageKey);
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        console.log('📋 [INIT] Données du localStorage:', parsedData);
        
        // Si le cache en mémoire est vide mais qu'on a des données dans le localStorage
        if (!cached.participantSig && !cached.companySeal && 
            (parsedData.participantSig || parsedData.companySeal)) {
          // Mettre à jour le cache en mémoire avec les données du localStorage
          GLOBAL_SIGNATURE_CACHE.setCache(trainingId, participantId, parsedData);
          console.log('🔄 [INIT] Cache en mémoire mis à jour depuis localStorage');
          
          // Retourner les données du localStorage
          return parsedData;
        }
      }
    } catch (e) {
      console.error('❌ [INIT] Erreur lors de la récupération depuis localStorage:', e);
    }
    
    // Précharger les images si disponibles
    if (cached.participantSig || cached.companySeal || cached.organizationSeal) {
      console.log('🔄 [INIT] Préchargement des images du cache');
      GLOBAL_SIGNATURE_CACHE.preloadImages([
        cached.participantSig, 
        cached.companySeal,
        cached.organizationSeal
      ]);
    }
    
    return cached;
  } catch (e) {
    console.error('❌ [INIT] Erreur du chargement synchrone des signatures:', e);
    return { participantSig: null, companySeal: null, organizationSeal: null };
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
  const [organizationSettings, setOrganizationSettings] = useState<OrganizationSettings | null>(null);
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [showSealCanvas, setShowSealCanvas] = useState(false);
  const [participantSignature, setParticipantSignature] = useState<string | null>(null);
  const [representativeSignature, setRepresentativeSignature] = useState<string | null>(null);
  const [trainerSignature, setTrainerSignature] = useState<string | null>(null);
  const [companySeal, setCompanySeal] = useState<string | null>(null);
  const [organizationSeal, setOrganizationSeal] = useState<string | null>(null);
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

  // Fonction pour mettre à jour le cache de signatures
  const updateSignatureCache = useCallback((
    newParticipantSig?: string | null,
    newCompanySeal?: string | null,
    newOrganizationSeal?: string | null,
    newTrainerSig?: string | null
  ) => {
    log('🔄', '[CACHE_UPDATE]', 'Mise à jour du cache de signatures');
    
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
        console.error('❌ [CACHE_UPDATE] Erreur lors de la sauvegarde localStorage:', e);
      }
      
      log('✅', '[CACHE_UPDATE]', 'Cache de signatures mis à jour avec succès');
    } catch (e) {
      console.error('❌ [CACHE_UPDATE] Erreur lors de la mise à jour du cache:', e);
    }
  }, [participantSignature, companySeal, organizationSeal, trainerSignature, training.id, participant.id]);

  // Charger immédiatement les signatures avant même le premier rendu
  const initialSignatures = loadSignaturesSync(training.id, participant.id);
  
  // Log critique pour diagnostiquer le problème initial
  console.log('🚨 [DIAGNOSTIC_CRITIQUE] Initialisation des états avec:', {
    initialSignatures,
    organizationSealInitialValue: initialSignatures.organizationSeal || 'NON PRÉSENT DANS LE CACHE', 
    cacheKeys: Object.keys(initialSignatures)
  });

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
  const [shouldRefresh, setShouldRefresh] = useState(false);
  
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

  // Effet séparé pour récupérer tous les participants de la formation
  useEffect(() => {
    const fetchAllParticipants = async () => {
      try {
        console.log('🔍 [PARTICIPANTS] Récupération des participants pour la formation:', training.id);
        
        // Récupérer tous les utilisateurs associés à cette formation via user_profiles
        const { data: participantsData, error: participantsError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('training_id', training.id);
          
        if (participantsError) {
          console.error('❌ [PARTICIPANTS] Erreur lors de la récupération des apprenants via user_profiles:', participantsError);
          
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
          console.log('✅ [PARTICIPANTS] Apprenants trouvés via user_profiles:', participantsData.length);
          
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
          
          console.log('🔄 [PARTICIPANTS] Participants formatés depuis user_profiles:', formattedParticipants.length);
          
          // S'assurer que l'apprenant actuel est toujours présent dans la liste
          const currentParticipantIncluded = formattedParticipants.some(p => p.id === participant.id);
          
          if (!currentParticipantIncluded) {
            console.log('➕ [PARTICIPANTS] Ajout du participant actuel qui n\'était pas dans la liste:', participant);
            
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
        } else {
          console.log('⚠️ [PARTICIPANTS] Aucun participant trouvé via user_profiles, utilisation du participant actuel');
          
          // Si aucun participant n'est trouvé dans la table user_profiles,
          // utiliser au moins le participant actuel
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
      } catch (error) {
        console.error('❌ [PARTICIPANTS] Erreur générale lors de la récupération des participants:', error);
        
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
    };
    
    fetchAllParticipants();
  }, [training.id, participant.id, participant.first_name, participant.last_name, participant.job_position, participant.company]);

  // Wrapper pour setParticipantSignature qui protège contre les nulls indésirables
  const safeSetParticipantSignature = useCallback((value: string | null) => {
    if (value || !signaturesLocked) {
      setParticipantSignature(value);
    } else {
      console.log('🔒 [PROTECT] Tentative de définir participantSignature à null bloquée');
    }
  }, [signaturesLocked]);

  // Wrapper pour setCompanySeal qui protège contre les nulls indésirables
  const safeSetCompanySeal = useCallback((value: string | null) => {
    if (value || !signaturesLocked) {
      setCompanySeal(value);
    } else {
      console.log('🔒 [PROTECT] Tentative de définir companySeal à null bloquée');
    }
  }, [signaturesLocked]);

  // Ajouter la fonction pour mettre à jour la signature du formateur de manière sécurisée (vers ligne 370-380 avec les autres fonctions safe)
  const safeSetTrainerSignature = useCallback((url: string | null) => {
    console.log('🔒 [TRAINER] Mise à jour sécurisée de la signature du formateur:', 
      url ? `${url.substring(0, 50)}...` : 'null');
    setTrainerSignature(url);
    setHasTrainerSignature(!!url);
  }, []);

  // Effet pour charger les signatures depuis Supabase (asynchrone, après le premier rendu)
  useEffect(() => {
    const loadSignaturesFromSupabase = async () => {
      try {
        // Vérifier si nous avons chargé les signatures récemment
        const now = Date.now();
        const timeSinceLastLoad = now - lastSignatureLoadTimeRef.current;
        
        // Ne charger que toutes les 30 secondes maximum
        if (timeSinceLastLoad < 30000 && lastSignatureLoadTimeRef.current > 0) {
          console.log(`⏱️ [THROTTLE] Chargement des signatures ignoré (dernier chargement il y a ${Math.round(timeSinceLastLoad/1000)}s, minimum 30s)`);
        return;
      }
      
        // Mettre à jour le timestamp du dernier chargement
        lastSignatureLoadTimeRef.current = now;
        
        console.log('🔄 [SUPABASE] Chargement des signatures depuis Supabase:', {
          training_id: training.id,
          user_id: participant.id,
          type: 'convention'
        });
        
        // Toujours charger les signatures de Supabase, même si on a déjà vérifié (pour les réouvertures de modale)
        signaturesLoadedRef.current = false;
        
        // Requête Supabase pour les signatures les plus récentes
        const { data: signatureData, error: signatureError } = await supabase
          .from('document_signatures')
          .select('*')
          .eq('training_id', training.id)
          .eq('user_id', participant.id)
          .eq('type', 'convention')
          .order('created_at', { ascending: false });
          
        if (signatureError) {
          console.error('❌ [SUPABASE] Erreur lors de la récupération des signatures:', signatureError);
          
          // Si échec avec document_signatures, essayer avec la table documents
          console.log('⚠️ [SUPABASE] Tentative de récupération via la table documents');
          
          const { data: documentsData, error: documentsError } = await supabase
            .from('documents')
            .select('*')
            .eq('training_id', training.id)
            .eq('user_id', participant.id)
            .eq('type', 'convention')
            .order('created_at', { ascending: false });
          
          if (documentsError || !documentsData || documentsData.length === 0) {
            console.log('⚠️ [SUPABASE] Aucun document trouvé dans la table documents');
            return;
          }
          
          // Traiter les données de la table documents
          let participantSigUrl = null;
          let companySealUrl = null;
          
          for (const doc of documentsData) {
            if (!doc.file_url) continue;
            
            const baseUrl = doc.file_url.split('?')[0];
            const timestamp = Date.now();
            const antiCacheUrl = `${baseUrl}?t=${timestamp}&forcereload=true`;
            
            if (doc.title === "Signature de l'apprenant") {
              participantSigUrl = antiCacheUrl;
              console.log('✅ [SUPABASE] Signature participant trouvée dans documents:', antiCacheUrl.substring(0, 50) + '...');
            } else if (doc.title === "Tampon de l'entreprise") {
              companySealUrl = antiCacheUrl;
              console.log('✅ [SUPABASE] Tampon entreprise trouvé dans documents:', antiCacheUrl.substring(0, 50) + '...');
            }
          }
          
          // Mettre à jour les états si on a trouvé des signatures
          if (participantSigUrl) {
            safeSetParticipantSignature(participantSigUrl);
            setIsSigned(true);
            setHasParticipantSignature(true);
          }
          
          if (companySealUrl) {
            safeSetCompanySeal(companySealUrl);
          }
          
          // Mettre à jour le cache global
          if (participantSigUrl || companySealUrl) {
            GLOBAL_SIGNATURE_CACHE.setCache(training.id, participant.id, {
              participantSig: participantSigUrl,
              companySeal: companySealUrl,
              // Conserver le tampon de l'organisme s'il existe déjà
              organizationSeal: organizationSeal
            });
            
            // Mettre à jour le localStorage
            try {
              const localStorageKey = `signatures_cache_${training.id}_${participant.id}`;
              const cacheData = {
                participantSig: participantSigUrl,
                companySeal: companySealUrl,
                organizationSeal: organizationSeal,
                timestamp: Date.now()
              };
              localStorage.setItem(localStorageKey, JSON.stringify(cacheData));
              console.log('💾 [SUPABASE] Cache sauvegardé dans localStorage');
            } catch (e) {
              console.error('❌ [SUPABASE] Erreur lors de la sauvegarde localStorage:', e);
            }
            
            // Forcer un rafraîchissement
            setTimeout(() => {
              setShouldRefresh(prev => !prev);
            }, 100);
          }
          
          return;
        }
        
        if (!signatureData || signatureData.length === 0) {
          console.log('ℹ️ [SUPABASE] Aucune signature trouvée dans document_signatures, tentative avec documents');
          
          // Essayer avec la table documents
          const { data: documentsData, error: documentsError } = await supabase
            .from('documents')
            .select('*')
            .eq('training_id', training.id)
            .eq('user_id', participant.id)
            .eq('type', 'convention')
            .order('created_at', { ascending: false });
          
          if (documentsError || !documentsData || documentsData.length === 0) {
            console.log('⚠️ [SUPABASE] Aucun document trouvé dans la table documents non plus');
            return;
          }
          
          // Traiter les données de la table documents
          let participantSigUrl = null;
          let companySealUrl = null;
          
          for (const doc of documentsData) {
            if (!doc.file_url) continue;
            
            const baseUrl = doc.file_url.split('?')[0];
            const timestamp = Date.now();
            const antiCacheUrl = `${baseUrl}?t=${timestamp}&forcereload=true`;
            
            if (doc.title === "Signature de l'apprenant") {
              participantSigUrl = antiCacheUrl;
              console.log('✅ [SUPABASE] Signature participant trouvée dans documents:', antiCacheUrl.substring(0, 50) + '...');
            } else if (doc.title === "Tampon de l'entreprise") {
              companySealUrl = antiCacheUrl;
              console.log('✅ [SUPABASE] Tampon entreprise trouvé dans documents:', antiCacheUrl.substring(0, 50) + '...');
            }
          }
          
          // Mettre à jour les états si on a trouvé des signatures
          if (participantSigUrl) {
            safeSetParticipantSignature(participantSigUrl);
            setIsSigned(true);
            setHasParticipantSignature(true);
          }
          
          if (companySealUrl) {
            safeSetCompanySeal(companySealUrl);
          }
          
          // Mettre à jour le cache global
          if (participantSigUrl || companySealUrl) {
            GLOBAL_SIGNATURE_CACHE.setCache(training.id, participant.id, {
              participantSig: participantSigUrl,
              companySeal: companySealUrl,
              // Conserver le tampon de l'organisme s'il existe déjà
              organizationSeal: organizationSeal
            });
            
            // Mettre à jour le localStorage
            try {
              const localStorageKey = `signatures_cache_${training.id}_${participant.id}`;
              const cacheData = {
                participantSig: participantSigUrl,
                companySeal: companySealUrl,
                organizationSeal: organizationSeal,
                timestamp: Date.now()
              };
              localStorage.setItem(localStorageKey, JSON.stringify(cacheData));
              console.log('💾 [SUPABASE] Cache sauvegardé dans localStorage');
            } catch (e) {
              console.error('❌ [SUPABASE] Erreur lors de la sauvegarde localStorage:', e);
            }
            
            // Forcer un rafraîchissement
            setTimeout(() => {
              setShouldRefresh(prev => !prev);
            }, 100);
          }
          
          return;
        }
        
        console.log('✅ [SUPABASE] Signatures trouvées dans Supabase:', signatureData);
        
        // Variables pour stocker les dernières signatures de chaque type
        let participantSigUrl = null;
        let companySealUrl = null;
        
        // Extraire les signatures et tampons
        for (const sig of signatureData) {
          if (!sig.signature_url) continue;
          
          const baseUrl = sig.signature_url.split('?')[0];
          const timestamp = Date.now();
          const antiCacheUrl = `${baseUrl}?t=${timestamp}&forcereload=true`;
          
          if (sig.signature_type === 'participant' || sig.signature_type === 'representative') {
            participantSigUrl = antiCacheUrl;
            console.log('✅ [SUPABASE] Signature participant trouvée:', antiCacheUrl.substring(0, 50) + '...');
          } else if (sig.signature_type === 'companySeal') {
            companySealUrl = antiCacheUrl;
            console.log('✅ [SUPABASE] Tampon entreprise trouvé:', antiCacheUrl.substring(0, 50) + '...');
          }
        }
        
        // Mettre à jour les états
        if (participantSigUrl) {
            safeSetParticipantSignature(participantSigUrl);
            setIsSigned(true);
            setHasParticipantSignature(true);
          }
          
        if (companySealUrl) {
            safeSetCompanySeal(companySealUrl);
          }
          
        // Mettre à jour le cache global
          GLOBAL_SIGNATURE_CACHE.setCache(training.id, participant.id, {
          participantSig: participantSigUrl,
          companySeal: companySealUrl,
          // Conserver le tampon de l'organisme s'il existe déjà
          organizationSeal: organizationSeal
        });
        
        // Mettre à jour le localStorage
        try {
          const localStorageKey = `signatures_cache_${training.id}_${participant.id}`;
          const cacheData = {
            participantSig: participantSigUrl,
            companySeal: companySealUrl,
            organizationSeal: organizationSeal,
            timestamp: Date.now()
          };
          localStorage.setItem(localStorageKey, JSON.stringify(cacheData));
          console.log('💾 [SUPABASE] Cache sauvegardé dans localStorage');
        } catch (e) {
          console.error('❌ [SUPABASE] Erreur lors de la sauvegarde localStorage:', e);
        }
        
        // Forcer un rafraîchissement
        if (participantSigUrl || companySealUrl) {
            setTimeout(() => {
              setShouldRefresh(prev => !prev);
            }, 100);
        }
      } catch (error) {
        console.error('❌ [SUPABASE] Erreur lors du chargement des signatures depuis Supabase:', error);
      } finally {
        signaturesLoadedRef.current = true;
      }
    };
    
    // Lancer le chargement asynchrone
    loadSignaturesFromSupabase();
  }, [training.id, participant.id, safeSetParticipantSignature, safeSetCompanySeal, organizationSeal]);

  // Moniteur d'état des signatures
  useEffect(() => {
    console.log('👁️ [MONITOR] État des signatures:', {
      participantSignature: participantSignature ? '✅ Présente' : '❌ Absente',
      companySeal: companySeal ? '✅ Présent' : '❌ Absent',
      trainerSignature: trainerSignature ? '✅ Présente' : '❌ Absente',
      signaturesLocked: signaturesLocked ? '🔒 Verrouillées' : '🔓 Déverrouillées'
    });
  }, [participantSignature, companySeal, trainerSignature, signaturesLocked]);

  // Ajouter une fonction pour charger la signature du formateur depuis Supabase
  const loadTrainerSignature = async () => {
    try {
      console.log('🔄 [TRAINER] Chargement de la signature du formateur pour la formation:', training.id);
      
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
        console.error('❌ [TRAINER] Erreur lors de la recherche dans la table documents:', docsError);
      } else if (trainerDocs && trainerDocs.length > 0 && trainerDocs[0].file_url) {
        console.log('✅ [TRAINER] Signature du formateur trouvée dans documents:', trainerDocs[0].file_url.substring(0, 50) + '...');
        
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
      
      // Si rien n'est trouvé dans documents, essayer avec document_signatures
      const { data: trainerSigData, error: sigError } = await supabase
        .from('document_signatures')
        .select('signature_url')
        .eq('training_id', training.id)
        .eq('type', 'convention')
        .eq('signature_type', 'trainer')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (sigError) {
        console.error('❌ [TRAINER] Erreur lors de la recherche dans document_signatures:', sigError);
      } else if (trainerSigData && trainerSigData.length > 0 && trainerSigData[0].signature_url) {
        console.log('✅ [TRAINER] Signature formateur trouvée dans document_signatures:', trainerSigData[0].signature_url.substring(0, 50) + '...');
        
        // Ajouter un anti-cache à l'URL
        const baseUrl = trainerSigData[0].signature_url.split('?')[0];
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
        console.error('❌ [TRAINER] Erreur lors de la recherche dans le bucket signatures:', storageError);
      } else if (storageFiles && storageFiles.length > 0) {
        const sigFile = storageFiles[0];
        // Générer l'URL du fichier trouvé
        const { data: urlData } = await supabase.storage
          .from('signatures')
          .getPublicUrl(sigFile.name);
          
        if (urlData && urlData.publicUrl) {
          console.log('✅ [TRAINER] Signature formateur trouvée dans le bucket:', urlData.publicUrl.substring(0, 50) + '...');
          
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
      
      console.log('ℹ️ [TRAINER] Aucune signature de formateur trouvée pour cette formation');
      
    } catch (error) {
      console.error('❌ [TRAINER] Erreur lors du chargement de la signature du formateur:', error);
    }
  };

  // Ajouter un useEffect pour charger la signature du formateur
  useEffect(() => {
    // Charger depuis le cache d'abord
    if (initialSignatures.trainerSig) {
      console.log('✅ [INIT] Signature formateur trouvée dans le cache local');
      safeSetTrainerSignature(initialSignatures.trainerSig);
    } else {
      // Charger depuis Supabase si pas dans le cache
      loadTrainerSignature();
    }
  }, [training.id, safeSetTrainerSignature, initialSignatures.trainerSig]);

  // Effet pour charger les signatures depuis Supabase (asynchrone, après le premier rendu)
  useEffect(() => {
    const loadSignaturesFromSupabase = async () => {
      try {
        // Vérifier si nous avons chargé les signatures récemment
        const now = Date.now();
        const timeSinceLastLoad = now - lastSignatureLoadTimeRef.current;
        
        // Ne charger que toutes les 30 secondes maximum
        if (timeSinceLastLoad < 30000 && lastSignatureLoadTimeRef.current > 0) {
          console.log(`⏱️ [THROTTLE] Chargement des signatures ignoré (dernier chargement il y a ${Math.round(timeSinceLastLoad/1000)}s, minimum 30s)`);
        return;
      }
      
        // Mettre à jour le timestamp du dernier chargement
        lastSignatureLoadTimeRef.current = now;
        
        console.log('🔄 [SUPABASE] Chargement des signatures depuis Supabase:', {
          training_id: training.id,
          user_id: participant.id,
          type: 'convention'
        });
        
        // Toujours charger les signatures de Supabase, même si on a déjà vérifié (pour les réouvertures de modale)
        signaturesLoadedRef.current = false;
        
        // Requête Supabase pour les signatures les plus récentes
        const { data: signatureData, error: signatureError } = await supabase
          .from('document_signatures')
          .select('*')
          .eq('training_id', training.id)
          .eq('user_id', participant.id)
          .eq('type', 'convention')
          .order('created_at', { ascending: false });
          
        if (signatureError) {
          console.error('❌ [SUPABASE] Erreur lors de la récupération des signatures:', signatureError);
          
          // Si échec avec document_signatures, essayer avec la table documents
          console.log('⚠️ [SUPABASE] Tentative de récupération via la table documents');
          
          const { data: documentsData, error: documentsError } = await supabase
            .from('documents')
            .select('*')
            .eq('training_id', training.id)
            .eq('user_id', participant.id)
            .eq('type', 'convention')
            .order('created_at', { ascending: false });
          
          if (documentsError || !documentsData || documentsData.length === 0) {
            console.log('⚠️ [SUPABASE] Aucun document trouvé dans la table documents');
            return;
          }
          
          // Traiter les données de la table documents
          let participantSigUrl = null;
          let companySealUrl = null;
          
          for (const doc of documentsData) {
            if (!doc.file_url) continue;
            
            const baseUrl = doc.file_url.split('?')[0];
            const timestamp = Date.now();
            const antiCacheUrl = `${baseUrl}?t=${timestamp}&forcereload=true`;
            
            if (doc.title === "Signature de l'apprenant") {
              participantSigUrl = antiCacheUrl;
              console.log('✅ [SUPABASE] Signature participant trouvée dans documents:', antiCacheUrl.substring(0, 50) + '...');
            } else if (doc.title === "Tampon de l'entreprise") {
              companySealUrl = antiCacheUrl;
              console.log('✅ [SUPABASE] Tampon entreprise trouvé dans documents:', antiCacheUrl.substring(0, 50) + '...');
            }
          }
          
          // Mettre à jour les états si on a trouvé des signatures
          if (participantSigUrl) {
            safeSetParticipantSignature(participantSigUrl);
            setIsSigned(true);
            setHasParticipantSignature(true);
          }
          
          if (companySealUrl) {
            safeSetCompanySeal(companySealUrl);
          }
          
          // Mettre à jour le cache global
          if (participantSigUrl || companySealUrl) {
            GLOBAL_SIGNATURE_CACHE.setCache(training.id, participant.id, {
              participantSig: participantSigUrl,
              companySeal: companySealUrl,
              // Conserver le tampon de l'organisme s'il existe déjà
              organizationSeal: organizationSeal
            });
            
            // Mettre à jour le localStorage
            try {
              const localStorageKey = `signatures_cache_${training.id}_${participant.id}`;
              const cacheData = {
                participantSig: participantSigUrl,
                companySeal: companySealUrl,
                organizationSeal: organizationSeal,
                timestamp: Date.now()
              };
              localStorage.setItem(localStorageKey, JSON.stringify(cacheData));
              console.log('💾 [SUPABASE] Cache sauvegardé dans localStorage');
            } catch (e) {
              console.error('❌ [SUPABASE] Erreur lors de la sauvegarde localStorage:', e);
            }
            
            // Forcer un rafraîchissement
            setTimeout(() => {
              setShouldRefresh(prev => !prev);
            }, 100);
          }
          
          return;
        }
        
        if (!signatureData || signatureData.length === 0) {
          console.log('ℹ️ [SUPABASE] Aucune signature trouvée dans document_signatures, tentative avec documents');
          
          // Essayer avec la table documents
          const { data: documentsData, error: documentsError } = await supabase
            .from('documents')
            .select('*')
            .eq('training_id', training.id)
            .eq('user_id', participant.id)
            .eq('type', 'convention')
            .order('created_at', { ascending: false });
          
          if (documentsError || !documentsData || documentsData.length === 0) {
            console.log('⚠️ [SUPABASE] Aucun document trouvé dans la table documents non plus');
            return;
          }
          
          // Traiter les données de la table documents
          let participantSigUrl = null;
          let companySealUrl = null;
          
          for (const doc of documentsData) {
            if (!doc.file_url) continue;
            
            const baseUrl = doc.file_url.split('?')[0];
            const timestamp = Date.now();
            const antiCacheUrl = `${baseUrl}?t=${timestamp}&forcereload=true`;
            
            if (doc.title === "Signature de l'apprenant") {
              participantSigUrl = antiCacheUrl;
              console.log('✅ [SUPABASE] Signature participant trouvée dans documents:', antiCacheUrl.substring(0, 50) + '...');
            } else if (doc.title === "Tampon de l'entreprise") {
              companySealUrl = antiCacheUrl;
              console.log('✅ [SUPABASE] Tampon entreprise trouvé dans documents:', antiCacheUrl.substring(0, 50) + '...');
            }
          }
          
          // Mettre à jour les états si on a trouvé des signatures
          if (participantSigUrl) {
            safeSetParticipantSignature(participantSigUrl);
            setIsSigned(true);
            setHasParticipantSignature(true);
          }
          
          if (companySealUrl) {
            safeSetCompanySeal(companySealUrl);
          }
          
          // Mettre à jour le cache global
          if (participantSigUrl || companySealUrl) {
            GLOBAL_SIGNATURE_CACHE.setCache(training.id, participant.id, {
              participantSig: participantSigUrl,
              companySeal: companySealUrl,
              // Conserver le tampon de l'organisme s'il existe déjà
              organizationSeal: organizationSeal
            });
            
            // Mettre à jour le localStorage
            try {
              const localStorageKey = `signatures_cache_${training.id}_${participant.id}`;
              const cacheData = {
                participantSig: participantSigUrl,
                companySeal: companySealUrl,
                organizationSeal: organizationSeal,
                timestamp: Date.now()
              };
              localStorage.setItem(localStorageKey, JSON.stringify(cacheData));
              console.log('💾 [SUPABASE] Cache sauvegardé dans localStorage');
            } catch (e) {
              console.error('❌ [SUPABASE] Erreur lors de la sauvegarde localStorage:', e);
            }
            
            // Forcer un rafraîchissement
            setTimeout(() => {
              setShouldRefresh(prev => !prev);
            }, 100);
          }
          
          return;
        }
        
        console.log('✅ [SUPABASE] Signatures trouvées dans Supabase:', signatureData);
        
        // Variables pour stocker les dernières signatures de chaque type
        let participantSigUrl = null;
        let companySealUrl = null;
        
        // Extraire les signatures et tampons
        for (const sig of signatureData) {
          if (!sig.signature_url) continue;
          
          const baseUrl = sig.signature_url.split('?')[0];
          const timestamp = Date.now();
          const antiCacheUrl = `${baseUrl}?t=${timestamp}&forcereload=true`;
          
          if (sig.signature_type === 'participant' || sig.signature_type === 'representative') {
            participantSigUrl = antiCacheUrl;
            console.log('✅ [SUPABASE] Signature participant trouvée:', antiCacheUrl.substring(0, 50) + '...');
          } else if (sig.signature_type === 'companySeal') {
            companySealUrl = antiCacheUrl;
            console.log('✅ [SUPABASE] Tampon entreprise trouvé:', antiCacheUrl.substring(0, 50) + '...');
          }
        }
        
        // Mettre à jour les états
        if (participantSigUrl) {
            safeSetParticipantSignature(participantSigUrl);
            setIsSigned(true);
            setHasParticipantSignature(true);
          }
          
        if (companySealUrl) {
            safeSetCompanySeal(companySealUrl);
          }
          
        // Mettre à jour le cache global
          GLOBAL_SIGNATURE_CACHE.setCache(training.id, participant.id, {
          participantSig: participantSigUrl,
          companySeal: companySealUrl,
          // Conserver le tampon de l'organisme s'il existe déjà
          organizationSeal: organizationSeal
        });
        
        // Mettre à jour le localStorage
        try {
          const localStorageKey = `signatures_cache_${training.id}_${participant.id}`;
          const cacheData = {
            participantSig: participantSigUrl,
            companySeal: companySealUrl,
            organizationSeal: organizationSeal,
            timestamp: Date.now()
          };
          localStorage.setItem(localStorageKey, JSON.stringify(cacheData));
          console.log('💾 [SUPABASE] Cache sauvegardé dans localStorage');
        } catch (e) {
          console.error('❌ [SUPABASE] Erreur lors de la sauvegarde localStorage:', e);
        }
        
        // Forcer un rafraîchissement
        if (participantSigUrl || companySealUrl) {
            setTimeout(() => {
              setShouldRefresh(prev => !prev);
            }, 100);
        }
      } catch (error) {
        console.error('❌ [SUPABASE] Erreur lors du chargement des signatures depuis Supabase:', error);
      } finally {
        signaturesLoadedRef.current = true;
      }
    };
    
    // Lancer le chargement asynchrone
    loadSignaturesFromSupabase();
  }, [training.id, participant.id, safeSetParticipantSignature, safeSetCompanySeal, organizationSeal]);

  // Effet pour vérifier l'accessibilité des tampons dès le chargement
  useEffect(() => {
    const verifySeals = async () => {
      if (companySeal || organizationSeal) {
        console.log('🔍 [INITIALIZATION] Vérification de l\'accessibilité des tampons');
        
        try {
          // Importer de manière dynamique pour éviter les problèmes de référence circulaire
          const { checkSealAccess } = await import('../utils/SignatureUtils');
          
          // Vérifier et potentiellement optimiser les URLs des tampons
          const { companySeal: optimizedCompanySeal, organizationSeal: optimizedOrgSeal, diagnosticMessage } = 
            await checkSealAccess({
              companySeal,
              organizationSeal
            });
          
          console.log(`🔍 [INITIALIZATION] Diagnostic des tampons: ${diagnosticMessage}`);
          
          // Mettre à jour les URLs si elles ont été optimisées
          if (optimizedCompanySeal && optimizedCompanySeal !== companySeal) {
            console.log('🔍 [INITIALIZATION] Mise à jour de l\'URL du tampon d\'entreprise');
            setCompanySeal(optimizedCompanySeal);
          }
          
          if (optimizedOrgSeal && optimizedOrgSeal !== organizationSeal) {
            console.log('🔍 [INITIALIZATION] Mise à jour de l\'URL du tampon d\'organisme');
            setOrganizationSeal(optimizedOrgSeal);
          }
          
          // Retourner le résultat pour un usage ultérieur
          return { companySeal: optimizedCompanySeal, organizationSeal: optimizedOrgSeal };
        } catch (error) {
          console.error('❌ [ERROR] Erreur lors de la vérification des tampons:', error);
          return { companySeal, organizationSeal };
        }
      }
      
      return { companySeal, organizationSeal };
    };
    
    // Lancer la vérification
    verifySeals();
  }, [companySeal, organizationSeal]);

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
          console.error('Erreur lors de la récupération des paramètres:', settingsError);
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
            organization_seal_url: settingsData.organization_seal_url
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
          console.error('Erreur lors de la récupération des données complètes de la formation:', fullTrainingError);
        } else if (fullTrainingData) {
          console.log('✅ [DATA] Données complètes de la formation récupérées:', fullTrainingData);
          console.log('✅ [PRICE] Prix récupéré:', fullTrainingData.price);
          
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
          
          console.log('🔄 [DATA] Données de formation parsées:', parsedTraining);
          console.log('🔄 [PRICE] Prix après parsing:', parsedTraining.price);
          
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
            console.error('Erreur lors de la récupération de la société:', companyError);
            
            // Si pas de company_id mais que le participant a une entreprise renseignée, essayer de la trouver
            if (participant.company) {
              console.log('🔍 [DEBUG] Pas de company_id trouvée, recherche par nom:', participant.company);
              
              const { data: companyByNameData, error: companyByNameError } = await supabase
                .from('companies')
                .select('*')
                .ilike('name', `%${participant.company}%`)
                .limit(1)
                .single();
              
              if (companyByNameError) {
                console.log('⚠️ [WARN] Entreprise non trouvée par nom:', companyByNameError);
                
                // Créer une entreprise de base à partir du nom
                setCompany({
                  name: participant.company,
                  address: participant.company ? 'Adresse non renseignée' : 'À compléter',
                  postal_code: '',
                  city: '',
                  siret: participant.company ? 'SIRET non renseigné' : 'À compléter'
                });
              } else if (companyByNameData) {
                console.log('✅ [SUCCESS] Entreprise trouvée par nom:', companyByNameData);
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
          console.log('🔍 [DEBUG] Pas de company_id, recherche par nom:', participant.company);
          
          const { data: companyByNameData, error: companyByNameError } = await supabase
            .from('companies')
            .select('*')
            .ilike('name', `%${participant.company}%`)
            .limit(1)
            .single();
          
          if (companyByNameError) {
            console.log('⚠️ [WARN] Entreprise non trouvée par nom:', companyByNameError);
            
            // Créer une entreprise de base à partir du nom
            setCompany({
              name: participant.company,
              address: participant.company ? 'Adresse non renseignée' : 'À compléter',
              postal_code: '',
              city: '',
              siret: participant.company ? 'SIRET non renseigné' : 'À compléter'
            });
          } else if (companyByNameData) {
            console.log('✅ [SUCCESS] Entreprise trouvée par nom:', companyByNameData);
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
        console.error('Erreur lors de la récupération des données:', error);
                    }
                  };
                  
                  fetchCompanyAndSettings();
  }, [training.company_id, participant.company]);

  // Après avoir reçu la signature du participant
  useEffect(() => {
    if (participantSignature) {
      setHasParticipantSignature(true);
    }
  }, [participantSignature]);

  // Effet pour récupérer le tampon de l'organisme et le mémoriser
  useEffect(() => {
    const fetchOrganizationSeal = async () => {
      try {
        // D'abord vérifier dans le cache
        const cachedSeal = initialSignatures.organizationSeal;
        if (cachedSeal) {
          console.log('✅ [ORG_SEAL] Tampon trouvé dans le cache:', cachedSeal);
          setOrganizationSeal(cachedSeal);
          // Actualiser aussi le cache pour ne pas perdre l'information
          updateSignatureCache(undefined, undefined, cachedSeal);
          return;
        }
        
        // Vérifier si nous avons déjà une URL de tampon dans les paramètres de l'organisme
        if (organizationSettings?.organization_seal_url) {
          console.log('✅ [ORG_SEAL] URL du tampon trouvée dans les paramètres:', organizationSettings.organization_seal_url);
          
          // Ajouter un paramètre anticache
          const baseUrl = organizationSettings.organization_seal_url.split('?')[0];
          const timestamp = Date.now();
          const antiCacheUrl = `${baseUrl}?t=${timestamp}&forcereload=true`;
          
          // Attribuer directement l'URL au tampon d'organisme
          setOrganizationSeal(antiCacheUrl);
          // Mettre à jour le cache également
          updateSignatureCache(undefined, undefined, antiCacheUrl);
          return;
        }
        
        // Si aucune URL n'est présente dans les paramètres, rechercher dans les signatures
        const { data: sealData, error: sealError } = await supabase
          .from('document_signatures')
          .select('signature_url')
          .eq('signature_type', 'organizationSeal')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (sealError) {
          console.log('⚠️ [ORG_SEAL] Aucun tampon trouvé dans document_signatures:', sealError);
          return;
        }
        
        if (sealData && sealData.signature_url) {
          console.log('✅ [ORG_SEAL] Tampon trouvé dans document_signatures:', sealData.signature_url);
          
          // Ajouter un paramètre anticache
          const baseUrl = sealData.signature_url.split('?')[0];
          const timestamp = Date.now();
          const antiCacheUrl = `${baseUrl}?t=${timestamp}&forcereload=true`;
          
          // Attribuer l'URL au tampon d'organisme
          setOrganizationSeal(antiCacheUrl);
          // Mettre à jour le cache également
          updateSignatureCache(undefined, undefined, antiCacheUrl);
        }
      } catch (error) {
        console.error('❌ [ORG_SEAL] Erreur lors de la récupération du tampon d\'organisme:', error);
      }
    };
    
    // Exécuter seulement si nous avons les paramètres de l'organisme et que le tampon n'est pas déjà défini
    if ((organizationSettings || initialSignatures.organizationSeal) && !organizationSeal) {
      fetchOrganizationSeal();
    }
  }, [organizationSettings, organizationSeal, initialSignatures, updateSignatureCache]);

  // Lors de la signature locale
  const handleSignatureComplete = (dataURL: string) => {
    setLocalSignatureDataURL(dataURL);
    setHasParticipantSignature(true);
  };

  const generatePDF = async () => {
    if (!pdfContentRef.current) return;
    
    try {
      // Générer un nom de fichier basé sur le nom du participant et le titre de la formation
      const fileName = `Convention_${participant.first_name}_${participant.last_name}_${training.title.replace(/\s+/g, '_')}.pdf`;
      
      // Utiliser html2pdf pour générer et afficher le PDF
      const pdfBlob = await html2pdf().from(pdfContentRef.current).outputPdf('blob');
      
      // Créer une URL du blob et l'ouvrir dans une nouvelle fenêtre
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: fr });
    } catch (e) {
      console.error('Erreur de formatage de date:', e);
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
      console.log('🔍 [DEBUG] pdfContentRef est null, impossible de chercher les signatures');
      return result;
    }
    
    // Rechercher avec les sélecteurs les plus précis en premier
    // 1. Rechercher par attributs data-* spécifiques (méthode la plus fiable)
    const dataSignatureImages = pdfContentRef.current.querySelectorAll('[data-signature="true"]');
    console.log(`🔍 [DEBUG] ${dataSignatureImages.length} images avec attribut data-signature="true" trouvées`);
    
    if (dataSignatureImages.length > 0) {
      dataSignatureImages.forEach((img) => {
        const imgEl = img as HTMLImageElement;
        const type = imgEl.getAttribute('data-signature-type');
        console.log(`🔍 [DEBUG] Image de signature trouvée avec type: ${type}`, imgEl);
        
        if (type === 'participant') {
          result.participantImage = imgEl;
          console.log('✅ [DEBUG] Image de signature du participant trouvée dans le document');
        } else if (type === 'representative') {
          result.representativeImage = imgEl;
          console.log('✅ [DEBUG] Image de signature du représentant trouvée dans le document');
        }
      });
    }
    
    // 2. Si les attributs data-* n'ont pas fonctionné, rechercher par conteneurs parents
    if (!result.participantImage || !result.representativeImage) {
      console.log('🔍 [DEBUG] Recherche de signatures par conteneurs parents');
      
      // Rechercher les conteneurs de signature
      const participantContainer = pdfContentRef.current.querySelector('[data-signature-container="participant"]');
      const representativeContainer = pdfContentRef.current.querySelector('[data-signature-container="representative"]');
      
      if (participantContainer && !result.participantImage) {
        const img = participantContainer.querySelector('img');
        if (img) {
          result.participantImage = img as HTMLImageElement;
          console.log('✅ [DEBUG] Image de signature du participant trouvée par conteneur parent');
        }
      }
      
      if (representativeContainer && !result.representativeImage) {
        const img = representativeContainer.querySelector('img');
        if (img) {
          result.representativeImage = img as HTMLImageElement;
          console.log('✅ [DEBUG] Image de signature du représentant trouvée par conteneur parent');
        }
      }
    }
    
    // 3. Si aucune image n'a été trouvée, utiliser une méthode moins précise
    if (!result.participantImage && !result.representativeImage) {
      console.log('⚠️ [DEBUG] Aucune signature trouvée avec les méthodes précises, utilisation d\'heuristiques');
      
      // Rechercher toutes les images du document
      const allImages = pdfContentRef.current.querySelectorAll('img');
      console.log(`🔍 [DEBUG] ${allImages.length} images trouvées au total dans le document`);
      
      allImages.forEach((img) => {
        const imgEl = img as HTMLImageElement;
        const src = imgEl.src || '';
        
        // Analyser l'URL pour déterminer le type de signature
        if (src.includes('participant_convention') && !result.participantImage) {
          result.participantImage = imgEl;
          console.log('✅ [DEBUG] Image de signature du participant trouvée par heuristique URL');
        } else if ((src.includes('representative_convention') || 
                   src.includes('trainer_convention')) && 
                  !result.representativeImage) {
          result.representativeImage = imgEl;
          console.log('✅ [DEBUG] Image de signature du représentant trouvée par heuristique URL');
        }
      });
    }
    
    // Résumé final
    console.log('🔍 [DEBUG] Récapitulatif des signatures trouvées:');
    console.log('- Participant:', result.participantImage ? '✅ Trouvée' : '❌ Non trouvée');
    console.log('- Représentant:', result.representativeImage ? '✅ Trouvée' : '❌ Non trouvée');
    
    return result;
  };

  // Détecter si on est sur mobile
  const isMobile = window.innerWidth < 768;

  // Journaux pour le débogage des données du template
  useEffect(() => {
    console.log('🧩 [DEBUG] StudentTrainingAgreement - Rendu principal du template avec:', {
      'company complet': company,
      'a-t-on une entreprise': !!company,
      'props participant': participant,
      'a-t-on une entreprise participant': !!participant.company 
    });
  }, [company, participant]);

  // Définition de l'objet trainingAgreement pour centraliser les informations de signature
  useEffect(() => {
    // Création de l'objet trainingAgreement qui stocke toutes les signatures
    const trainingAgreementData = {
      signatures: {
        participant: participantSignature,
        companySeal: companySeal,
        organizationSeal: organizationSeal,
        trainer: null,          // Peut être défini si nécessaire
        representative: null    // Peut être défini si nécessaire
      }
    };

    // Stockage dans une variable accessible aux autres effets
    // @ts-ignore - Nous définissons la variable globalement pour qu'elle soit accessible aux autres effets
    window.trainingAgreement = trainingAgreementData;
    
    console.log('🔄 [DEBUG] trainingAgreement mis à jour:', trainingAgreementData);
  }, [participantSignature, companySeal, organizationSeal]);

  // Effet pour gérer l'insertion des tampons qui n'apparaissent pas correctement
  useEffect(() => {
    if (!companySeal && !organizationSeal) return;
    
    // Fonction de vérification avec limitation des tentatives
    const checkAndFixSeal = () => {
      // Limiter à 2 tentatives maximum pour éviter les boucles infinies
      if (sealAttemptsRef.current >= 2) {
        console.log('🔍 [INFO] Nombre maximum de tentatives atteint pour corriger l\'affichage du tampon');
      return;
    }

      sealAttemptsRef.current++;
      
      if (companySeal) {
        const companySealDisplayed = document.querySelector('.company-seal img, [data-seal-container="company"] img');
        if (!companySealDisplayed) {
          console.log(`🔍 [WARN] Le tampon n'est pas correctement affiché après enregistrement (tentative ${sealAttemptsRef.current}/2)`);
          forceSealDisplay();
        } else {
          console.log('✅ [SUCCESS] Tampon correctement affiché après correction');
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

  // Ajouter un effet pour mettre à jour automatiquement le cache quand les signatures changent
  useEffect(() => {
    log('🔄', '[AUTO_CACHE]', 'Mise à jour automatique du cache suite à modification des signatures');
    updateSignatureCache();
  }, [participantSignature, companySeal, organizationSeal, updateSignatureCache]);

  // S'assurer que l'état initial est correctement initialisé à partir du cache
  useEffect(() => {
    if (initialSignatures.participantSig || initialSignatures.companySeal || initialSignatures.trainerSig) {
      console.log('🔄 [INIT] Initialisation des signatures depuis le cache:');
      
      if (initialSignatures.participantSig) {
        console.log('✅ [INIT] Signature participant trouvée dans le cache');
        safeSetParticipantSignature(initialSignatures.participantSig);
        setIsSigned(true);
        setHasParticipantSignature(true);
      }
      
      if (initialSignatures.companySeal) {
        console.log('✅ [INIT] Tampon entreprise trouvé dans le cache');
        safeSetCompanySeal(initialSignatures.companySeal);
      }
      
      if (initialSignatures.organizationSeal) {
        console.log('✅ [INIT] Tampon organisme trouvé dans le cache');
        setOrganizationSeal(initialSignatures.organizationSeal);
      }
      
      if (initialSignatures.trainerSig) {
        console.log('✅ [INIT] Signature formateur trouvée dans le cache');
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
      console.log(`🔍 [SAVE] Sauvegarde du ${type === 'companySeal' ? 'tampon' : 'signature'} dans DocumentManager`);
      
      // Sauvegarder l'image avec le DocumentManager
      try {
        const correctedType = 
          type === 'participant' ? 'participant' : type;
        
        console.log(`🔍 [SAVE] Type de signature utilisé: ${correctedType} pour un document de type convention`);
        
        const signatureUrl = await DocumentManager.saveSignature({
          training_id: training.id,
          user_id: participant.id,
          signature: signatureDataUrl,
          type: 'convention',
          signature_type: correctedType as 'participant' | 'representative' | 'trainer' | 'companySeal' | 'organizationSeal',
          created_by: session.user.id
        });
        
        if (!signatureUrl) {
          throw new Error(`Impossible d'obtenir l'URL de ${type === 'companySeal' ? 'tampon' : 'signature'}`);
        }
        
        console.log(`🔍 [SAVE] ${type === 'companySeal' ? 'Tampon' : 'Signature'} enregistré:`, signatureUrl.substring(0, 50) + '...');
        
        // Anticacher l'URL
        const baseUrl = signatureUrl.split('?')[0];
        const timestamp = Date.now();
        const antiCacheUrl = `${baseUrl}?t=${timestamp}&forcereload=true`;
        
        // Précharger l'image avant de mettre à jour l'interface
        const img = new Image();
        img.onload = () => {
          console.log(`✅ [SAVE] Image de ${type === 'companySeal' ? 'tampon' : 'signature'} préchargée avec succès`);
          
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
              console.log('🔄 [SAVE] Mise à jour du statut de signature dans user_profiles');
              supabase
                .from('user_profiles')
                .update({ has_signed_agreement: true })
                .eq('id', participant.id)
                .then(({ error }) => {
                  if (error) {
                    console.error('❌ [SAVE] Erreur lors de la mise à jour du statut de signature:', error);
                  } else {
                    console.log('✅ [SAVE] Statut de signature mis à jour avec succès');
                  }
                });
            } catch (e) {
              console.error('❌ [SAVE] Erreur inattendue lors de la mise à jour du statut:', e);
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
          setShouldRefresh(prev => !prev);
        };
        
        img.onerror = () => {
          console.error(`❌ [SAVE] Erreur de préchargement de l'image de ${type === 'companySeal' ? 'tampon' : 'signature'}`);
          // Continuer malgré l'erreur
          if (type === 'companySeal') {
            safeSetCompanySeal(antiCacheUrl);
          } else {
            safeSetParticipantSignature(antiCacheUrl);
            setIsSigned(true);
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
        console.error(`🔍 [SAVE] Erreur lors de la sauvegarde:`, saveError);
        
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
      console.error(`❌ [SAVE] Erreur générale:`, error);
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
                onLoad={() => console.log('🔍 [DEBUG] Document iframe loaded successfully (convention)')}
                onError={() => {
                  console.error('🔍 [DEBUG] Error loading document iframe (convention)');
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
        <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">
              Signature de la convention
            </h2>
            <button
              onClick={() => setShowSignatureCanvas(false)}
              className="text-gray-400 hover:text-white transition-colors"
              disabled={isSaving}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-4">
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
        <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">
              Tampon de l'entreprise
            </h2>
            <button
              onClick={() => setShowSealCanvas(false)}
              className="text-gray-400 hover:text-white transition-colors"
              disabled={isSaving}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-4">
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
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 flex items-center justify-between border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {participantSignature ? "Convention de formation signée" : "Convention de formation"}
            {participantSignature && <span className="ml-2 text-sm bg-green-600 text-white px-2 py-0.5 rounded-full">Signée</span>}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-grow">
          {/* PDF Content */}
          <div 
            ref={pdfContentRef} 
            className="bg-white text-black p-8 rounded-lg"
            style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '14px' }}
          >
            {/* Affichage des détails de l'entreprise avant rendu */}
            <div style={{ display: 'none' }}>
              {company ? <div>{`Debug: Entreprise ${company.name}`}</div> : null}
            </div>
            <div id="training-agreement-template">
              <UnifiedTrainingAgreementTemplate
                training={{
                  id: training.id,
                  title: training.title,
                  duration: training.duration,
                  location: training.location,
                  start_date: training.start_date,
                  end_date: training.end_date,
                  trainer_name: training.trainer_name,
                  trainer_details: training.trainer_id,
                  evaluation_methods: training.evaluation_methods,
                  tracking_methods: training.tracking_methods,
                  pedagogical_methods: training.pedagogical_methods,
                  material_elements: training.material_elements,
                  objectives: training.objectives,
                  content: training.content,
                  price: training.price
                }}
                company={company || { 
                  name: participant.company || 'À compléter',
                  address: 'À compléter',
                  postal_code: '',
                  city: '',
                  siret: 'À compléter'
                }}
                participant={participant ? {
                  id: participant.id,
                  first_name: participant.first_name,
                  last_name: participant.last_name,
                  job_position: participant.job_position || '',
                  email: '',
                  company: participant.company
                } : undefined}
                participants={allTrainingParticipants.length > 0 
                  ? allTrainingParticipants 
                  : (participant ? [{
                      id: participant.id,
                      first_name: participant.first_name, 
                      last_name: participant.last_name,
                      job_position: participant.job_position || '',
                      email: '',
                      company: participant.company
                    }] : [])}
                participantSignature={participantSignature}
                companySeal={companySeal}
                organizationSeal={organizationSeal}
                viewContext="student"
                pdfMode={false}
                organizationSettings={organizationSettings || DEFAULT_ORGANIZATION_SETTINGS}
                trainerId={training.trainer_id}
                trainerSignature={trainerSignature}
              />
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-700 flex flex-wrap gap-3 justify-between">
          {!participantSignature ? (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowSignatureCanvas(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg flex-grow md:flex-grow-0"
              >
                Signer la convention
              </button>
                
              {/* Ajout du bouton pour le tampon d'entreprise */}
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
            <>
              {/* N'afficher le message de succès que si has_signed_agreement est TRUE */}
              {participant.has_signed_agreement && (
                <div className="flex items-center text-green-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Convention signée avec succès
                </div>
              )}
              
              {/* Toujours afficher les boutons de signature et tampon même si déjà signé */}
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
            </>
          )}
          
          <div className="flex flex-wrap gap-3">
            {participantSignature && (
              <>
                <button
                  onClick={generatePDF}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg flex items-center justify-center gap-2"
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Génération...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" /> Télécharger (signé)
                    </>
                  )}
                </button>
              </>
            )}
            
            <button
              onClick={generatePDF}
              className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg flex items-center justify-center gap-2 flex-grow md:flex-grow-0"
            >
              <Download className="w-5 h-5" /> Visualiser PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Restaurer la fonction forceSealDisplay qui a été supprimée par erreur
// Fonction pour forcer l'affichage des tampons qui ne s'affichent pas correctement
const forceSealDisplay = () => {
  if (!companySeal) return;
  
  try {
    // Limiter le nombre de tentatives pour éviter les boucles infinies
    if (sealAttemptsRef.current >= 2) {
      console.log('🛑 [FORCE] Nombre maximum de tentatives atteint (2), abandon');
      return;
    }
    
    // Incrémenter le compteur de tentatives
    sealAttemptsRef.current++;
    
    // Nettoyer l'URL et ajouter un unique paramètre de timestamp
    const baseUrl = companySeal.split('?')[0];
    const timestamp = Date.now();
    const cleanSealUrl = `${baseUrl}?t=${timestamp}&forcereload=true`;
    
    console.log('🔧 [FORCE] Nettoyage de l\'URL du tampon:', cleanSealUrl);
    
    // Utiliser le cache d'images pour éviter les rechargements multiples
    if (PRELOADED_IMAGES[baseUrl]) {
      console.log('✅ [CACHE] Image déjà dans le cache local, utilisation directe');
      safeSetCompanySeal(cleanSealUrl);
      // Mettre à jour le cache global
      GLOBAL_SIGNATURE_CACHE.setCache(training.id, participant.id, {companySeal: cleanSealUrl});
      // Rafraîchir le composant
      setShouldRefresh(prev => !prev);
      return;
    }
    
    // Précharger l'image
    const img = new Image();
    img.onload = () => {
      console.log('✅ [FORCE] Image du tampon préchargée avec succès, mise à jour de l\'URL');
      
      // Ajouter au cache local d'images
      PRELOADED_IMAGES[baseUrl] = true;
      
      safeSetCompanySeal(cleanSealUrl);
      // Mettre à jour le cache global
      GLOBAL_SIGNATURE_CACHE.setCache(training.id, participant.id, {companySeal: cleanSealUrl});
      // Rafraîchir le composant
      setShouldRefresh(prev => !prev);
    };
    img.onerror = () => {
      console.error('❌ [FORCE] Erreur de préchargement de l\'image du tampon');
    };
    img.src = cleanSealUrl;
  } catch (error) {
    console.error('❌ [FORCE] Erreur lors du forçage de l\'affichage du tampon:', error);
  }
};