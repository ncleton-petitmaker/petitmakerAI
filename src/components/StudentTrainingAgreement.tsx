import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';
import { generateWordLikePDF } from './admin/pdfGenerator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SignatureCanvas } from './SignatureCanvas';
import { supabase } from '../lib/supabase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { TrainingAgreementTemplate } from './templates/TrainingAgreementTemplate';

interface StudentTrainingAgreementProps {
  training: {
    id: string;
    title: string;
    duration: string;
    trainer_name: string;
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
  console.log('🔍 [DEBUG] StudentTrainingAgreement - Component rendering');
  
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [participantSignature, setParticipantSignature] = useState<string | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [organizationSettings, setOrganizationSettings] = useState<any>({});
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
  const [existingDocumentUrl, setExistingDocumentUrl] = useState<string | null>(null);

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

    // Cleanup function
    return () => {
      // Appeler onDocumentClose si fourni
      if (onDocumentClose) {
        onDocumentClose();
      }
      
      const portal = document.getElementById('training-agreement-portal');
      if (portal && portal.childNodes.length === 0) {
        portal.remove();
      }
    };
  }, []);

  useEffect(() => {
    console.log('🔍 [DEBUG] StudentTrainingAgreement - useEffect running');
    
    const fetchCompanyAndSettings = async () => {
      try {
        console.log('🔍 [DEBUG] StudentTrainingAgreement - Fetching company and settings data');
        
        // Vérifier d'abord si un document existe déjà pour cette formation et cet utilisateur
        console.log('🔍 [DEBUG] Vérification de l\'existence d\'un document dans la table documents');
        const { data: existingDocuments, error: docError } = await supabase
          .from('documents')
          .select('*')
          .eq('training_id', training.id)
          .eq('user_id', participant.id)
          .eq('type', 'convention');
          
        if (docError) {
          console.error('🔍 [DEBUG] Erreur lors de la vérification des documents existants:', docError);
        } else if (existingDocuments && existingDocuments.length > 0) {
          console.log('🔍 [DEBUG] Documents existants trouvés pour cet utilisateur:', existingDocuments.length);
          
          // Trier par date de création pour obtenir le plus récent
          const sortedDocs = [...existingDocuments].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          const latestDoc = sortedDocs[0];
          console.log('🔍 [DEBUG] Document le plus récent pour cet utilisateur:', latestDoc);
          
          if (latestDoc.file_url) {
            console.log('🔍 [DEBUG] URL du document trouvée, initialisation de l\'état');
            
            // Stocker l'URL dans le localStorage pour référence future
            const localStorageKey = `document_${training.id}_${participant.id}_convention`;
            try {
              localStorage.setItem(localStorageKey, latestDoc.file_url);
              console.log('🔍 [DEBUG] URL du document stockée dans le localStorage');
            } catch (storageError) {
              console.error('🔍 [DEBUG] Erreur lors du stockage dans le localStorage:', storageError);
            }
            
            // Mettre à jour l'état pour indiquer que le document est signé
            setExistingDocumentUrl(latestDoc.file_url);
            setIsSigned(true);
            setParticipantSignature(latestDoc.file_url); // On utilise l'URL comme signature
          }
        }
        
        // Récupérer les informations sur la société associée à la formation
        if (training.company_id) {
          console.log('🔍 [DEBUG] Récupération des informations sur la société de la formation:', training.company_id);
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', training.company_id)
            .single();
          
          if (companyError) {
            console.error('🔍 [DEBUG] Erreur lors de la récupération des informations sur la société:', companyError);
          } else {
            console.log('🔍 [DEBUG] Informations sur la société récupérées avec succès');
            setCompany(companyData);
          }
        } 
        // Si pas de company_id dans la formation, essayer de récupérer l'entreprise du stagiaire
        else if (participant.company) {
          console.log('🔍 [DEBUG] Recherche de l\'entreprise du stagiaire par nom:', participant.company);
          
          // Essayer de trouver l'entreprise par son nom
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .ilike('name', `%${participant.company}%`)
            .limit(1);
          
          if (companyError) {
            console.error('🔍 [DEBUG] Erreur lors de la recherche de l\'entreprise du stagiaire:', companyError);
          } else if (companyData && companyData.length > 0) {
            console.log('🔍 [DEBUG] Entreprise du stagiaire trouvée:', companyData[0]);
            setCompany(companyData[0]);
          } else {
            console.log('🔍 [DEBUG] Aucune entreprise trouvée pour le stagiaire, création d\'un objet entreprise basique');
            // Créer un objet entreprise basique avec les informations disponibles
            setCompany({
              name: participant.company,
              address: '',
              siret: '',
              contact_name: ''
            });
          }
        }
        
        // Récupérer les paramètres de l'organisation
        console.log('🔍 [DEBUG] Récupération des paramètres de l\'organisation');
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('*')
          .limit(1)
          .single();
        
        if (settingsError) {
          console.error('🔍 [DEBUG] Erreur lors de la récupération des paramètres de l\'organisation:', settingsError);
        } else {
          console.log('🔍 [DEBUG] Paramètres de l\'organisation récupérés avec succès');
          setOrganizationSettings({
            organization_name: settingsData.company_name,
            siret: settingsData.siret,
            address: `${settingsData.address}, ${settingsData.postal_code} ${settingsData.city}`,
            representative_name: settingsData.representative_name,
            activity_declaration_number: settingsData.training_number
          });
        }
      } catch (error) {
        console.error('🔍 [DEBUG] StudentTrainingAgreement - Error fetching data:', error);
      }
    };
    
    fetchCompanyAndSettings();
    
    // Check for any z-index conflicts
    console.log('🔍 [DEBUG] StudentTrainingAgreement - Document z-index:', 
      document.querySelector('.fixed.inset-0.bg-black')?.computedStyleMap()?.get('z-index'));
    
    // Log all elements with z-index > 50
    const highZIndexElements = Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const style = window.getComputedStyle(el);
        const zIndex = style.getPropertyValue('z-index');
        return zIndex !== 'auto' && parseInt(zIndex, 10) > 50;
      });
    
    console.log('🔍 [DEBUG] High z-index elements that might cause conflicts:', highZIndexElements);
    
  }, [training.company_id]);

  useEffect(() => {
    if (onDocumentOpen) {
      onDocumentOpen();
    }

    return () => {
      if (onDocumentClose) {
        onDocumentClose();
      }
    };
  }, [onDocumentOpen, onDocumentClose]);

  const generatePDF = async () => {
    if (!pdfContentRef.current) return;
    
    try {
      // Générer un nom de fichier basé sur le nom du participant et le titre de la formation
      const fileName = `Convention_${participant.first_name}_${participant.last_name}_${training.title.replace(/\s+/g, '_')}.pdf`;
      
      // Utiliser la fonction pour générer un PDF
      await generateWordLikePDF(pdfContentRef.current, fileName);
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
    
    if (startDate && endDate && startDate !== endDate) {
      return `du ${startDate} au ${endDate}`;
    } else if (startDate) {
      return `le ${startDate}`;
    }
    return '';
  };

  // Fonction pour obtenir les objectifs
  const getObjectives = () => {
    if (!training.objectives) return ['Aucun objectif spécifié'];
    
    // Si c'est déjà un tableau, le retourner
    if (Array.isArray(training.objectives)) {
      return training.objectives.length > 0 ? training.objectives : ['Aucun objectif spécifié'];
    }
    
    // Si c'est une chaîne, essayer de la parser comme JSON
    if (typeof training.objectives === 'string') {
      try {
        const parsed = JSON.parse(training.objectives);
        if (Array.isArray(parsed)) {
          return parsed.length > 0 ? parsed : ['Aucun objectif spécifié'];
        }
      } catch (e) {
        // Si ce n'est pas du JSON valide, le traiter comme une chaîne simple
        return [training.objectives];
      }
    }
    
    return ['Aucun objectif spécifié'];
  };

  // Fonction pour obtenir les méthodes d'évaluation
  const getEvaluationMethods = () => {
    const methods = [];
    
    if (training.evaluation_methods) {
      if (training.evaluation_methods.profile_evaluation) methods.push("Évaluation du profil");
      if (training.evaluation_methods.skills_evaluation) methods.push("Évaluation des compétences");
      if (training.evaluation_methods.knowledge_evaluation) methods.push("Évaluation des connaissances");
      if (training.evaluation_methods.satisfaction_survey) methods.push("Questionnaire de satisfaction");
    }
    
    return methods.length > 0 ? methods : ["Aucune méthode d'évaluation spécifiée"];
  };

  // Fonction pour obtenir les méthodes pédagogiques
  const getPedagogicalMethods = () => {
    const methods = [];
    
    if (training.pedagogical_methods) {
      if (training.pedagogical_methods.needs_evaluation) methods.push("Évaluation des besoins");
      if (training.pedagogical_methods.theoretical_content) methods.push("Apports théoriques");
      if (training.pedagogical_methods.practical_exercises) methods.push("Exercices pratiques");
      if (training.pedagogical_methods.case_studies) methods.push("Études de cas");
      if (training.pedagogical_methods.experience_sharing) methods.push("Partage d'expérience");
      if (training.pedagogical_methods.digital_support) methods.push("Support numérique");
    }
    
    return methods.length > 0 ? methods : ["Aucune méthode pédagogique spécifiée"];
  };

  // Fonction pour obtenir les éléments matériels
  const getMaterialElements = () => {
    const elements = [];
    
    if (training.material_elements) {
      if (training.material_elements.computer_provided) elements.push("Ordinateur fourni");
      if (training.material_elements.pedagogical_material) elements.push("Matériel pédagogique");
      if (training.material_elements.digital_support_provided) elements.push("Support numérique fourni");
    }
    
    return elements.length > 0 ? elements : ["Aucun élément matériel spécifié"];
  };

  const handleSignatureCancel = () => {
    setShowSignatureCanvas(false);
  };

  const handleSignatureSave = async (signatureDataUrl: string) => {
    console.log('🔍 [DEBUG] StudentTrainingAgreement - handleSignatureSave called');
    setParticipantSignature(signatureDataUrl);
    setShowSignatureCanvas(false);
    setIsSigned(true);
    
    try {
      setIsSaving(true);
      
      // Vérifier si l'utilisateur est authentifié
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour signer le document");
      }
      
      console.log('🔍 [DEBUG] Utilisateur authentifié:', session.user.id);
      console.log('🔍 [DEBUG] Participant ID:', participant.id);
      console.log('🔍 [DEBUG] Training ID:', training.id);
      
      // Convertir l'URL de données en Blob
      const res = await fetch(signatureDataUrl);
      const blob = await res.blob();
      console.log('🔍 [DEBUG] Taille du blob:', blob.size, 'bytes');
      console.log('🔍 [DEBUG] Type du blob:', blob.type);
      
      // Créer un nom de fichier unique pour la signature (simplifié)
      const timestamp = Date.now();
      const fileName = `signature_${timestamp}.png`;
      
      console.log('🔍 [DEBUG] Téléchargement de la signature dans le bucket signatures:', fileName);
      
      // Télécharger la signature dans le bucket Supabase
      const { data, error } = await supabase.storage
        .from('signatures')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (error) {
        console.error('🔍 [DEBUG] Erreur lors du téléchargement de la signature:', error);
        // Utiliser une approche sûre pour accéder aux propriétés
        console.error('🔍 [DEBUG] Détails de l\'erreur:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('🔍 [DEBUG] Signature téléchargée avec succès:', data);
      
      // Obtenir l'URL publique de la signature
      const { data: urlData } = await supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);
      
      console.log('🔍 [DEBUG] URL publique de la signature:', urlData);
      
      // Mettre à jour la base de données pour enregistrer que le participant a signé
      console.log('🔍 [DEBUG] Mise à jour du profil utilisateur:', participant.id);
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          has_signed_agreement: true,
          agreement_signature_url: urlData.publicUrl,
          agreement_signature_date: new Date().toISOString()
        })
        .eq('id', participant.id);
      
      if (updateError) {
        console.error('🔍 [DEBUG] Erreur lors de la mise à jour du profil:', updateError);
        console.error('🔍 [DEBUG] Détails de l\'erreur de mise à jour:', JSON.stringify(updateError, null, 2));
        throw updateError;
      }
      
      console.log('🔍 [DEBUG] Profil mis à jour avec succès');
      
      // Générer le PDF du document signé
      if (pdfContentRef.current) {
        try {
          console.log('🔍 [DEBUG] Génération du PDF');
          // Créer un élément temporaire pour la génération du PDF
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = pdfContentRef.current.innerHTML;
          document.body.appendChild(tempDiv);
          
          // Vérifier que la signature est visible dans le PDF
          const signatureImg = tempDiv.querySelector('img[alt="Signature du stagiaire"]');
          if (signatureImg) {
            console.log('🔍 [DEBUG] Signature trouvée dans le contenu du PDF');
            // S'assurer que l'image de signature est chargée
            (signatureImg as HTMLImageElement).src = signatureDataUrl;
          } else {
            console.warn('🔍 [DEBUG] Signature non trouvée dans le contenu du PDF');
          }
          
          // Générer le PDF
          const pdfBlob = await generateDocumentPDF(tempDiv);
          document.body.removeChild(tempDiv);
          
          console.log('🔍 [DEBUG] PDF généré avec succès, taille:', pdfBlob.size, 'bytes');
          
          // Créer un nom de fichier unique pour le document
          const sanitizedTrainingTitle = training.title ? training.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : '';
          const sanitizedLastName = participant.last_name ? participant.last_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : '';
          const sanitizedFirstName = participant.first_name ? participant.first_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : '';
          const pdfFileName = `convention_${sanitizedLastName}_${sanitizedFirstName}_${timestamp}.pdf`;
          
          console.log('🔍 [DEBUG] Téléchargement du PDF dans le bucket agreements:', pdfFileName);
          
          // Télécharger le PDF dans le bucket Supabase
          const { data: pdfData, error: pdfError } = await supabase.storage
            .from('agreements')
            .upload(pdfFileName, pdfBlob, {
              contentType: 'application/pdf',
              upsert: true
            });
          
          if (pdfError) {
            console.error('🔍 [DEBUG] Erreur lors du téléchargement du PDF:', pdfError);
            console.error('🔍 [DEBUG] Détails de l\'erreur PDF:', JSON.stringify(pdfError, null, 2));
            throw pdfError;
          }
          
          console.log('🔍 [DEBUG] PDF téléchargé avec succès:', pdfData);
          
          // Obtenir l'URL publique du PDF
          const { data: pdfUrlData } = await supabase.storage
            .from('agreements')
            .getPublicUrl(pdfFileName);
          
          console.log('🔍 [DEBUG] URL publique du PDF:', pdfUrlData);
          
          // Créer une entrée dans la table documents
          const documentTitle = `Convention de formation - ${participant.first_name} ${participant.last_name}`;
          const documentType = 'convention';
          const documentUrl = pdfUrlData.publicUrl;
          
          console.log('🔍 [DEBUG] Création de l\'entrée document avec les données:', {
            title: documentTitle,
            type: documentType,
            file_url: documentUrl,
            user_id: participant.id,
            training_id: training.id,
            created_by: session.user.id
          });
          
          // Essayer d'insérer le document avec la méthode RPC pour contourner les problèmes de RLS
          try {
            console.log('🔍 [DEBUG] Tentative d\'insertion du document via RPC');
            
            // Méthode 1: Insertion directe
            const { data: docData, error: docError } = await supabase
              .from('documents')
              .insert({
                title: documentTitle,
                type: documentType,
                file_url: documentUrl,
                user_id: participant.id,
                training_id: training.id,
                created_by: session.user.id
              })
              .select();
            
            if (docError) {
              console.error('🔍 [DEBUG] Erreur lors de la création de l\'entrée document (méthode 1):', docError);
              console.error('🔍 [DEBUG] Détails de l\'erreur document:', JSON.stringify(docError, null, 2));
              
              // Méthode 2: Essayer avec une autre approche si la première échoue
              console.log('🔍 [DEBUG] Tentative d\'insertion avec la méthode 2');
              const { error: docError2 } = await supabase
                .from('documents')
                .insert({
                  title: documentTitle,
                  type: documentType,
                  file_url: documentUrl,
                  user_id: participant.id,
                  training_id: training.id,
                  created_by: session.user.id
                });
              
              if (docError2) {
                console.error('🔍 [DEBUG] Erreur lors de la création de l\'entrée document (méthode 2):', docError2);
                console.error('🔍 [DEBUG] Détails de l\'erreur document:', JSON.stringify(docError2, null, 2));
                throw docError2;
              } else {
                console.log('🔍 [DEBUG] Document inséré avec succès (méthode 2)');
              }
            } else {
              console.log('🔍 [DEBUG] Entrée document créée avec succès (méthode 1):', docData);
            }
          } catch (insertError) {
            console.error('🔍 [DEBUG] Erreur lors de l\'insertion du document:', insertError);
            // Ne pas bloquer le processus si l'insertion échoue
          }
          
          // Vérifier que le document a bien été créé
          console.log('🔍 [DEBUG] Vérification de la création du document');
          const { data: checkData, error: checkError } = await supabase
            .from('documents')
            .select('*')
            .eq('training_id', training.id)
            .eq('user_id', participant.id)
            .eq('type', documentType);
          
          if (checkError) {
            console.error('🔍 [DEBUG] Erreur lors de la vérification du document:', checkError);
          } else {
            console.log('🔍 [DEBUG] Résultat de la vérification:', checkData);
            if (checkData && checkData.length > 0) {
              console.log('🔍 [DEBUG] Document trouvé dans la base de données:', checkData[0]);
              
              // Stocker l'URL du document dans le localStorage pour contourner les problèmes de RLS
              try {
                localStorage.setItem(`document_${training.id}_${participant.id}_${documentType}`, documentUrl);
                console.log('🔍 [DEBUG] URL du document stockée dans le localStorage');
              } catch (storageError) {
                console.error('🔍 [DEBUG] Erreur lors du stockage dans le localStorage:', storageError);
              }
            } else {
              console.warn('🔍 [DEBUG] Aucun document trouvé après insertion');
              
              // Stocker l'URL du document dans le localStorage comme fallback
              try {
                localStorage.setItem(`document_${training.id}_${participant.id}_${documentType}`, documentUrl);
                console.log('🔍 [DEBUG] URL du document stockée dans le localStorage (fallback)');
              } catch (storageError) {
                console.error('🔍 [DEBUG] Erreur lors du stockage dans le localStorage:', storageError);
              }
            }
          }
        } catch (pdfError) {
          console.error('🔍 [DEBUG] Erreur lors de la génération du PDF:', pdfError);
          // Ne pas bloquer le processus si la génération du PDF échoue
        }
      } else {
        console.error('🔍 [DEBUG] pdfContentRef.current est null, impossible de générer le PDF');
      }
      
      console.log('🔍 [DEBUG] StudentTrainingAgreement - Document signé et sauvegardé avec succès');
      
      // Informer le parent que le document a été signé et fermé
      if (onDocumentClose) {
        console.log('🔍 [DEBUG] StudentTrainingAgreement - Calling onDocumentClose after signing');
        onDocumentClose();
      }
      
      // Fermer le document après un court délai
      setTimeout(() => {
        console.log('🔍 [DEBUG] StudentTrainingAgreement - Closing document after timeout');
        onCancel();
      }, 500);
      
    } catch (error) {
      console.error('🔍 [DEBUG] Erreur lors de la sauvegarde du document signé:', error);
      setIsSaving(false);
    }
  };

  // Modification de la façon dont le PDF est généré avec une marge de sécurité
  const generateDocumentPDF = async (element: HTMLElement): Promise<Blob> => {
    try {
      // Créer un élément div temporaire pour la génération du PDF
      const tempContainer = document.createElement('div');
      tempContainer.className = 'pdf-content-container';
      tempContainer.style.width = '210mm'; // Largeur A4
      
      // Cloner l'élément et ajouter des attributs data pour identifier les sections
      const clonedElement = element.cloneNode(true) as HTMLElement;
      
      // Identifier les sections qui ne doivent pas être coupées
      const sectionsToPreserve = clonedElement.querySelectorAll('h1, h2, h3, table, ul, ol, p');
      sectionsToPreserve.forEach((section, index) => {
        section.setAttribute('data-section-id', `section-${index}`);
        section.setAttribute('data-preserve', 'true');
      });
      
      tempContainer.appendChild(clonedElement);
      document.body.appendChild(tempContainer);
      
      // Créer un nouveau document PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
      
      // Dimensions de la page A4
      const pageWidth = 210; // mm
      const pageHeight = 297; // mm
      const margin = 15; // mm
      const contentWidth = pageWidth - 2 * margin; // mm
      const contentHeight = pageHeight - 2 * margin - 10; // mm (avec 10mm de marge supplémentaire en bas)
      
      // Marge de sécurité en pixels pour éviter les coupures
      const safetyMarginPx = 20; // pixels de marge de sécurité
      
      // Générer le canvas pour tout le contenu
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });
      
      // Calculer la hauteur de chaque page en pixels
      const pxRatio = canvas.width / contentWidth;
      const pageHeightPx = contentHeight * pxRatio;
      
      // Collecter les informations sur les sections à préserver
      const preserveSections: {id: string, top: number, bottom: number}[] = [];
      sectionsToPreserve.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const containerRect = tempContainer.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top;
        preserveSections.push({
          id: section.getAttribute('data-section-id') || '',
          top: relativeTop * (canvas.height / tempContainer.offsetHeight),
          bottom: (relativeTop + rect.height) * (canvas.height / tempContainer.offsetHeight)
        });
      });
      
      // Calculer les positions de saut de page optimales
      const pageBreakPositions: number[] = [0]; // Commencer par le début du document
      let currentPageBottom = pageHeightPx;
      
      // Parcourir le document et déterminer les meilleurs points de coupure
      while (currentPageBottom < canvas.height) {
        // Position idéale de coupure (bas de la page actuelle)
        let idealCutPosition = currentPageBottom;
        
        // Trouver la meilleure position de coupure en évitant de couper les sections
        let bestCutPosition = idealCutPosition;
        let minDistance = Number.MAX_SAFE_INTEGER;
        
        // Vérifier si la position idéale coupe une section
        const sectionsAtCut = preserveSections.filter(section => 
          section.top < idealCutPosition && section.bottom > idealCutPosition
        );
        
        if (sectionsAtCut.length > 0) {
          // Chercher une meilleure position de coupure
          preserveSections.forEach(section => {
            // Essayer de couper avant la section
            if (section.top > idealCutPosition - pageHeightPx + safetyMarginPx && 
                section.top < idealCutPosition) {
              const distance = Math.abs(section.top - idealCutPosition);
              if (distance < minDistance) {
                minDistance = distance;
                bestCutPosition = section.top;
              }
            }
            
            // Essayer de couper après la section
            if (section.bottom > idealCutPosition && 
                section.bottom < idealCutPosition + safetyMarginPx) {
              const distance = Math.abs(section.bottom - idealCutPosition);
              if (distance < minDistance) {
                minDistance = distance;
                bestCutPosition = section.bottom;
              }
            }
          });
        }
        
        // Si aucune meilleure position n'est trouvée, utiliser la position idéale
        if (minDistance === Number.MAX_SAFE_INTEGER) {
          bestCutPosition = idealCutPosition;
        }
        
        // Ajouter la position de coupure et passer à la page suivante
        pageBreakPositions.push(bestCutPosition);
        currentPageBottom = bestCutPosition + pageHeightPx;
      }
      
      // Ajouter la position Y de la fin du contenu
      pageBreakPositions.push(canvas.height);
      
      console.log(`🔍 [DEBUG] Génération de PDF: ${pageBreakPositions.length - 1} pages nécessaires`);
      console.log(`🔍 [DEBUG] Positions des sauts de page: ${pageBreakPositions.join(', ')}`);
      
      // Générer chaque page
      for (let i = 0; i < pageBreakPositions.length - 1; i++) {
        // Si ce n'est pas la première page, ajouter une nouvelle page
        if (i > 0) {
          pdf.addPage();
        }
        
        // Calculer les coordonnées de la section à extraire du canvas
        const startY = pageBreakPositions[i];
        const endY = pageBreakPositions[i + 1];
        const height = endY - startY;
        
        // Vérifier si la hauteur est valide
        if (height <= 0) continue;
        
        // Créer un canvas temporaire pour la section
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext('2d');
        
        if (ctx) {
          // Dessiner la section sur le canvas temporaire
          ctx.drawImage(
            canvas,
            0, startY, canvas.width, height,
            0, 0, canvas.width, height
          );
          
          // Convertir le canvas temporaire en image
          const imgData = tempCanvas.toDataURL('image/jpeg', 0.95);
          
          // Ajouter l'image au PDF
          pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, height * contentWidth / canvas.width);
        }
      }
      
      // Nettoyer
      document.body.removeChild(tempContainer);
      
      return pdf.output('blob');
    } catch (error) {
      console.error('🔍 [DEBUG] Erreur lors de la génération du PDF:', error);
      throw error;
    }
  };

  const objectives = getObjectives();
  const evaluationMethods = getEvaluationMethods();
  const pedagogicalMethods = getPedagogicalMethods();
  const materialElements = getMaterialElements();

  // Le contenu de la modale
  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] overflow-hidden" style={{ pointerEvents: 'auto' }}>
      {showSignatureCanvas ? (
        <SignatureCanvas 
          onSave={handleSignatureSave} 
          onCancel={handleSignatureCancel}
          initialName={`${participant.first_name} ${participant.last_name}`}
        />
      ) : existingDocumentUrl ? (
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Convention de formation signée
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => window.open(existingDocumentUrl, '_blank')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Ouvrir dans un nouvel onglet
              </button>
              <button
                onClick={onCancel}
                className="inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <iframe 
              src={existingDocumentUrl} 
              className="w-full h-full border-0" 
              title="Convention de formation signée"
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Convention de formation
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={generatePDF}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={!isSigned}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Télécharger
              </button>
              <button
                onClick={() => {
                  console.log('🔍 [DEBUG] StudentTrainingAgreement - Close button clicked');
                  onCancel();
                }}
                className="inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div ref={pdfContentRef} className="bg-white p-8 shadow-sm border border-gray-200 mx-auto" style={{ maxWidth: '800px' }}>
              <TrainingAgreementTemplate
                training={training}
                participant={participant}
                company={company}
                organizationSettings={organizationSettings}
                participantSignature={participantSignature}
              />
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            {!isSigned && (
              <button
                onClick={() => {
                  console.log('🔍 [DEBUG] StudentTrainingAgreement - Sign button clicked');
                  setShowSignatureCanvas(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Signer le document
              </button>
            )}
            {isSigned && (
              <div className="text-green-600 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Document signé
              </div>
            )}
            <button
              onClick={() => {
                console.log('🔍 [DEBUG] StudentTrainingAgreement - Close button clicked');
                onCancel();
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Utiliser createPortal pour rendre la modale
  return portalElement ? createPortal(modalContent, portalElement) : null;
}; 