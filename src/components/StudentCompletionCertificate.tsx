import React, { useState, useRef } from 'react';
import { X, Download } from 'lucide-react';
import { generateWordLikePDF } from './admin/pdfGenerator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SignatureCanvas } from './SignatureCanvas';
import { supabase } from '../lib/supabase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface StudentCompletionCertificateProps {
  training: {
    id: string;
    title: string;
    duration: string;
    trainer_name: string;
    location: string;
    start_date: string | null;
    end_date: string | null;
    objectives: string[];
    evaluation_methods?: {
      profile_evaluation: boolean;
      skills_evaluation: boolean;
      knowledge_evaluation: boolean;
      satisfaction_survey: boolean;
    };
    tracking_methods?: {
      attendance_sheet: boolean;
      completion_certificate: boolean;
    };
    pedagogical_methods?: {
      needs_evaluation: boolean;
      theoretical_content: boolean;
      practical_exercises: boolean;
      case_studies: boolean;
      experience_sharing: boolean;
      digital_support: boolean;
    };
    material_elements?: {
      computer_provided: boolean;
      pedagogical_material: boolean;
      digital_support_provided: boolean;
    };
  };
  participant: {
    id: string;
    first_name: string;
    last_name: string;
    job_position?: string;
  };
  onCancel: () => void;
}

