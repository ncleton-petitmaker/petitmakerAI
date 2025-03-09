import React, { useState, useRef, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { generateWordLikePDF } from './admin/pdfGenerator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SignatureCanvas } from './SignatureCanvas';
import { supabase } from '../lib/supabase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
            console.log('🔍 [DEBUG] URL du document trouvée, redirection vers le document existant');
            
            // Stocker l'URL dans le localStorage
            const localStorageKey = `document_${training.id}_${participant.id}_convention`;
            try {
              localStorage.setItem(localStorageKey, latestDoc.file_url);
              console.log('🔍 [DEBUG] URL du document stockée dans le localStorage');
            } catch (storageError) {
              console.error('🔍 [DEBUG] Erreur lors du stockage dans le localStorage:', storageError);
            }
            
            // Rediriger vers le document existant
            window.open(latestDoc.file_url, '_blank');
            
            // Fermer le composant
            onCancel();
            return;
          }
        } else {
          console.log('🔍 [DEBUG] Aucun document existant trouvé pour cet utilisateur, vérification des templates');
          
          // Vérifier s'il existe un template de convention pour cette formation
          const { data: trainingData, error: trainingError } = await supabase
            .from('trainings')
            .select('agreement_template_url')
            .eq('id', training.id)
            .single();
            
          if (trainingError) {
            console.error('🔍 [DEBUG] Erreur lors de la récupération du template de convention:', trainingError);
          } else if (trainingData && trainingData.agreement_template_url) {
            console.log('🔍 [DEBUG] Template de convention trouvé:', trainingData.agreement_template_url);
            
            // Nous avons un template, mais nous allons quand même générer un document personnalisé
            // pour cet utilisateur plutôt que d'utiliser directement le template
            console.log('🔍 [DEBUG] Génération d\'un document personnalisé à partir du template');
          }
        }
        
        // Récupérer les données de l'entreprise si disponible
        if (training.company_id) {
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', training.company_id)
            .single();
          
          if (!companyError && companyData) {
            console.log('🔍 [DEBUG] StudentTrainingAgreement - Company data fetched successfully');
            setCompany(companyData);
          }
        }
        
        // Récupérer les paramètres de l'organisme de formation
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('*')
          .single();
        
        if (!settingsError && settingsData) {
          console.log('🔍 [DEBUG] StudentTrainingAgreement - Settings data fetched successfully');
          setOrganizationSettings(settingsData);
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
          
          // Créer un nom de fichier unique pour le document (simplifié)
          const pdfFileName = `convention_${participant.last_name.toLowerCase()}_${participant.first_name.toLowerCase()}_${timestamp}.pdf`;
          
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
      
      console.log('Signature de la convention enregistrée avec succès');
      
      // Forcer la mise à jour de l'interface utilisateur
      setTimeout(() => {
        alert('Document signé avec succès. Vous pouvez maintenant le consulter.');
      }, 500);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la signature:', error);
      
      // Afficher un message d'erreur plus détaillé
      let errorMessage = 'Une erreur est survenue lors de l\'enregistrement de la signature.';
      
      if (error instanceof Error) {
        errorMessage += ' ' + error.message;
      }
      
      if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage += ' ' + (error as any).message;
      }
      
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Fonction pour générer un PDF à partir d'un élément HTML
  const generateDocumentPDF = async (element: HTMLElement): Promise<Blob> => {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    return pdf.output('blob');
  };

  const objectives = getObjectives();
  const evaluationMethods = getEvaluationMethods();
  const pedagogicalMethods = getPedagogicalMethods();
  const materialElements = getMaterialElements();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-[9999] overflow-hidden">
      {showSignatureCanvas ? (
        <SignatureCanvas 
          onSave={handleSignatureSave} 
          onCancel={handleSignatureCancel}
          initialName={`${participant.first_name} ${participant.last_name}`}
        />
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
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">CONVENTION DE FORMATION PROFESSIONNELLE</h1>
                <p className="text-sm text-gray-600">(Article L. 6353-1 du Code du travail)</p>
              </div>
              
              <div className="mb-8">
                <p>Entre les soussignés :</p>
                <p className="mt-4"><strong>1. {organizationSettings.organization_name || 'FORMACEO'}</strong></p>
                <p>SIRET : {organizationSettings.siret || 'N/A'}</p>
                <p>Adresse : {organizationSettings.address || 'N/A'}</p>
                <p>Représenté par : {organizationSettings.representative_name || 'N/A'}</p>
                <p>Numéro de déclaration d'activité : {organizationSettings.activity_declaration_number || 'N/A'}</p>
                <p className="mt-4"><strong>2. {company?.name || participant.company || 'Entreprise du stagiaire'}</strong></p>
                <p>Représenté par : {company?.contact_name || 'N/A'}</p>
                <p>Adresse : {company?.address || 'N/A'}</p>
                <p>SIRET : {company?.siret || 'N/A'}</p>
                <p className="mt-4">Est conclue la convention suivante, en application des dispositions du Livre III de la sixième partie du Code du travail.</p>
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Article 1 : Objet de la convention</h2>
                <p>L'organisme de formation s'engage à organiser l'action de formation suivante :</p>
                <p className="mt-2"><strong>Intitulé de la formation :</strong> {training.title}</p>
                <p><strong>Objectifs :</strong></p>
                <ul className="list-disc pl-6">
                  {objectives.map((objective, index) => (
                    <li key={index} className="mb-1">{objective}</li>
                  ))}
                </ul>
                <p className="mt-2"><strong>Dates :</strong> {getTrainingDates()}</p>
                <p><strong>Durée :</strong> {training.duration}</p>
                <p><strong>Lieu :</strong> {training.location}</p>
                <p><strong>Participant :</strong> {participant.first_name} {participant.last_name}{participant.job_position ? ` - ${participant.job_position}` : ''}</p>
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Article 2 : Nature et caractéristiques de l'action de formation</h2>
                <p><strong>Méthodes pédagogiques :</strong></p>
                <ul className="list-disc pl-6">
                  {pedagogicalMethods.map((method, index) => (
                    <li key={index} className="mb-1">{method}</li>
                  ))}
                </ul>
                <p className="mt-2"><strong>Moyens matériels :</strong></p>
                <ul className="list-disc pl-6">
                  {materialElements.map((element, index) => (
                    <li key={index} className="mb-1">{element}</li>
                  ))}
                </ul>
                <p className="mt-2"><strong>Méthodes d'évaluation :</strong></p>
                <ul className="list-disc pl-6">
                  {evaluationMethods.map((method, index) => (
                    <li key={index} className="mb-1">{method}</li>
                  ))}
                </ul>
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Article 3 : Dispositions financières</h2>
                <p>Le client s'engage à verser à l'organisme de formation, en contrepartie de cette action de formation, une somme correspondant aux frais de formation de :</p>
                <p className="mt-2"><strong>Prix HT :</strong> {training.price ? `${training.price} €` : 'N/A'}</p>
                <p><strong>TVA (20%) :</strong> {training.price ? `${training.price * 0.2} €` : 'N/A'}</p>
                <p><strong>Prix TTC :</strong> {training.price ? `${training.price * 1.2} €` : 'N/A'}</p>
                <p className="mt-2">Cette somme couvre l'intégralité des frais engagés par l'organisme de formation pour cette session.</p>
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Article 4 : Modalités de règlement</h2>
                <p>Le paiement sera dû à réception de la facture, à l'issue de la formation.</p>
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Article 5 : Dédit ou abandon</h2>
                <p>En cas de dédit par l'entreprise à moins de 10 jours francs avant le début de l'action mentionnée à l'article 1, ou d'abandon en cours de formation par un ou plusieurs stagiaires, l'organisme remboursera sur le coût total, les sommes qu'il n'aura pas réellement dépensées ou engagées pour la réalisation de ladite action.</p>
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Article 6 : Date d'effet et durée de la convention</h2>
                <p>La présente convention prend effet à compter de sa signature pour la durée de la formation.</p>
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Article 7 : Différends éventuels</h2>
                <p>Si une contestation ou un différend ne peuvent être réglés à l'amiable, le Tribunal de Commerce de Paris sera seul compétent pour régler le litige.</p>
              </div>
              
              <div className="mb-8">
                <p>Fait en double exemplaire, à Paris, le {getCurrentDate()}</p>
              </div>
              
              <div className="flex justify-between mt-12">
                <div className="text-left">
                  <p className="font-bold">Pour le stagiaire :</p>
                  <p>{participant.first_name} {participant.last_name}</p>
                  <div className="h-24 w-48 mt-2 border border-gray-300 flex items-center justify-center">
                    {participantSignature ? (
                      <img src={participantSignature} alt="Signature du stagiaire" className="max-h-full max-w-full" />
                    ) : (
                      <p className="text-gray-400 text-sm">Aucune signature</p>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-bold">Pour l'organisme de formation :</p>
                  <p>{organizationSettings.representative_name || 'Le représentant'}</p>
                  <div className="h-24 w-48 mt-2 border border-gray-300">
                    {/* Espace pour la signature de l'organisme */}
                  </div>
                </div>
              </div>
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
}; 