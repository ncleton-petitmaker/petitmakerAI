import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Download, RefreshCw, Pen, Stamp, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SignatureCanvas from '../SignatureCanvas';
import { generateDocumentPDF } from './DocumentUtils';
import { DocumentManager } from './DocumentManager';
import { DocumentSignatureManager, DocumentType, SignatureType } from './DocumentSignatureManager';
import { Button, Modal, ModalHeader, ModalFooter, ModalBody } from '../ui/Modal';
import { TrainingAgreementTemplate } from '../admin/TrainingAgreementTemplate';
import Loader from '../ui/Loader';
import { toast } from 'react-toastify';
import { useTrainingContext } from '../../contexts/TrainingContext';
import { diagnoseAndFixOrganizationSeal, forceOrganizationSealInDOM } from '../../utils/SignatureUtils';

interface DocumentWithSignaturesProps {
  documentType: DocumentType;
  trainingId: string;
  participantId: string;
  participantName: string;
  viewContext: 'crm' | 'student';
  onCancel: () => void;
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
  
  // Template du document à afficher
  renderTemplate: (templateProps: {
    participantSignature: string | null;
    representativeSignature: string | null;
    trainerSignature: string | null;
    companySeal: string | null;
    organizationSeal: string | null;
  }) => React.ReactNode;
  
  // Titre du document pour le PDF
  documentTitle: string;
  // Permettre le tampon d'entreprise
  allowCompanySeal?: boolean;
  // Permettre le tampon de l'organisme
  allowOrganizationSeal?: boolean;
}

// Ajuster le type pour inclure 'representative'
export type FullSignatureType = 'participant' | 'representative' | 'trainer' | 'companySeal' | 'organizationSeal';

/**
 * Composant générique pour gérer les documents avec signatures
 * 
 * Ce composant peut être utilisé pour tous les types de documents qui nécessitent 
 * des signatures (convention, attestation, feuille d'émargement, etc.).
 * Il gère automatiquement les signatures et la génération du PDF.
 */
