import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Download, RefreshCw, Pen, Stamp, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SignatureCanvas from '../SignatureCanvas';
import { generateDocumentPDF, getTrainingDates } from './DocumentUtils';
import { DocumentManager } from './DocumentManager';
import { DocumentSignatureManager } from './DocumentSignatureManager';
// Import enums directly from SignatureTypes
import { DocumentType, SignatureType } from '../../types/SignatureTypes';
// import { Button, Modal, ModalHeader, ModalFooter, ModalBody } from '../ui/Modal'; // Commenté: Composants non exportés depuis ce fichier
import { UnifiedTrainingAgreementTemplate } from './templates/unified/TrainingAgreementTemplate';
import { LoadingSpinner } from '../LoadingSpinner'; 
import { toast } from 'react-toastify'; // Ajout de l'import pour toast
import 'react-toastify/dist/ReactToastify.css'; // Import du CSS pour les notifications toast
// import { useTrainingContext } from '../../contexts/TrainingContext'; // Commenté: Fichier non trouvé
import { diagnoseAndFixOrganizationSeal, forceOrganizationSealInDOM } from '../../utils/SignatureUtils';
import { PdfViewerModal } from './PdfViewerModal'; // Import the PdfViewerModal component
import ReactDOMServer from 'react-dom/server';

export interface DocumentWithSignaturesProps {
  documentType: DocumentType;
  trainingId: string;
  participantId: string;
  participantName?: string;
  viewContext?: 'crm' | 'student';
  needStamp?: boolean;
  onCancel?: () => void;
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
  renderTemplate: (signatures: {
    participantSignature: string | null;
    representativeSignature: string | null;
    trainerSignature: string | null;
    companySeal: string | null;
    organizationSeal: string | null;
    isPdfGeneration: boolean;
  }) => React.ReactNode;
  documentTitle?: string;
  allowCompanySeal?: boolean;
  allowOrganizationSeal?: boolean;
  onSignatureCreated?: (signatureUrl: string) => void;
  hideSignButton?: boolean;
  isPdfGeneration?: boolean;
}

// Ajuster le type pour inclure 'representative'
export type FullSignatureType = 'participant' | 'representative' | 'trainer' | 'companySeal' | 'organizationSeal';

// Ajout d'un système de cache mémoire pour les vérifications d'URL
const urlVerificationCache = new Map<string, boolean>();