export const StudentCompletionCertificate: React.FC<StudentCompletionCertificateProps> = ({
  training,
  participant,
  onCancel
}) => {
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [participantSignature, setParticipantSignature] = useState<string | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const generatePDF = async () => {
    if (!pdfContentRef.current) return;
    
    try {
      // Générer un nom de fichier basé sur le nom du participant et le titre de la formation
      const fileName = `Attestation_${participant.first_name}_${participant.last_name}_${training.title.replace(/\s+/g, '_')}.pdf`;
      
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

  // Fonction pour extraire le prénom du formateur
  const getTrainerFirstName = () => {
    if (!training.trainer_name) return '';
    const names = training.trainer_name.split(' ');
    return names[0] || '';
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

  // Fonction pour obtenir les méthodes de suivi
  const getTrackingMethods = () => {
    const methods = [];
    
    if (training.tracking_methods) {
      if (training.tracking_methods.attendance_sheet) methods.push("Feuille de présence");
      if (training.tracking_methods.completion_certificate) methods.push("Attestation de fin de formation");
    }
    
    return methods.length > 0 ? methods : ["Aucune méthode de suivi spécifiée"];
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
      
      // Convertir l'URL de données en Blob
      const res = await fetch(signatureDataUrl);
      const blob = await res.blob();
      
      // Créer un nom de fichier unique pour la signature
      const fileName = `certificate_signature_${participant.id}_${training.id}_${Date.now()}.png`;
      
      console.log('🔍 [DEBUG] Téléchargement de la signature dans le bucket:', fileName);
      
      // Télécharger la signature dans le bucket Supabase
      const { data, error } = await supabase.storage
        .from('signatures')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (error) {
        console.error('🔍 [DEBUG] Erreur lors du téléchargement de la signature:', error);
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
          has_signed_certificate: true,
          certificate_signature_url: urlData.publicUrl,
          certificate_signature_date: new Date().toISOString()
        })
        .eq('id', participant.id);
      
      if (updateError) {
        console.error('🔍 [DEBUG] Erreur lors de la mise à jour du profil:', updateError);
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
          
          // Générer le PDF
          const pdfBlob = await generateDocumentPDF(tempDiv);
          document.body.removeChild(tempDiv);
          
          // Créer un nom de fichier unique pour le document
          const pdfFileName = `certificate_${participant.id}_${training.id}_${Date.now()}.pdf`;
          
          console.log('🔍 [DEBUG] Téléchargement du PDF dans le bucket:', pdfFileName);
          
          // Télécharger le PDF dans le bucket Supabase
          const { data: pdfData, error: pdfError } = await supabase.storage
            .from('completion-certificates')
            .upload(pdfFileName, pdfBlob, {
              contentType: 'application/pdf',
              upsert: true
            });
          
          if (pdfError) {
            console.error('🔍 [DEBUG] Erreur lors du téléchargement du PDF:', pdfError);
            throw pdfError;
          }
          
          console.log('🔍 [DEBUG] PDF téléchargé avec succès:', pdfData);
          
          // Obtenir l'URL publique du PDF
          const { data: pdfUrlData } = await supabase.storage
            .from('completion-certificates')
            .getPublicUrl(pdfFileName);
          
          console.log('🔍 [DEBUG] URL publique du PDF:', pdfUrlData);
          
          // Créer une entrée dans la table documents
          console.log('🔍 [DEBUG] Création de l\'entrée document');
          const { error: docError } = await supabase
            .from('documents')
            .insert({
              title: `Attestation de fin de formation - ${participant.first_name} ${participant.last_name}`,
              type: 'attestation',
              file_url: pdfUrlData.publicUrl,
              user_id: participant.id,
              training_id: training.id,
              created_by: session.user.id
            });
          
          if (docError) {
            console.error('🔍 [DEBUG] Erreur lors de la création de l\'entrée document:', docError);
            throw docError;
          }
          
          console.log('🔍 [DEBUG] Entrée document créée avec succès');
        } catch (pdfError) {
          console.error('🔍 [DEBUG] Erreur lors de la génération du PDF:', pdfError);
          // Ne pas bloquer le processus si la génération du PDF échoue
        }
      }
      
      console.log('Signature de l\'attestation enregistrée avec succès');
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
  const trackingMethods = getTrackingMethods();
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
              Attestation de fin de formation
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
                onClick={onCancel}
                className="inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div ref={pdfContentRef} className="bg-white p-8 shadow-sm border border-gray-200 mx-auto" style={{ maxWidth: '800px' }}>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">ATTESTATION DE FIN DE FORMATION</h1>
                <p className="text-sm text-gray-600">Article L. 6353-1 du Code du travail</p>
              </div>
              
              <div className="mb-8">
                <p>Je soussigné(e), <strong>{training.trainer_name || '[Nom du formateur]'}</strong>, représentant de l'organisme de formation <strong>FORMACEO</strong>, atteste que :</p>
              </div>
              
              <div className="mb-8">
                <p><strong>{participant.first_name} {participant.last_name}</strong>{participant.job_position ? `, ${participant.job_position}` : ''}, a suivi la formation intitulée :</p>
                <p className="text-center font-bold my-4">{training.title}</p>
                <p>qui s'est déroulée {getTrainingDates()}</p>
                <p>Durée : {training.duration}</p>
                <p>Lieu : {training.location}</p>
              </div>
              
              <div className="mb-8 text-left">
                <p className="font-bold">• Nature et objectifs de la formation :</p>
                <ul className="list-none pl-6">
                  {objectives.map((objective, index) => (
                    <li key={index} className="mb-1">➢ {objective}</li>
                  ))}
                </ul>
              </div>
              
              <div className="mb-8 text-left">
                <p className="font-bold">• Méthodes d'évaluation :</p>
                <ul className="list-none pl-6">
                  {evaluationMethods.map((method, index) => (
                    <li key={index} className="mb-1">➢ {method}</li>
                  ))}
                </ul>
              </div>
              
              <div className="mb-8 text-left">
                <p className="font-bold">• Méthodes de suivi :</p>
                <ul className="list-none pl-6">
                  {trackingMethods.map((method, index) => (
                    <li key={index} className="mb-1">➢ {method}</li>
                  ))}
                </ul>
              </div>
              
              <div className="mb-8 text-left">
                <p className="font-bold">• Méthodes pédagogiques :</p>
                <ul className="list-none pl-6">
                  {pedagogicalMethods.map((method, index) => (
                    <li key={index} className="mb-1">➢ {method}</li>
                  ))}
                </ul>
              </div>
              
              <div className="mb-8 text-left">
                <p className="font-bold">• Éléments matériels :</p>
                <ul className="list-none pl-6">
                  {materialElements.map((element, index) => (
                    <li key={index} className="mb-1">➢ {element}</li>
                  ))}
                </ul>
              </div>
              
              <div className="mb-8 text-left">
                <p className="font-bold">• Résultat de l'évaluation des acquis de la formation :</p>
                <p>Le participant maîtrise les points et thématiques abordés durant la formation.</p>
              </div>
              
              <div className="mb-8 text-left">
                <p>Il n'y a pas d'absence</p>
                <p>Pour servir et valoir ce que de droit</p>
              </div>
              
              <div className="flex justify-between mt-12">
                <div className="text-left">
                  <p className="font-bold">Signature du stagiaire :</p>
                  <div className="h-24 w-48 mt-2 border border-gray-300 flex items-center justify-center">
                    {participantSignature ? (
                      <img src={participantSignature} alt="Signature du stagiaire" className="max-h-full max-w-full" />
                    ) : (
                      <p className="text-gray-400 text-sm">Aucune signature</p>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-bold">M. {training.trainer_name || '[Nom du formateur]'}</p>
                  <p>Le dirigeant</p>
                  <div className="h-24 w-48 mt-2 border border-gray-300">
                    {/* Espace pour la signature du formateur */}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            {!isSigned && (
              <button
                onClick={() => setShowSignatureCanvas(true)}
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
              onClick={onCancel}
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