export const DocumentWithSignatures: React.FC<DocumentWithSignaturesProps> = ({
  documentType,
  trainingId,
  participantId,
  participantName,
  viewContext,
  onCancel,
  onDocumentOpen,
  onDocumentClose,
  renderTemplate,
  documentTitle,
  allowCompanySeal = true,
  allowOrganizationSeal = true
}) => {
  const documentRef = useRef<HTMLDivElement>(null);
  const [showSignatureForm, setShowSignatureForm] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingDocumentUrl, setExistingDocumentUrl] = useState<string | null>(null);
  
  // États pour les signatures
  const [participantSignature, setParticipantSignature] = useState<string | null>(null);
  const [representativeSignature, setRepresentativeSignature] = useState<string | null>(null);
  const [trainerSignature, setTrainerSignature] = useState<string | null>(null);
  const [companySeal, setCompanySeal] = useState<string | null>(null);
  const [organizationSeal, setOrganizationSeal] = useState<string | null>(null);
  
  // Pour la signature active
  const [selectedSignatureType, setSelectedSignatureType] = useState<FullSignatureType>('participant');
  
  // Nouvel état pour distinguer l'action en cours (signature ou tampon)
  const [currentAction, setCurrentAction] = useState<'signature' | 'seal' | null>(null);
  
  // État pour le chargement
  const [isLoading, setIsLoading] = useState(true);
  
  // État pour stocker les infos du formateur
  const [trainerName, setTrainerName] = useState<string>('');
  
  // Gestionnaire de signatures
  const signatureManagerRef = useRef<DocumentSignatureManager | null>(null);
  
  // Vérifier si le document nécessite un tampon
  const [needStamp, setNeedStamp] = useState<boolean>(documentType === DocumentType.CONVENTION);
  
  // Ajout d'un état pour suivre si l'utilisateur a le droit d'ajouter un tampon
  const [canAddSeal, setCanAddSeal] = useState<boolean>(false);
  
  // Intercepter les événements de soumission pour empêcher le rechargement de la page
  useEffect(() => {
    // Fonction pour prévenir les rechargements de page et logger l'événement
    const preventReload = (e: Event) => {
      console.log(`🛑 [DEBUG] Intercepté événement pouvant causer rechargement: ${e.type}`, e);
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Liste des événements qui pourraient causer un rechargement
    const reloadEvents = ['submit', 'beforeunload', 'unload', 'navigate'];
    
    // Ajouter des écouteurs sur le document pour tous ces événements
    reloadEvents.forEach(eventType => {
      document.addEventListener(eventType, preventReload, true);
    });

    // Trouver tous les formulaires existants et ajouter des écouteurs
    document.querySelectorAll('form').forEach(form => {
      form.onsubmit = preventReload;
    });

    // Observer l'ajout de nouveaux formulaires
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) {
            const forms = node.querySelectorAll('form');
            forms.forEach(form => {
              console.log('🛑 [DEBUG] Nouveau formulaire détecté, ajout de listener pour éviter soumission');
              form.onsubmit = preventReload;
            });
          }
        });
      });
    });

    // Démarrer l'observation du document entier
    observer.observe(document.documentElement, { 
      childList: true, 
      subtree: true 
    });

    // Nettoyer à la destruction du composant
    return () => {
      reloadEvents.forEach(eventType => {
        document.removeEventListener(eventType, preventReload, true);
      });
      observer.disconnect();
    };
  }, []);
  
  // Fonction pour charger les informations du document, y compris need_stamp
  const loadDocumentInfo = async () => {
    try {
      console.log('🔍 [DEBUG] Chargement des infos du document:', {
        documentType,
        trainingId,
        participantId
      });
      
      const { data: documents, error } = await supabase
        .from('documents')
        .select('id, need_stamp')
        .eq('type', documentType)
        .eq('training_id', trainingId)
        .eq('participant_id', participantId)
        .limit(1);
      
      if (error) {
        console.error('❌ [ERROR] Erreur lors du chargement des infos du document:', error);
        return;
      }
      
      if (documents && documents.length > 0) {
        const document = documents[0];
        console.log('🔍 [DEBUG] Document trouvé en BD:', document);
        
        // Si need_stamp est null ou undefined, utiliser le défaut pour les conventions
        if (document.need_stamp === null || document.need_stamp === undefined) {
          const defaultNeedStamp = documentType === DocumentType.CONVENTION;
          setNeedStamp(defaultNeedStamp);
          console.log('🔧 [DIAGNOSTIC_TAMPON] need_stamp null/undefined en BD, valeur par défaut utilisée:', defaultNeedStamp);
        } else {
          setNeedStamp(document.need_stamp);
          console.log('🔧 [DIAGNOSTIC_TAMPON] need_stamp chargé depuis la BD:', document.need_stamp);
        }
      } else {
        // Par défaut, les conventions nécessitent un tampon
        const defaultNeedStamp = documentType === DocumentType.CONVENTION;
        setNeedStamp(defaultNeedStamp);
        console.log('🔧 [DIAGNOSTIC_TAMPON] Document non trouvé en BD, need_stamp par défaut:', defaultNeedStamp);
        
        // Créer une entrée dans la BD avec need_stamp=true pour les conventions
        if (defaultNeedStamp) {
          console.log('🔧 [DIAGNOSTIC_TAMPON] Création d\'un document avec need_stamp=true pour convention');
          try {
            const { data, error } = await supabase
              .from('documents')
              .insert({
                type: documentType,
                training_id: trainingId,
                participant_id: participantId,
                need_stamp: defaultNeedStamp,
                status: 'draft'
              });
              
            if (error) {
              console.error('❌ [ERROR] Erreur lors de la création du document avec need_stamp:', error);
            } else {
              console.log('✅ [SUCCESS] Document créé avec need_stamp=true');
            }
          } catch (createError) {
            console.error('❌ [ERROR] Exception lors de la création du document:', createError);
          }
        }
      }
    } catch (error) {
      console.error('❌ [ERROR] Exception lors du chargement des infos du document:', error);
    }
  };

  // Charger need_stamp au chargement
  useEffect(() => {
    loadDocumentInfo();
  }, [documentType, trainingId, participantId]);

  // Fonction pour mettre à jour need_stamp
  const updateNeedStamp = async (value: boolean) => {
    try {
      console.log('🔍 [DEBUG] Mise à jour de need_stamp:', value);
      setNeedStamp(value);
      
      // Rechercher le document
      const { data: documents, error: selectError } = await supabase
        .from('documents')
        .select('id')
        .eq('type', documentType)
        .eq('training_id', trainingId)
        .eq('participant_id', participantId)
        .limit(1);
      
      if (selectError) {
        console.error('❌ [ERROR] Erreur lors de la recherche du document:', selectError);
        return;
      }
      
      if (documents && documents.length > 0) {
        // Mettre à jour le document existant
        const { error: updateError } = await supabase
          .from('documents')
          .update({ need_stamp: value })
          .eq('id', documents[0].id);
        
        if (updateError) {
          console.error('❌ [ERROR] Erreur lors de la mise à jour de need_stamp:', updateError);
        } else {
          console.log('✅ [SUCCESS] need_stamp mis à jour avec succès');
        }
      } else {
        // Créer un nouveau document
        const { error: insertError } = await supabase
          .from('documents')
          .insert({
            type: documentType,
            training_id: trainingId,
            participant_id: participantId,
            need_stamp: value,
            status: 'draft'
          });
        
        if (insertError) {
          console.error('❌ [ERROR] Erreur lors de la création du document avec need_stamp:', insertError);
        } else {
          console.log('✅ [SUCCESS] Document créé avec need_stamp:', value);
        }
      }
    } catch (error) {
      console.error('❌ [ERROR] Exception lors de la mise à jour de need_stamp:', error);
    }
  };
  
  // À l'initialisation, créer et initialiser le gestionnaire de signatures
  useEffect(() => {
    const createManager = async () => {
      try {
        console.log('🔍 [DEBUG] Initialisation du gestionnaire de signatures pour document:', 
          { type: documentType, trainingId, participantId, viewContext });
        
        // Créer le gestionnaire de signatures
        const manager = new DocumentSignatureManager(
          documentType,
          trainingId,
          participantId,
          participantName,
          viewContext,
          handleSignatureChange
        );
        
        // Initialiser le gestionnaire (chargement des signatures existantes)
        await manager.initialize();
        
        // Stocker le gestionnaire dans la référence
        signatureManagerRef.current = manager;
        
        // Mettre à jour les états avec les signatures chargées
        const signatures = manager.getSignatures();
        console.log('🔍 [DEBUG] Signatures chargées après initialisation:', signatures);
        
        // CORRECTION: S'assurer que les signatures sont correctement mises à jour dans l'état
        if (signatures.participant !== undefined) setParticipantSignature(signatures.participant);
        if (signatures.representative !== undefined) setRepresentativeSignature(signatures.representative);
        if (signatures.trainer !== undefined) setTrainerSignature(signatures.trainer);
        if (signatures.companySeal !== undefined) setCompanySeal(signatures.companySeal);
        if (signatures.organizationSeal !== undefined) setOrganizationSeal(signatures.organizationSeal);
        
        // CORRECTION: Vérifier et logger les signatures qui seront utilisées
        console.log('🔍 [DEBUG] État des signatures après mise à jour:', {
          participantSignature: signatures.participant,
          representativeSignature: signatures.representative,
          trainerSignature: signatures.trainer,
          companySeal: signatures.companySeal,
          organizationSeal: signatures.organizationSeal
        });
        
        // Vérifier s'il existe déjà un document
        const documentUrl = await DocumentManager.getLastDocument({
          training_id: trainingId,
          user_id: participantId,
          type: documentType as 'convention' | 'attestation' | 'emargement'
        });
        
        setExistingDocumentUrl(documentUrl);
        setIsLoading(false);
      } catch (error) {
        console.error('Erreur lors de l\'initialisation du gestionnaire de signatures:', error);
        setIsLoading(false);
      }
    };
    
    // Exécuter la création du gestionnaire
    createManager();
    
    // Indiquer que le document a été ouvert
    if (onDocumentOpen) {
      onDocumentOpen();
    }
    
    // Cleanup: indiquer que le document a été fermé
    return () => {
      if (onDocumentClose) {
        onDocumentClose();
      }
    };
  }, [documentType, trainingId, participantId, participantName, viewContext, onDocumentOpen, onDocumentClose]);

  // Récupérer le nom du formateur si on est dans le contexte CRM
  useEffect(() => {
    const fetchTrainerName = async () => {
      if (viewContext === 'crm') {
        try {
          console.log('🔍 [DEBUG] Récupération des informations du formateur pour la formation:', trainingId);
          const { data, error } = await supabase
            .from('trainings')
            .select('trainer_name')
            .eq('id', trainingId)
            .single();
          
          if (error) {
            console.error('Erreur lors de la récupération du formateur:', error);
            return;
          }
          
          if (data && data.trainer_name) {
            console.log('🔍 [DEBUG] Nom du formateur récupéré:', data.trainer_name);
            setTrainerName(data.trainer_name);
          }
        } catch (error) {
          console.error('Exception lors de la récupération du formateur:', error);
        }
      }
    };
    
    fetchTrainerName();
  }, [trainingId, viewContext]);
  
  // Gestionnaire pour le changement de signature
  const handleSignatureChange = (type: SignatureType, signature: string | null) => {
    console.log('🧪 [DIAGNOSTIC_SIGNATURE] Changement de signature détecté:', { 
      type, 
      signaturePresent: !!signature,
      url: signature?.substring(0, 50)
    });
    
    // Mettre à jour l'état correspondant
    if (type === 'participant') {
        setParticipantSignature(signature);
      console.log('🧪 [DIAGNOSTIC_SIGNATURE] Mise à jour état participantSignature:', !!signature);
    } else if (type === 'representative') {
        setRepresentativeSignature(signature);
      console.log('🧪 [DIAGNOSTIC_SIGNATURE] Mise à jour état representativeSignature:', !!signature);
    } else if (type === 'trainer') {
        setTrainerSignature(signature);
      console.log('🧪 [DIAGNOSTIC_SIGNATURE] Mise à jour état trainerSignature:', !!signature);
    } else if (type === 'companySeal') {
        setCompanySeal(signature);
      console.log('🧪 [DIAGNOSTIC_SIGNATURE] Mise à jour état companySeal:', !!signature);
    } else if (type === 'organizationSeal') {
        setOrganizationSeal(signature);
      console.log('🧪 [DIAGNOSTIC_SIGNATURE] Mise à jour état organizationSeal:', !!signature);
    }
  };
  
  // Fonction pour télécharger le document
  const handleDownload = async () => {
    if (!documentRef.current) return;
    
    setIsGeneratingPDF(true);
    
    try {
      // Générer le PDF à partir du contenu actuel
      const pdfBlob = await generateDocumentPDF(documentRef.current);
      
      // Créer une URL pour le blob
      const url = URL.createObjectURL(pdfBlob);
      
      // Créer un lien pour le téléchargement
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentTitle}_${participantName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Nettoyer
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  
  // Fonction pour gérer l'ouverture du panneau de signature
  const handleSignClick = () => {
    setCurrentAction('signature');
    setSelectedSignatureType(viewContext === 'student' ? 'participant' : 'trainer');
    setShowSignatureForm(true);
  };
  
  // Gestionnaire d'événement pour la fermeture du modal de signature
  const handleCloseSignatureForm = () => {
      setShowSignatureForm(false);
  };
  
  // Gestionnaire pour annuler la signature
  const handleSignatureCancel = () => {
    setShowSignatureForm(false);
    setCurrentAction(null);
  };
  
  // Convertir les types de signature pour le SignatureCanvas
  const convertSignatureType = (type: FullSignatureType): 'trainer' | 'participant' | 'organizationSeal' | 'companySeal' => {
    if (type === 'representative') return 'trainer';
    return type as 'trainer' | 'participant' | 'organizationSeal' | 'companySeal';
  };
  
  // Vérifier si l'utilisateur a le droit de signer
  const canSign = (): boolean => {
    if (!signatureManagerRef.current || isLoading) return false;
    
    // Vérifier si l'utilisateur peut signer
    const signatureType = viewContext === 'crm' ? 'trainer' : 'participant';
    const signButtonState = signatureManagerRef.current.canSign(signatureType);
    
    return signButtonState.canSign;
  };
  
  // Nouveau: Vérifie si toutes les signatures requises sont présentes, y compris le tampon si activé
  const isDocumentComplete = (): boolean => {
    if (!signatureManagerRef.current) return false;
    
    // Si un tampon est nécessaire mais qu'il n'est pas présent, le document n'est pas complet
    if (needStamp) {
      const hasRequiredSeal = viewContext === 'crm' 
        ? !!organizationSeal 
        : !!companySeal;
      
      if (!hasRequiredSeal) {
        console.log('🧪 [DIAGNOSTIC_COMPLETION] Le document n\'est pas complet car le tampon est absent');
        return false;
      }
    }
    
    // Vérifier si toutes les signatures requises sont présentes
    const isSignaturesComplete = signatureManagerRef.current.isFullySigned();
    console.log('🧪 [DIAGNOSTIC_COMPLETION] État des signatures:', isSignaturesComplete);
    
    return isSignaturesComplete;
  };
  
  // Affichage du bouton de signature
  const renderSignButton = () => {
    if (!signatureManagerRef.current || isLoading) return null;
    
    console.log('🔍 [DEBUG] DocumentWithSignatures - État du bouton de signature:', viewContext, documentType);
    
    // Si on est en mode CRM et qu'il s'agit d'une convention, toujours afficher le bouton
    if (viewContext === 'crm' && documentType === DocumentType.CONVENTION) {
      return (
        <button
          onClick={handleSignClick}
          disabled={isSaving}
          className="mt-4 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center"
        >
          <Pen className="mr-2 h-4 w-4" />
          {isSaving && currentAction === 'signature' ? 'Enregistrement...' : 'Signer le document'}
        </button>
      );
    }
    
    // Vérifier si l'utilisateur peut signer
    if (canSign()) {
    const buttonState = signatureManagerRef.current.getSignatureButtonState();
    
      return (
        <button
          onClick={handleSignClick}
          disabled={isSaving}
          className="mt-4 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center"
        >
          <Pen className="mr-2 h-4 w-4" />
          {isSaving && currentAction === 'signature' ? 'Enregistrement...' : buttonState.text}
        </button>
      );
    }
    
    // Afficher un message d'attente si nécessaire
    if (!signatureManagerRef.current.isFullySigned()) {
      return (
        <div className="mt-4 px-4 py-2 bg-gray-200 text-gray-600 rounded-md text-center flex items-center">
          <FileText className="mr-2 h-4 w-4" />
          {signatureManagerRef.current.getSignatureStatusMessage()}
        </div>
      );
    }
    
    return null;
  };
  
  // Affichage du bouton de téléchargement
  const renderDownloadButton = () => {
    // Afficher le bouton de téléchargement si le document est entièrement signé
    if (isDocumentComplete()) {
      return (
        <button
          onClick={handleDownload}
          disabled={isGeneratingPDF}
          className="mt-4 ml-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
        >
          <Download className="mr-2 h-4 w-4" />
          {isGeneratingPDF ? 'Génération...' : 'Télécharger'}
        </button>
      );
    }
    
    return null;
  };
  
  // Affichage du bouton pour voir le document existant
  const renderViewDocumentButton = () => {
    if (existingDocumentUrl) {
      return (
        <a
          href={existingDocumentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 ml-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 inline-flex items-center"
        >
          Voir le document signé
        </a>
      );
    }
    
    return null;
  };
  
  /**
   * Rafraîchit les signatures après des changements
   */
  const refreshSignatures = async (force = false) => {
    console.log('🚨 [URGENT] Rafraîchissement des signatures...');
    
    try {
      if (signatureManagerRef.current) {
        // Forcer le rafraîchissement des signatures depuis la base de données
        const sigs = await signatureManagerRef.current.forceRefreshSignatures();
        
        // Mettre à jour les états locaux des signatures, uniquement si elles sont absentes ou si force=true
        if (!participantSignature || force) {
          setParticipantSignature(sigs.participant);
          console.log('🚨 [URGENT] Mise à jour participantSignature:', {
            exists: !!sigs.participant,
            url: sigs.participant?.substring(0, 50) + '...',
            viewContext
          });
        }
        
        if (!representativeSignature || force) {
          setRepresentativeSignature(sigs.representative);
          console.log('🚨 [URGENT] Mise à jour representativeSignature:', {
            exists: !!sigs.representative,
            url: sigs.representative?.substring(0, 50) + '...',
            viewContext
          });
        }
        
        if (!trainerSignature || force) {
          setTrainerSignature(sigs.trainer);
          console.log('🚨 [URGENT] Mise à jour trainerSignature:', {
            exists: !!sigs.trainer,
            url: sigs.trainer?.substring(0, 50) + '...',
            viewContext
          });
        }
        
        if (!companySeal || force) {
          setCompanySeal(sigs.companySeal);
          console.log('🚨 [URGENT] Mise à jour companySeal:', !!sigs.companySeal);
        }
        
        if (!organizationSeal || force) {
          setOrganizationSeal(sigs.organizationSeal || null);
          console.log('🚨 [URGENT] Mise à jour organizationSeal:', !!sigs.organizationSeal);
        }
        
        // RÉSOLUTION AUTOMATIQUE: Si signature du représentant manquante mais formateur présente
        if ((!representativeSignature && sigs.trainer && viewContext === 'student') || force) {
          console.log('🚨 [URGENT] Signature du représentant manquante mais formateur présent. Création auto...');
          const representativeUrl = await signatureManagerRef.current.createRepresentativeSignature();
          
          if (representativeUrl) {
            console.log('🚨 [URGENT] Signature représentant créée avec succès:', representativeUrl);
            setRepresentativeSignature(representativeUrl);
          } else {
            console.error('🚨 [URGENT] Échec de création auto de la signature représentant');
          }
        } else if (!sigs.representative) {
          console.warn('🚨 [URGENT] Signature du représentant manquante');
        }
        
        // NOUVELLE FONCTIONNALITÉ: Garantir que les signatures sont visibles dans tous les contextes
        if (force) {
          await forceSignatureDisplay();
        }
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des signatures:', error);
    }
  };

  /**
   * Force l'affichage de toutes les signatures indépendamment du contexte
   */
  const forceSignatureDisplay = async () => {
    console.log('🧿 [CROSS_DISPLAY] Forçage de l\'affichage croisé des signatures');
    
    try {
      // 1. Assurer que la signature du participant est visible côté formateur
      if (viewContext === 'crm' && !participantSignature && participantId) {
        console.log('🧿 [CROSS_DISPLAY] Recherche signature participant pour formateur', participantId);
        
        const { data: participantSigs } = await supabase
          .from('documents')
          .select('file_url')
          .eq('title', 'Signature du participant')
          .eq('user_id', participantId)
          .eq('type', documentType)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (participantSigs && participantSigs.length > 0 && participantSigs[0].file_url) {
          console.log('🧿 [CROSS_DISPLAY] Signature participant trouvée pour formateur:', 
            participantSigs[0].file_url.substring(0, 50) + '...');
          setParticipantSignature(participantSigs[0].file_url);
          
          // Mise à jour du DOM
          setTimeout(() => {
            const participantImgs = document.querySelectorAll('[data-signature-type="participant"]');
            if (participantImgs.length > 0) {
              console.log(`🧿 [CROSS_DISPLAY] Mise à jour de ${participantImgs.length} éléments signature participant dans le DOM`);
              participantImgs.forEach(img => {
                if (img instanceof HTMLImageElement) {
                  img.src = participantSigs[0].file_url;
                  img.style.visibility = 'visible';
                  img.style.display = 'block';
                }
              });
            }
          }, 500);
        }
      }
      
      // 2. Assurer que la signature du formateur est visible côté apprenant
      if (viewContext === 'student' && !trainerSignature && trainingId) {
        console.log('🧿 [CROSS_DISPLAY] Recherche signature formateur pour apprenant', trainingId);
        
        const { data: trainerSigs } = await supabase
          .from('documents')
          .select('file_url')
          .eq('title', 'Signature du formateur')
          .eq('training_id', trainingId)
          .eq('type', documentType)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (trainerSigs && trainerSigs.length > 0 && trainerSigs[0].file_url) {
          console.log('🧿 [CROSS_DISPLAY] Signature formateur trouvée pour apprenant:', 
            trainerSigs[0].file_url.substring(0, 50) + '...');
          setTrainerSignature(trainerSigs[0].file_url);
          
          // Mise à jour du DOM
          setTimeout(() => {
            const trainerImgs = document.querySelectorAll('[data-signature-type="trainer"]');
            if (trainerImgs.length > 0) {
              console.log(`🧿 [CROSS_DISPLAY] Mise à jour de ${trainerImgs.length} éléments signature formateur dans le DOM`);
              trainerImgs.forEach(img => {
                if (img instanceof HTMLImageElement) {
                  img.src = trainerSigs[0].file_url;
                  img.style.visibility = 'visible';
                  img.style.display = 'block';
                }
              });
            }
          }, 500);
        }
      }
      
      // 3. Vérifier l'état final du DOM après les modifications
      setTimeout(() => {
        const allSignatures = document.querySelectorAll('[data-signature="true"]');
        console.log(`🧿 [CROSS_DISPLAY] État final du DOM: ${allSignatures.length} signatures trouvées`);
        
        allSignatures.forEach(sig => {
          if (sig instanceof HTMLImageElement) {
            const type = sig.getAttribute('data-signature-type');
            const isVisible = sig.style.display !== 'none' && sig.style.visibility !== 'hidden';
            console.log(`🧿 [CROSS_DISPLAY] Signature ${type}: visible=${isVisible}, src=${sig.src.substring(0, 50)}...`);
          }
        });
      }, 1000);
      
    } catch (error) {
      console.error('🧿 [CROSS_DISPLAY] Erreur lors du forçage de l\'affichage croisé:', error);
    }
  };

  // Rafraîchir les signatures au chargement du composant et périodiquement
  useEffect(() => {
    // Rafraîchir les signatures uniquement lors de l'initialisation
    if (signatureManagerRef.current && !isLoading) {
      console.log('🚨 [URGENT] Chargement initial des signatures');
      
      // Rafraîchir immédiatement une seule fois
      refreshSignatures();
      
      // Forcer explicitement la visibilité croisée des signatures une seule fois
      const forceCrossVisibilityOnce = async () => {
        if (signatureManagerRef.current) {
          console.log('🧿 [CROSS_DISPLAY] Forçage initial de la visibilité croisée des signatures');
          await signatureManagerRef.current.enforceCrossSignatureVisibility();
          
          // Mettre à jour les états locaux avec les nouvelles signatures
          if (signatureManagerRef.current) {
            const sigs = signatureManagerRef.current.getSignatures();
            
            // Ne mettre à jour que les signatures qui n'existent pas encore
            if (!participantSignature && sigs.participant) setParticipantSignature(sigs.participant);
            if (!representativeSignature && sigs.representative) setRepresentativeSignature(sigs.representative);
            if (!trainerSignature && sigs.trainer) setTrainerSignature(sigs.trainer);
            if (!companySeal && sigs.companySeal) setCompanySeal(sigs.companySeal);
            if (!organizationSeal && sigs.organizationSeal) setOrganizationSeal(sigs.organizationSeal || null);
            
            console.log('🧿 [CROSS_DISPLAY] États de signatures initialisés:', {
              participant: !!participantSignature || !!sigs.participant,
              representative: !!representativeSignature || !!sigs.representative,
              trainer: !!trainerSignature || !!sigs.trainer,
              companySeal: !!companySeal || !!sigs.companySeal, 
              organizationSeal: !!organizationSeal || !!sigs.organizationSeal
            });
          }
        }
      };
      
      // Exécuter le forçage après un court délai pour laisser le temps au chargement initial
      const initialForceTimeout = setTimeout(forceCrossVisibilityOnce, 2000);
      
      // Pour la vue étudiant, forcer le tampon d'organisation une seule fois
      if (viewContext === 'student') {
        console.log('🚨 [URGENT] Application initiale du tampon pour les apprenants');
        
        // Forcer l'affichage du tampon d'organisation directement dans le DOM une seule fois
        const forceSealOnce = () => {
          console.log('🚨 [URGENT] Forçage initial du tampon d\'organisation dans le DOM');
          forceOrganizationSealInDOM();
        };
        
        // Exécuter après un court délai pour laisser le DOM se charger
        const initialSealTimeout = setTimeout(forceSealOnce, 2500);
        
        return () => {
          clearTimeout(initialSealTimeout);
          clearTimeout(initialForceTimeout);
        };
      }
      
      return () => {
        clearTimeout(initialForceTimeout);
      };
    }
  }, [signatureManagerRef.current, isLoading]);
  
  // Effet pour afficher automatiquement le tampon d'organisation quand une signature formateur est ajoutée
  useEffect(() => {
    // Si la signature du formateur existe et que c'est une convention
    if (trainerSignature && documentType === DocumentType.CONVENTION && !organizationSeal) {
      console.log('🔍 [DEBUG] Signature formateur détectée, application unique du tampon d\'organisation');
      
      const applyOrganizationSealOnce = async () => {
        try {
          // Forcer l'affichage du tampon
          await forceOrganizationSealInDOM();
          
          // Si le tampon n'est pas déjà défini dans l'état, le récupérer
          if (!organizationSeal) {
            console.log('🔍 [DEBUG] Récupération du tampon d\'organisation depuis les paramètres');
            
            // Récupérer depuis les paramètres de l'organisation
            const { data: settings } = await supabase
              .from('organization_settings')
              .select('organization_seal_url, organization_seal_path')
              .single();
              
            if (settings?.organization_seal_url) {
              console.log('🔍 [DEBUG] URL du tampon trouvée dans les paramètres:', settings.organization_seal_url);
              setOrganizationSeal(settings.organization_seal_url);
              
              // Si un gestionnaire de signatures existe, sauvegarder le tampon
              if (signatureManagerRef.current) {
                console.log('🔍 [DEBUG] Enregistrement du tampon dans le gestionnaire de signatures');
                await signatureManagerRef.current.saveSignature(settings.organization_seal_url, 'organizationSeal');
              }
            } 
            else if (settings?.organization_seal_path) {
              console.log('🔍 [DEBUG] Chemin du tampon trouvé dans les paramètres:', settings.organization_seal_path);
              const { data: urlData } = await supabase.storage
                .from('signatures')
                .getPublicUrl(settings.organization_seal_path);
                
              if (urlData.publicUrl) {
                console.log('🔍 [DEBUG] URL générée pour le tampon:', urlData.publicUrl);
                setOrganizationSeal(urlData.publicUrl);
                
                // Si un gestionnaire de signatures existe, sauvegarder le tampon
                if (signatureManagerRef.current) {
                  console.log('🔍 [DEBUG] Enregistrement du tampon dans le gestionnaire de signatures');
                  await signatureManagerRef.current.saveSignature(urlData.publicUrl, 'organizationSeal');
                }
              }
            }
          }
        } catch (error) {
          console.error('🔍 [ERROR] Erreur lors de l\'application du tampon d\'organisation:', error);
        }
      };
      
      // Exécuter la fonction une seule fois après un court délai
      setTimeout(applyOrganizationSealOnce, 1000);
    }
  }, [trainerSignature, documentType]);

  // Assurer que la signature du formateur est visible côté apprenant
  useEffect(() => {
    // Uniquement si nous sommes dans la vue étudiant et qu'aucune signature formateur n'est encore visible
    if (viewContext === 'student' && !trainerSignature && documentType === DocumentType.CONVENTION) {
      console.log('🚨 [URGENT] Vue étudiant: Vérification de la visibilité de la signature formateur');
      
      const ensureTrainerSignatureVisible = async () => {
        try {
          if (signatureManagerRef.current) {
            // Forcer le chargement de la signature formateur
            console.log('🚨 [URGENT] Tentative de chargement de la signature formateur');
            await signatureManagerRef.current.loadSignature('trainer');
            
            // Récupérer la signature formateur depuis le gestionnaire
            const signatures = signatureManagerRef.current.getSignatures();
            if (signatures.trainer && !trainerSignature) {
              console.log('🚨 [URGENT] Signature formateur trouvée, mise à jour de l\'affichage:', signatures.trainer);
              setTrainerSignature(signatures.trainer);
            } else {
              // Si toujours pas de signature, essayer la visibilité croisée
              console.log('🚨 [URGENT] Tentative de forçage de visibilité croisée');
              await signatureManagerRef.current.enforceCrossSignatureVisibility();
              
              // Vérifier à nouveau après la visibilité croisée
              const updatedSignatures = signatureManagerRef.current.getSignatures();
              if (updatedSignatures.trainer && !trainerSignature) {
                console.log('🚨 [URGENT] Signature formateur trouvée après visibilité croisée:', updatedSignatures.trainer);
                setTrainerSignature(updatedSignatures.trainer);
              } else {
                console.log('🚨 [URGENT] Aucune signature formateur trouvée après visibilité croisée');
                
                // Recherche directe dans la base de données
                const { data: trainerDocs, error: trainerError } = await supabase
                  .from('documents')
                  .select('file_url')
                  .eq('training_id', trainingId)
                  .eq('title', "Signature du formateur")
                  .eq('type', documentType)
                  .order('created_at', { ascending: false })
                  .limit(1);
                
                if (!trainerError && trainerDocs && trainerDocs.length > 0 && trainerDocs[0].file_url) {
                  console.log('🚨 [URGENT] Signature formateur trouvée directement dans la base:', trainerDocs[0].file_url);
                  setTrainerSignature(trainerDocs[0].file_url);
                  
                  // Mettre à jour le gestionnaire de signatures
                  if (signatureManagerRef.current) {
                    signatureManagerRef.current.updateSignature('trainer', trainerDocs[0].file_url);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('🚨 [URGENT] Erreur lors de la vérification de la signature formateur:', error);
        }
      };
      
      // Exécuter avec un délai pour permettre l'initialisation complète
      const timer = setTimeout(ensureTrainerSignatureVisible, 2000);
      return () => clearTimeout(timer);
    }
  }, [viewContext, trainerSignature, documentType, trainingId]);
  
  // Fonction pour forcer l'application du tampon d'organisation
  const forceApplyOrganizationSeal = async () => {
    console.log('🔍 [DEBUG] Forçage de l\'application du tampon d\'organisation');
    
    try {
      if (!signatureManagerRef.current) {
        console.error('🔍 [DEBUG] Impossible d\'appliquer le tampon: signatureManagerRef.current est null');
        return;
      }
      
      // Vérifier si le tampon existe déjà
      if (organizationSeal) {
        console.log('🔍 [DEBUG] Tampon d\'organisation déjà présent, pas besoin de le forcer');
        return;
      }
      
      // Forcer le rafraîchissement des signatures pour essayer de récupérer le tampon
      await signatureManagerRef.current.forceRefreshSignatures();
      
      // Obtenir toutes les signatures, y compris le tampon de l'organisation
      const signatures = signatureManagerRef.current.getSignatures();
      
      if (signatures.organizationSeal) {
        console.log('🔍 [DEBUG] Tampon d\'organisation trouvé après rafraîchissement:', signatures.organizationSeal);
        
        // Sauvegarder le tampon
        const savedSeal = await signatureManagerRef.current.saveSignature(signatures.organizationSeal, 'organizationSeal');
        
        // Mettre à jour l'état
        setOrganizationSeal(savedSeal);
        
        console.log('✅ [SUCCESS] Tampon d\'organisation appliqué avec succès:', !!savedSeal);
      } else {
        console.error('🔍 [DEBUG] Aucun tampon d\'organisation trouvé après rafraîchissement');
        
        // En dernier recours, chercher directement dans les settings
        try {
          const { data: settings } = await supabase
            .from('settings')
            .select('organization_seal_url')
            .single();
            
          if (settings?.organization_seal_url) {
            console.log('🔍 [DEBUG] Tampon d\'organisation trouvé dans les settings:', settings.organization_seal_url);
            
            // Sauvegarder le tampon
            const savedSeal = await signatureManagerRef.current.saveSignature(settings.organization_seal_url, 'organizationSeal');
            
            // Mettre à jour l'état
            setOrganizationSeal(savedSeal);
            
            console.log('✅ [SUCCESS] Tampon d\'organisation appliqué avec succès depuis les settings:', !!savedSeal);
          } else {
            console.error('🔍 [DEBUG] Aucun tampon d\'organisation trouvé dans les settings');
          }
        } catch (settingsError) {
          console.error('❌ [ERROR] Erreur lors de la récupération des settings:', settingsError);
        }
      }
    } catch (error) {
      console.error('❌ [ERROR] Erreur lors de l\'application forcée du tampon d\'organisation:', error);
    }
  };
  
  // Gestionnaire pour sauvegarder la signature ou le tampon
  const handleSignatureSave = async (dataUrl: string, signatureType: SignatureType) => {
    try {
      // NOUVEAUX LOGS DE DIAGNOSTIC
      console.log(`🔎 [DIAGNOSTIC_AVANCÉ] Début de handleSignatureSave pour: ${signatureType}`);
      console.log(`🔎 [DIAGNOSTIC_AVANCÉ] Longueur dataUrl: ${dataUrl?.length || 0}`);
      console.log(`🔎 [DIAGNOSTIC_AVANCÉ] DataUrl commence par: ${dataUrl?.substring(0, 30)}...`);
      console.log(`🔎 [DIAGNOSTIC_AVANCÉ] État actuel signatureManagerRef:`, signatureManagerRef.current);
      
      // Prévenir la fermeture accidentelle de la page pendant la sauvegarde
      const preventUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
        return '';
      };
      window.addEventListener('beforeunload', preventUnload);
      
      // Journalisation du début de l'opération
      console.log('🖊️ [SIGNATURE] Début de la sauvegarde de la signature:', signatureType);
      
      // Backup des états actuels en cas d'erreur
      const backupSignatures = {
        participant: participantSignature,
        representative: representativeSignature,
        trainer: trainerSignature,
        companySeal: companySeal,
        organizationSeal: organizationSeal
      };
      
      // Valider les données URL
      if (!dataUrl?.startsWith('data:image/')) {
        console.error('🖊️ [SIGNATURE] Format de signature invalide:', dataUrl?.substring(0, 30) + '...');
        alert('Format de signature invalide. Veuillez réessayer.');
        
        // Restaurer le backup en cas d'erreur
        setParticipantSignature(backupSignatures.participant);
        setRepresentativeSignature(backupSignatures.representative);
        setTrainerSignature(backupSignatures.trainer);
        setCompanySeal(backupSignatures.companySeal);
        setOrganizationSeal(backupSignatures.organizationSeal);
        
        // Supprimer l'event listener
        window.removeEventListener('beforeunload', preventUnload);
        return;
      }
      
      // Fermer le modal avant de procéder
      setShowSignatureForm(false);
      
      // Définir l'état de chargement
      setIsSaving(true);
      
      try {
        // Vérifier que le gestionnaire de signature est initialisé
        if (!signatureManagerRef.current) {
          console.error('🖊️ [SIGNATURE] signatureManagerRef.current est null');
          alert('Erreur lors de l\'enregistrement de la signature. Veuillez réessayer.');
          setIsSaving(false);
          // Supprimer l'event listener
          window.removeEventListener('beforeunload', preventUnload);
          return;
        }
        
        console.log(`🔎 [DIAGNOSTIC_AVANCÉ] Avant appel saveSignature pour: ${signatureType}`);
        
        // Enregistrer la signature et mettre à jour l'état correspondant
        try {
          const result = await signatureManagerRef.current.saveSignature(dataUrl, signatureType);
          console.log(`🔎 [DIAGNOSTIC_AVANCÉ] Résultat saveSignature:`, result);
          
          if (result) {
            console.log('🖊️ [SIGNATURE] Signature enregistrée avec succès:', signatureType);
            alert('Signature enregistrée avec succès');
            
            // Mettre à jour localement l'état correspondant à la signature ajoutée
            if (signatureType === 'participant' && !participantSignature) {
              setParticipantSignature(result);
            } else if (signatureType === 'representative' && !representativeSignature) {
              setRepresentativeSignature(result);
            } else if (signatureType === 'trainer' && !trainerSignature) {
              setTrainerSignature(result);
            } else if (signatureType === 'companySeal' && !companySeal) {
              setCompanySeal(result);
            } else if (signatureType === 'organizationSeal' && !organizationSeal) {
              setOrganizationSeal(result);
            }
            
            // Si c'est un tampon d'organisation et qu'il y a un problème, essayer de le diagnostiquer
            if (signatureType === 'organizationSeal' && !result) {
              console.log('🖊️ [SIGNATURE] Problème détecté avec le tampon d\'organisation, tentative de diagnostic');
              const fixedSealUrl = await diagnoseAndFixOrganizationSeal();
              
              if (fixedSealUrl) {
                console.log('🖊️ [SIGNATURE] Tampon d\'organisation corrigé avec succès:', fixedSealUrl);
                // Mettre à jour l'état
                setOrganizationSeal(fixedSealUrl);
              } else {
                console.error('🖊️ [SIGNATURE] Impossible de corriger le tampon d\'organisation');
              }
            }
            
            // Forcer l'affichage du tampon d'organisation après une signature formateur
            if (signatureType === 'trainer' && !organizationSeal && documentType === DocumentType.CONVENTION) {
              console.log('🖊️ [SIGNATURE] Signature du formateur détectée, forçage du tampon d\'organisation');
              forceOrganizationSealInDOM();
            }
            
          } else {
            console.error('🖊️ [SIGNATURE] Échec de l\'enregistrement de la signature');
            alert('Erreur lors de l\'enregistrement de la signature. Veuillez réessayer.');
            
            // Restaurer le backup en cas d'erreur
            setParticipantSignature(backupSignatures.participant);
            setRepresentativeSignature(backupSignatures.representative);
            setTrainerSignature(backupSignatures.trainer);
            setCompanySeal(backupSignatures.companySeal);
            setOrganizationSeal(backupSignatures.organizationSeal);
          }
        } catch (saveError) {
          console.error('🖊️ [SIGNATURE] Exception lors de saveSignature:', saveError);
          throw saveError;
        }
      } catch (error) {
        console.error('🖊️ [SIGNATURE] Exception lors de l\'enregistrement de la signature:', error);
        alert('Erreur lors de l\'enregistrement de la signature. Veuillez réessayer.');
        
        // Restaurer le backup en cas d'erreur
        setParticipantSignature(backupSignatures.participant);
        setRepresentativeSignature(backupSignatures.representative);
        setTrainerSignature(backupSignatures.trainer);
        setCompanySeal(backupSignatures.companySeal);
        setOrganizationSeal(backupSignatures.organizationSeal);
      } finally {
        setIsSaving(false);
        // Supprimer l'event listener
        window.removeEventListener('beforeunload', preventUnload);
        console.log(`🔎 [DIAGNOSTIC_AVANCÉ] Fin de handleSignatureSave pour: ${signatureType}`);
      }
    } catch (error) {
      console.error('🖊️ [SIGNATURE] Erreur critique lors du traitement de la signature:', error);
      alert('Une erreur est survenue. Veuillez réessayer.');
      setIsSaving(false);
      window.removeEventListener('beforeunload', (e) => {
        e.preventDefault();
        e.returnValue = '';
        return '';
      });
    }
  };

  // Render du composant
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8">
        <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">{documentTitle}</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            Fermer
          </button>
        </div>
        
        <div className="p-4 md:p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement du document...</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex-grow overflow-y-auto border border-gray-200 rounded-md bg-white">
                {/* Log pour identifier les valeurs transmises au template */}
                {(() => {
                  console.log('🧪 [DIAGNOSTIC_TEMPLATE] Valeurs transmises au template:', {
                    participantSignature: participantSignature ? 'présent' : 'absent',
                    representativeSignature: representativeSignature ? 'présent' : 'absent',
                    trainerSignature: trainerSignature ? 'présent' : 'absent',
                    companySeal: companySeal ? 'présent' : 'absent',
                    organizationSeal: organizationSeal ? 'présent' : 'absent'
                  });
                  return null;
                })()}
                <div ref={documentRef}>
                  {renderTemplate({
                    participantSignature,
                    representativeSignature,
                    trainerSignature,
                    companySeal,
                    organizationSeal
                  })}
                </div>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2 mt-6 sticky bottom-0 bg-white py-3 border-t border-gray-100">
                {/* Bouton de signature */}
                {!isLoading && signatureManagerRef.current && (
                  <>
                    {/* Cas du formateur (CRM) pour une convention */}
                    {viewContext === 'crm' && documentType === DocumentType.CONVENTION && (
                        <button 
                        onClick={handleSignClick}
                        disabled={isSaving}
                        className="mt-4 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center"
                      >
                        <Pen className="mr-2 h-4 w-4" />
                        {isSaving && currentAction === 'signature' ? 'Enregistrement...' : 'Signer le document'}
                        </button>
                    )}
                        
                    {/* Cas où l'utilisateur peut signer */}
                    {canSign() && (
                          <button 
                        onClick={handleSignClick}
                        disabled={isSaving}
                        className="mt-4 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center"
                      >
                        <Pen className="mr-2 h-4 w-4" />
                        {isSaving && currentAction === 'signature' ? 'Enregistrement...' : signatureManagerRef.current.getSignatureButtonState().text}
                          </button>
                        )}
                        
                    {/* Message d'attente si nécessaire */}
                    {!signatureManagerRef.current.isFullySigned() && !canSign() && viewContext !== 'crm' && (
                      <div className="mt-4 px-4 py-2 bg-gray-200 text-gray-600 rounded-md text-center flex items-center">
                        <FileText className="mr-2 h-4 w-4" />
                        {signatureManagerRef.current.getSignatureStatusMessage()}
                      </div>
                    )}
                  </>
                )}
                
                {/* Bouton de téléchargement */}
                {isDocumentComplete() && (
                          <button 
                    onClick={handleDownload}
                    disabled={isGeneratingPDF}
                    className="mt-4 ml-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isGeneratingPDF ? 'Génération...' : 'Télécharger'}
                          </button>
                        )}
                
                {/* Bouton pour voir le document existant */}
                {existingDocumentUrl && (
                  <a
                    href={existingDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="mt-4 ml-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 inline-flex items-center"
                  >
                    Voir le document signé
                  </a>
                )}
                      </div>
                    </div>
          )}
                  </div>
        
        {/* Modal de signature ou tampon */}
        {showSignatureForm && (
          <div className="fixed inset-0 z-[60] bg-black bg-opacity-75 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto my-4">
              <div className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {currentAction === 'signature' ? (
                    viewContext === 'student' ? 'Votre signature' : 'Signature du formateur'
                  ) : (
                    viewContext === 'student' ? 'Tampon d\'entreprise' : 'Tampon de l\'organisme'
                  )}
                </h3>
                <p className="mb-4">
                  {currentAction === 'signature' 
                    ? 'Veuillez signer le document :' 
                    : 'Veuillez ajouter un tampon :'}
                </p>
                
                <SignatureCanvas 
                  onSave={(dataURL) => {
                    console.log("🔴 [CORRECTION] Début du callback onSave, dataURL reçue longueur:", dataURL?.length || 0);
                    if (dataURL) {
                      console.log("🔴 [CORRECTION] Type de signature:", selectedSignatureType);
                      console.log("🔴 [CORRECTION] Définition de handleSignatureSave:", !!handleSignatureSave);
                      try {
                        handleSignatureSave(dataURL, selectedSignatureType as SignatureType);
                        console.log("🔴 [CORRECTION] handleSignatureSave exécuté avec succès");
                      } catch (error) {
                        console.error("🔴 [CORRECTION] Erreur lors de l'appel à handleSignatureSave:", error);
                        alert(`Erreur lors de la sauvegarde de la signature: ${error}`);
                      }
                    } else {
                      console.error("🔴 [CORRECTION] dataURL est null ou undefined");
                    }
                  }}
                  onCancel={() => {
                    setShowSignatureForm(false);
                    setCurrentAction(null);
                  }}
                  signatureType={
                    selectedSignatureType === 'representative' 
                      ? 'trainer' 
                      : (selectedSignatureType as 'trainer' | 'participant' | 'organizationSeal' | 'companySeal')
                  }
                  isLoading={isSaving}
                  initialName={viewContext === 'student' ? participantName : trainerName}
                />
                
                <p className="text-xs text-gray-500 mt-3">
                  {currentAction === 'signature' 
                    ? 'Utilisez votre souris ou votre doigt pour dessiner votre signature.' 
                    : 'Créez ou importez un tampon à ajouter au document.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 