const verifySignatureUrl = (url: string | null): boolean => {
  if (!url) return false;
  
  // Vérifier le cache d'abord
  if (urlVerificationCache.has(url)) {
    return urlVerificationCache.get(url)!;
  }
  
  const isValid = url.startsWith('https://') && url.includes('supabase.co/storage/');
  urlVerificationCache.set(url, isValid);
  return isValid;
};

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
  allowOrganizationSeal = true,
  onSignatureCreated,
  hideSignButton,
  isPdfGeneration = false,
}) => {
  const documentRef = useRef<HTMLDivElement>(null);
  const [showSignatureForm, setShowSignatureForm] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingDocumentUrl, setExistingDocumentUrl] = useState<string | null>(null);
  // Ajout de l'état downloading
  const [downloading, setDownloading] = useState(false);
  
  // Add state for PDF viewer modal
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  
  // États pour les signatures - toujours initialisés à null
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
  
  // Référence au container de document pour forcer le rendu des signatures
  const documentContainerRef = useRef<HTMLDivElement>(null);
  
  // Ajout d'un ID unique pour le gestionnaire de signature
  const [managerId] = useState(() => `dsm-${Math.random().toString(36).substring(2, 9)}`); 
  
  // État pour stocker les infos du document
  const [documentInfo, setDocumentInfo] = useState<{ id: string; need_stamp: boolean } | null>(null);
  
  // État pour gérer la génération du PDF
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // État pour suivre l'existence de la signature du participant
  const [participantSignatureExists, setParticipantSignatureExists] = useState<boolean>(false);
  
  // État pour stocker l'instance du gestionnaire de signature
  const [managerInstance, setManagerInstance] = useState<DocumentSignatureManager | null>(null);
  
  // Fonction pour créer/initialiser le gestionnaire et charger les données initiales
  const initializeManagerAndLoadData = useCallback(async () => {
    console.log('🔄 [INIT_MANAGER] Initialisation du gestionnaire et chargement des données...');
    setIsLoading(true);
    
    try {
      console.log('🚫 [SIGNATURES] Réinitialisation sécurité des signatures avant création...');
      setParticipantSignature(null);
      setRepresentativeSignature(null);
      setTrainerSignature(null);
      setCompanySeal(null);
      setOrganizationSeal(null);
      
      const manager = new DocumentSignatureManager(
        documentType,
        trainingId,
        participantId,
        participantName,
        viewContext,
        handleSignatureChange // Passer le callback pour les mises à jour
      );
      
      signatureManagerRef.current = manager;
      console.log('✅ [INIT_MANAGER] Gestionnaire de signatures créé.');
      
      // Charger le tampon d'organisme depuis les settings (indépendant des autres signatures)
      if (documentType === DocumentType.CONVENTION) {
        console.log('📝 [CONVENTION] Tentative de chargement du tampon organisme depuis settings...');
        const { data: settings } = await supabase
          .from('settings')
          .select('organization_seal_url')
          .single();
        
        if (settings?.organization_seal_url) {
          console.log('✅ [TAMPON] Tampon organisme trouvé dans settings:', settings.organization_seal_url);
          setOrganizationSeal(settings.organization_seal_url);
        } else {
          console.log('❌ [TAMPON] Aucun tampon organisme trouvé dans settings.');
        }
      }
      
      // Charger explicitement les signatures existantes après création du manager
      if (signatureManagerRef.current) {
        console.log('⏳ [INIT_MANAGER] Chargement des signatures existantes...');
        await signatureManagerRef.current.loadExistingSignatures();
        
        // Mettre à jour les états locaux avec les signatures chargées
        // Ajouter une vérification de sécurité supplémentaire
        if (signatureManagerRef.current && typeof signatureManagerRef.current.getSignatures === 'function') {
          const loadedSigs = signatureManagerRef.current.getSignatures();
          if (loadedSigs) {
            setParticipantSignature(loadedSigs.participant);
            setRepresentativeSignature(loadedSigs.representative);
            setTrainerSignature(loadedSigs.trainer);
            setCompanySeal(loadedSigs.companySeal);
            // Ne pas écraser le tampon d'organisme si déjà chargé depuis settings
            if (!organizationSeal && loadedSigs.organizationSeal) {
               setOrganizationSeal(loadedSigs.organizationSeal);
            }
            console.log('✅ [INIT_MANAGER] États locaux mis à jour avec signatures chargées.');
          } else {
            console.warn('⚠️ [INIT_MANAGER] getSignatures() a retourné null ou undefined');
          }
        } else {
          console.warn('⚠️ [INIT_MANAGER] Le manager existe mais getSignatures() n\'est pas disponible');
        }
      } else {
        console.warn('⚠️ [INIT_MANAGER] Le manager n\'est pas initialisé, impossible de charger les signatures');
      }
      
    } catch (error) {
      console.error('❌ [INIT_MANAGER] Erreur lors de l\'initialisation:', error);
    } finally {
      setIsLoading(false);
      console.log('🏁 [INIT_MANAGER] Initialisation terminée.');
    }
  }, []); // <--- Supprimer les dépendances pour exécution unique au montage

  // UseEffect pour initialiser le gestionnaire et charger les données
  useEffect(() => {
    console.log("🔄 [EFFECT_INIT] Déclenchement de initializeManagerAndLoadData au montage...");
    initializeManagerAndLoadData();
    
    // Événements pour empêcher les rechargements de page (déplacé ici pour clarté)
    const preventReload = (e: Event) => {
      console.log(`🛑 [DEBUG] Intercepté événement pouvant causer rechargement: ${e.type}`, e);
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const reloadEvents = ['submit', 'beforeunload', 'unload', 'navigate'];
    
    reloadEvents.forEach(eventType => {
      document.addEventListener(eventType, preventReload, true);
    });

    document.querySelectorAll('form').forEach(form => {
      form.onsubmit = preventReload;
    });

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

    observer.observe(document.documentElement, { 
      childList: true, 
      subtree: true 
    });

    // Diagnostic au montage
    console.log("🔍 [MOUNT_DIAG] Props au montage:", { documentType, trainingId, participantId, viewContext });

    // Nettoyage des listeners au démontage
    return () => {
      console.log("🧹 [UNMOUNT] Nettoyage des listeners preventReload...");
      reloadEvents.forEach(eventType => {
        document.removeEventListener(eventType, preventReload, true);
      });
      observer.disconnect();
      // Appeler destroy sur le manager s'il existe
      if (signatureManagerRef.current) {
        console.log(`🧹 [UNMOUNT] Appel de destroy sur le manager`);
        signatureManagerRef.current.destroy();
        signatureManagerRef.current = null; // Optionnel: nullifier la ref
      }
    };
    
  }, [initializeManagerAndLoadData]); // Dépend UNIQUEMENT de la fonction useCallback elle-même

  // Fonction pour charger les informations du document
  const loadDocumentInfo = async () => {
    try {
      console.log("Chargement des infos du document...");
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('training_id', trainingId)
        .eq('user_id', participantId)
        .eq('type', documentType)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error("[ERROR] Erreur lors du chargement des infos du document:", error);
        return;
      }
      
      if (data && data.length > 0) {
        setDocumentInfo(data[0]);
      }
    } catch (error) {
      console.error("[ERROR] Exception lors du chargement des infos du document:", error);
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
        .eq('user_id', participantId)
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
            user_id: participantId,
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
  
  // Fonction pour le rendu des signatures
  const renderSignatures = () => {
    return renderTemplate({
      participantSignature: participantSignature || null,
      representativeSignature: representativeSignature || null,
      trainerSignature: trainerSignature || null,
      companySeal: companySeal || null,
      organizationSeal: organizationSeal || null,
      isPdfGeneration: isPdfGeneration
    });
  };
  
  // À l'initialisation et lors des changements de contexte clés (sauf le premier rendu)
  useEffect(() => {
     // Ne pas exécuter au premier rendu, laisser initializeManagerAndLoadData s'en charger
     if (!signatureManagerRef.current) {
       initializeManagerAndLoadData();
     }
  }, [initializeManagerAndLoadData]); // Dépendance à la fonction d'initialisation

  // !!!!!!!!!!!! SÉCURITÉ CRITIQUE !!!!!!!!!!!!
  // Réinitialiser et RECHARGER lorsque trainingId ou participantId changent.
  useEffect(() => {
    // Éviter de réinitialiser au tout premier montage si trainingId/participantId sont déjà corrects
    if (signatureManagerRef.current) {
        console.warn('🔒 [SÉCURITÉ] Changement de contexte détecté (trainingId/participantId). Réinitialisation et rechargement...');
        initializeManagerAndLoadData(); // Appeler la fonction qui réinitialise ET recharge
    }
    
  }, [trainingId, participantId, initializeManagerAndLoadData]); // Dépendances clés pour la sécurité + la fonction de rechargement

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
  
  // Callback pour gérer les changements de signature depuis le manager
  const handleSignatureChange = useCallback((type: SignatureType, url: string | null) => {
    console.log(`🔔 [DWS_CALLBACK] Notification reçue: Type=${type}, URL=${url ? url.substring(0,30)+'...' : 'null'}`);
    if (type === SignatureType.PARTICIPANT) {
        const exists = !!url;
        console.log(`🔔➡️ [DWS_CALLBACK] Mise à jour état participantSignatureExists: ${exists}`);
        setParticipantSignatureExists(prevExists => {
            console.log(`🔄 [DWS_STATE_UPDATE] MàJ participantSignatureExists de ${prevExists} vers ${exists}`);
            if (exists && (!url || !url.startsWith('https://'))) {
                console.error(`💥 [DWS_STATE_UPDATE_ERROR] URL invalide reçue pour participant: ${url}`);
                return false;
            }
            return exists;
        });
    }
    // ... (gérer d'autres types si nécessaire)
  }, []);

  useEffect(() => {
    // ... (logique existante pour initialiser le manager) ...
    console.log('[DWS_EFFECT] Création instance DocumentSignatureManager');
    const manager = new DocumentSignatureManager(
      documentType,
      trainingId,
      participantId,
      participantName,
      viewContext,
      handleSignatureChange // <-- Passer le callback ici
    );
    setManagerInstance(manager);

    // ... (logique existante pour charger les données et cleanup) ...

    return () => {
      console.log('[DWS_EFFECT] Cleanup: Destruction instance DocumentSignatureManager');
      manager.destroy(); // Assurez-vous que la méthode destroy existe et retire l'écouteur
    };
  }, [documentType, trainingId, participantId, participantName, viewContext, handleSignatureChange]);

  // Fonction pour télécharger le document
  const handleDownload = async () => {
    setDownloading(true);
    
    try {
      // Sauvegarder le contenu HTML original
      const originalContent = document.getElementById('document-container')?.innerHTML;
      if (!originalContent) {
        throw new Error("Le contenu du document n'a pas été trouvé.");
      }
      
      // Créer un élément temporaire avec les mêmes propriétés
      const signatureProps = {
        participantSignature,
        representativeSignature,
        trainerSignature,
        companySeal,
        organizationSeal,
        isPdfGeneration: false
      };
      
      const tempSignatureProps = {
        ...signatureProps,
        isPdfGeneration: true  // Activer l'optimisation pour PDF
      };
      
      console.log('🖨️ [PDF] Préparation du document pour l\'export PDF');
      
      // Mettre à jour temporairement le contenu avec le rendu optimisé pour PDF
      const documentContainer = document.getElementById('document-container');
      if (documentContainer) {
        // Sauvegarder la position de défilement actuelle
        const scrollPosition = window.scrollY;
        
        // Remplacer temporairement le contenu pour le rendu PDF
        // Convertir ReactNode en string HTML
        const renderedContent = ReactDOMServer.renderToString(renderTemplate(tempSignatureProps) as React.ReactElement);
        documentContainer.innerHTML = renderedContent;
        
        console.log('🖨️ [PDF] Rendu optimisé pour PDF appliqué');
        
        // Pour les feuilles d'émargement : s'assurer que les dates sont correctement affichées
        if (documentType === DocumentType.ATTENDANCE_SHEET) {
          console.log('🖨️ [PDF] Traitement spécial pour feuille d\'émargement');
          
          // Récupérer les infos de formation pour les dates
          let trainingInfo = null;
          try {
            // Récupérer les dates de formation depuis la base de données
            const { data } = await supabase
              .from('trainings')
              .select('start_date, end_date')
              .eq('id', trainingId)
              .single();
            
            trainingInfo = data;
            console.log('🖨️ [PDF] Données de formation récupérées:', trainingInfo);
          } catch (err) {
            console.error('🖨️ [PDF] Erreur lors de la récupération des dates de formation:', err);
          }
          
          // Rechercher tous les éléments qui contiennent des dates potentiellement remplacées par des points
          const dateCells = documentContainer.querySelectorAll('td[rowspan="2"]');
          
          dateCells.forEach(cell => {
            // Vérifier si la cellule contient des points à la place d'une date
            const cellContent = cell.textContent?.trim();
            if (cellContent === '. .' || cellContent === '.  .' || cellContent === '..') {
              console.log('🖨️ [PDF] Correction d\'une date remplacée par des points:', cellContent);
              
              // Récupérer l'index de cette cellule pour déterminer la date
              const rowIndex = Array.from(dateCells).indexOf(cell);
              
              if (rowIndex >= 0 && trainingInfo) {
                // Récupérer la date depuis les données de formation
                const trainingDates = getTrainingDates(trainingInfo.start_date, trainingInfo.end_date);
                if (trainingDates && trainingDates[rowIndex]) {
                  // Remplacer les points par la date formatée
                  cell.textContent = trainingDates[rowIndex];
                  console.log('🖨️ [PDF] Date corrigée:', trainingDates[rowIndex]);
                }
              }
            }
          });
        }
        
        // Générer le PDF avec le contenu optimisé
        try {
          // Appel avec seulement l'élément HTML comme argument
          const pdfBlob = await generateDocumentPDF(documentContainer);
          console.log('🖨️ [PDF] Génération du PDF réussie');
          
          // Définir le blob et ouvrir la prévisualisation au lieu de télécharger directement
          setPdfBlob(pdfBlob);
          setShowPdfPreview(true);
        } catch (pdfError) {
          console.error('🖨️ [PDF] Erreur lors de la génération du PDF:', pdfError);
          toast.error("Une erreur est survenue lors de la génération du PDF.");
        }
        
        // Restaurer le contenu original
        documentContainer.innerHTML = originalContent;
        
        // Restaurer la position de défilement
        window.scrollTo(0, scrollPosition);
        
        console.log('🖨️ [PDF] Contenu original restauré');
      }
    } catch (error) {
      console.error('Erreur lors de la prévisualisation du document:', error);
      toast.error("Une erreur est survenue lors de la génération du PDF.");
    } finally {
      setDownloading(false);
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
    const signatureType = viewContext === 'crm' ? SignatureType.TRAINER : SignatureType.PARTICIPANT;
    const signButtonState = signatureManagerRef.current.canSign(signatureType);
    
    return signButtonState.canSign;
  };
  
  // Nouveau: Vérifie si toutes les signatures requises sont présentes, y compris le tampon si activé
  const isDocumentComplete = (): boolean => {
    // Pour la feuille d'émargement, permettre le téléchargement même si incomplet
    if (documentType === DocumentType.ATTENDANCE_SHEET) {
      return true;
    }
    
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
    if (hideSignButton || !signatureManagerRef.current || isLoading) return null;
    
    console.log('🔍 [DEBUG] DocumentWithSignatures - État du bouton de signature:', viewContext, documentType);
    
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
  const refreshSignatures = useCallback(async () => {
    try {
      if (!signatureManagerRef.current) return;

      console.log("🚨 [URGENT] Rafraîchissement des signatures...");
      await signatureManagerRef.current.refreshSignatures();

      // Récupérer les signatures depuis le gestionnaire
      const signaturesFromManager = signatureManagerRef.current.getSignatures();

      // >>> LOGS AJOUTÉS ICI <<<
      console.log("📊 [REFRESH_SIGNATURES] Signatures depuis le gestionnaire:", {
        participant: signaturesFromManager.participant ? "définie" : "undefined",
        trainer: signaturesFromManager.trainer ? "définie" : "undefined",
        representative: signaturesFromManager.representative ? "définie" : "undefined"
      });
      
      console.log("🧪 [REFRESH_DEBUG] État interne participantSignatureExists:", participantSignatureExists);

      // Mise à jour des états
      console.log("🚨 [URGENT] Mise à jour participantSignature:", {
        exists: !!signaturesFromManager.participant,
        url: signaturesFromManager.participant?.substring(0, 10) + "..." || "undefined...",
        viewContext
      });
      setParticipantSignature(signaturesFromManager.participant);
      setParticipantSignatureExists(!!signaturesFromManager.participant);

      console.log("🚨 [URGENT] Mise à jour representativeSignature:", {
        exists: !!signaturesFromManager.representative,
        url: signaturesFromManager.representative?.substring(0, 10) + "..." || "undefined...",
        viewContext
      });
      setRepresentativeSignature(signaturesFromManager.representative);

      // ... code existant pour d'autres signatures ...
      
      // >>> LOG AJOUTÉ ICI <<<
      console.log("🧪 [REFRESH_DEBUG] Nouvel état participantSignatureExists:", !!signaturesFromManager.participant);
      
    } catch (error) {
      console.error("❌ [ERROR] Erreur lors du rafraîchissement des signatures:", error);
    }
  }, [signatureManagerRef.current, viewContext]);

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
          // Passer l'URL du tampon (organizationSeal) et l'ID du conteneur
          forceOrganizationSealInDOM(organizationSeal, 'document-container'); 
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
          // Passer l'URL du tampon (organizationSeal) et l'ID du conteneur
          await forceOrganizationSealInDOM(organizationSeal, 'document-container');
          
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
                await signatureManagerRef.current.saveSignature(settings.organization_seal_url, SignatureType.ORGANIZATION_SEAL);
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
                  await signatureManagerRef.current.saveSignature(urlData.publicUrl, SignatureType.ORGANIZATION_SEAL);
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
      let isMounted = true; // Flag pour éviter les mises à jour d'état sur un composant démonté

      const ensureTrainerSignatureVisible = async () => {
        try {
          if (!isMounted) return; // Ne rien faire si le composant est démonté

          // Logique de recherche... (simplifiée pour l'exemple)
          const { data: trainerDocs, error: trainerError } = await supabase
            .from('documents')
            .select('file_url')
            .eq('training_id', trainingId)
            .eq('title', "Signature du formateur")
            .eq('type', documentType)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!isMounted) return;

          if (!trainerError && trainerDocs && trainerDocs.length > 0 && trainerDocs[0].file_url) {
            const foundUrl = trainerDocs[0].file_url;
            console.log('🚨 [URGENT] Signature formateur trouvée:', foundUrl.substring(0,50)+'...');
            
            // *** CONDITION POUR ÉVITER LA BOUCLE ***
            // Mettre à jour l'état SEULEMENT si l'URL trouvée est différente de l'état actuel
            setTrainerSignature(currentUrl => {
              if (currentUrl !== foundUrl) {
                console.log('🚨 [URGENT] Mise à jour de trainerSignature car différente.');
                return foundUrl;
              }
              console.log('🚨 [URGENT] trainerSignature déjà à jour, pas de mise à jour d\'état.');
              return currentUrl; // Garder l'ancienne valeur si identique
            });
            
          } else {
             console.log('🚨 [URGENT] Aucune signature formateur trouvée lors de la vérification.');
          }
        } catch (error) {
          console.error('🚨 [URGENT] Erreur lors de la vérification de la signature formateur:', error);
        }
      };

      const timer = setTimeout(ensureTrainerSignatureVisible, 2000);
      
      // Cleanup function
      return () => {
        isMounted = false; // Marquer comme démonté
        clearTimeout(timer);
      };
    }
  }, [viewContext, trainerSignature, documentType, trainingId]); // Dépendances correctes
  
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
        const savedSeal = await signatureManagerRef.current.saveSignature(signatures.organizationSeal, SignatureType.ORGANIZATION_SEAL);
        
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
            const savedSeal = await signatureManagerRef.current.saveSignature(settings.organization_seal_url, SignatureType.ORGANIZATION_SEAL);
            
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
            
            // Appeler le callback onSignatureCreated si fourni
            if (onSignatureCreated) {
              onSignatureCreated(result);
            }
            
            // Mettre à jour localement l'état correspondant à la signature ajoutée
            if (signatureType === SignatureType.PARTICIPANT && !participantSignature) {
              setParticipantSignature(result);
            } else if (signatureType === SignatureType.REPRESENTATIVE && !representativeSignature) {
              setRepresentativeSignature(result);
            } else if (signatureType === SignatureType.TRAINER && !trainerSignature) {
              setTrainerSignature(result);
            } else if (signatureType === SignatureType.COMPANY_SEAL && !companySeal) {
              setCompanySeal(result);
            } else if (signatureType === SignatureType.ORGANIZATION_SEAL && !organizationSeal) {
              setOrganizationSeal(result);
            }
            
            // Si c'est un tampon d'organisation et qu'il y a un problème, essayer de le diagnostiquer
            if (signatureType === SignatureType.ORGANIZATION_SEAL && !result) {
              console.log('🖊️ [SIGNATURE] Problème détecté avec le tampon d\'organisation, tentative de diagnostic');
              // Passer l'URL actuelle (qui est null ou undefined ici, représentée par 'result') et trainingId
              const fixedSealUrl = await diagnoseAndFixOrganizationSeal(result, trainingId); 
              
              if (fixedSealUrl) {
                console.log('🖊️ [SIGNATURE] Tampon d\'organisation corrigé avec succès:', fixedSealUrl);
                // Mettre à jour l'état
                setOrganizationSeal(fixedSealUrl);
              } else {
                console.error('🖊️ [SIGNATURE] Impossible de corriger le tampon d\'organisation');
              }
            }
            
            // Forcer l'affichage du tampon d'organisation après une signature formateur
            if (signatureType === SignatureType.TRAINER && !organizationSeal && documentType === DocumentType.CONVENTION) {
              console.log('🖊️ [SIGNATURE] Signature du formateur détectée, forçage du tampon d\'organisation');
              // Passer l'URL du tampon (organizationSeal) et l'ID du conteneur
              forceOrganizationSealInDOM(organizationSeal, 'document-container');
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

  // Affichage du bouton Modifier
  const shouldShowModifyButton = viewContext === 'student' && participantSignatureExists && !isLoading;
  console.log(`🔘 [DWS_RENDER_BTN] Calcul shouldShowModifyButton: viewContext=${viewContext}, participantSignatureExists=${participantSignatureExists}, isLoading=${isLoading} => ${shouldShowModifyButton}`);

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
        
        <div className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement du document...</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Container du document AVEC les attributs nécessaires */}
              <div 
                 ref={documentContainerRef} 
                 id="document-container" // Ajout de l'ID standard
                 data-signature-manager-id={managerId} // Ajout de l'ID unique
                 className="relative"
               > 
                {/* Loading overlay (ne sera pas dans le PDF) */}
                {isLoading && (
                  <div className="absolute inset-0 bg-gray-50 bg-opacity-70 flex items-center justify-center z-10">
                    <LoadingSpinner />
                  </div>
                )}
                
                {/* DIV CAPTURÉ POUR PDF: uniquement fond blanc et contenu */}
                <div ref={documentRef} className={`document-template bg-white w-full ${isLoading ? 'opacity-40' : 'opacity-100'}`}> 
                  {renderSignatures()}
                </div>
              </div>
              
              {/* Boutons d'action (avec padding) */}
              <div className="p-4 mt-6 flex flex-wrap justify-center gap-2 sticky bottom-0 bg-white py-3 border-t border-gray-100">
                {/* Diagnostic pour vérifier les conditions d'affichage du bouton */}
                {(() => {
                  console.log('DIAGNOSTIC BOUTON MODIFIER SIGNATURE:', {
                    isLoading,
                    documentType,
                    viewContext,
                    participantSignatureExists: !!participantSignature,
                    shouldShowButton: !isLoading && documentType === DocumentType.ATTENDANCE_SHEET && viewContext === 'student' && !!participantSignature
                  });
                  return null;
                })()}
                
                {/* Bouton pour modifier la signature globale pour les feuilles d'émargement -- SUPPRESSION */}
                {/* {!isLoading && documentType === DocumentType.ATTENDANCE_SHEET && viewContext === 'student' && participantSignature && (
                  <button 
                    onClick={handleSignClick}
                    disabled={isSaving}
                    className="mt-4 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center"
                  >
                    <Pen className="mr-2 h-4 w-4" />
                    {isSaving && currentAction === 'signature' 
                      ? 'Enregistrement...' 
                      : 'Modifier ma signature'}
                  </button>
                )} */}
                
                {/* Bouton de signature pour les autres types de documents */}
                {!isLoading && signatureManagerRef.current && !hideSignButton && (
                  <>
                    {/* Cas du formateur (CRM) pour une convention */}
                    {viewContext === 'crm' && documentType === DocumentType.CONVENTION && canSign() && (
                      <button 
                        onClick={handleSignClick}
                        disabled={isSaving}
                        className="mt-4 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center"
                      >
                        <Pen className="mr-2 h-4 w-4" />
                        {isSaving && currentAction === 'signature' ? 'Enregistrement...' : 'Signer le document'}
                      </button>
                    )}
                    
                    {/* Cas où l'utilisateur peut signer - pour tous les types sauf émargement déjà traité au-dessus */}
                    {canSign() && documentType !== DocumentType.ATTENDANCE_SHEET && viewContext !== 'crm' && (
                      <button 
                        onClick={handleSignClick}
                        disabled={isSaving}
                        className="mt-4 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center"
                      >
                        <Pen className="mr-2 h-4 w-4" />
                        {isSaving && currentAction === 'signature' 
                          ? 'Enregistrement...' 
                          : (participantSignature ? 'Modifier ma signature' : signatureManagerRef.current.getSignatureButtonState().text)}
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
                
                {/* Bouton pour voir le document existant (si applicable) */}
                {existingDocumentUrl && (
                  <a
                    href={existingDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="mt-4 ml-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 inline-flex items-center"
                  >
                    Voir le document (sauvegardé)
                  </a>
                )}
                
                {/* Bouton Visualiser / Télécharger (TOUJOURS VISIBLE) */}
                <button
                  onClick={handleDownload} 
                  disabled={downloading}
                  className="mt-4 ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  title="Génère un aperçu PDF du document dans son état actuel"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {downloading ? 'Génération...' : 'Visualiser / Télécharger'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Modal pour la prévisualisation du PDF */}
        <PdfViewerModal
          isOpen={showPdfPreview}
          onClose={() => setShowPdfPreview(false)}
          pdfBlob={pdfBlob}
          title={`${documentTitle || 'Document'} - Aperçu`}
          fileName={`${documentTitle || 'document'}_${participantName?.replace(/\s+/g, '_') || ''}.pdf`}
        />
        
        {/* Modal de signature ou tampon */}
        {showSignatureForm && (
          <div className="fixed inset-0 z-[60] bg-black bg-opacity-75 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto my-4">
              <div className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {currentAction === 'signature' ? (
                    viewContext === 'student' 
                      ? (participantSignature ? 'Modifier votre signature' : 'Votre signature') 
                      : 'Signature du formateur'
                  ) : (
                    viewContext === 'student' ? 'Tampon d\'entreprise' : 'Tampon de l\'organisme'
                  )}
                </h3>
                <p className="mb-4">
                  {currentAction === 'signature' 
                    ? (participantSignature ? 'Veuillez modifier votre signature :' : 'Veuillez signer le document :')
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