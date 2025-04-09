import React, { useState, useRef, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SignatureCanvas } from '../SignatureCanvas';
import { generateDocumentPDF, Training, Participant, OrganizationSettings } from './DocumentUtils';
import { CompletionCertificateTemplate } from './templates/CompletionCertificateTemplate';
import { DocumentManager } from './DocumentManager';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { DocumentType } from '../../types/SignatureTypes';

interface CompletionCertificateProps {
  training: Training;
  participant: Participant;
  viewContext: 'crm' | 'student';
  onCancel: () => void;
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
}

/**
 * Composant unifié pour l'attestation de fin de formation
 * 
 * Ce composant est utilisé à la fois dans l'interface CRM et l'interface apprenant.
 * Il adapte son comportement en fonction du contexte d'utilisation.
 */
export const CompletionCertificate: React.FC<CompletionCertificateProps> = ({
  training,
  participant,
  viewContext,
  onCancel,
  onDocumentOpen,
  onDocumentClose
}) => {
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [trainerSignature, setTrainerSignature] = useState<string | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [organizationSettings, setOrganizationSettings] = useState<OrganizationSettings | null>(null);

  // Génération du PDF pour téléchargement
  const generatePDF = async () => {
    if (!pdfContentRef.current) return;
    
    try {
      // Générer un nom de fichier basé sur le nom du participant et le titre de la formation
      const fileName = `Attestation_${participant.first_name}_${participant.last_name}_${training.title.replace(/\s+/g, '_')}.pdf`;
      
      // Générer le PDF
      const pdfBlob = await generateDocumentPDF(pdfContentRef.current);
      
      // Télécharger le PDF
      downloadPDF(pdfBlob, fileName);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
    }
  };
  
  // Télécharger un PDF à partir d'un Blob
  const downloadPDF = (blob: Blob, fileName: string) => {
    // Créer une URL pour le blob
    const url = URL.createObjectURL(blob);
    
    // Créer un lien de téléchargement
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    // Ajouter le lien au document, cliquer dessus, puis le supprimer
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Libérer l'URL
    URL.revokeObjectURL(url);
  };

  // Récupérer la signature du formateur et les paramètres de l'organisation
  useEffect(() => {
    const fetchOrganizationSettings = async () => {
      setIsLoading(true);
      try {
        console.log(`🔍 [DEBUG] CompletionCertificate (${viewContext}) - Récupération des paramètres`);
        
        // Récupérer les paramètres de l'organisation
        const { data: settings, error: settingsError } = await supabase
          .from('organization_settings')
          .select('*')
          .single();
          
        if (settingsError) {
          console.error('Erreur lors de la récupération des paramètres:', settingsError);
          // Créer des paramètres par défaut en cas d'erreur
          setOrganizationSettings({
            organization_name: 'Petit Maker',
            siret: '',
            address: 'Adresse non disponible',
            representative_name: '',
            activity_declaration_number: ''
          });
        } else {
          // Mapper les données reçues au format attendu
          setOrganizationSettings({
            organization_name: settings.company_name || settings.organization_name || 'Petit Maker',
            siret: settings.siret || '',
            address: settings.address || '',
            postal_code: settings.postal_code || '',
            city: settings.city || '',
            country: settings.country || '',
            representative_name: settings.representative_name || '',
            representative_title: settings.representative_title || '',
            activity_declaration_number: settings.training_number || settings.activity_declaration_number || ''
          });
        }
        
        // Récupérer la signature du formateur
        fetchTrainerSignature();
      } catch (error) {
        console.error('Erreur lors de la récupération des paramètres:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrganizationSettings();
  }, [training.id, viewContext]);

  // Fonction dédiée pour récupérer la signature du formateur
  const fetchTrainerSignature = async () => {
    try {
      console.log('🔍 [DEBUG] CompletionCertificate - Récupération de la signature du formateur');
      
      const trainerSignatureUrl = await DocumentManager.getLastSignature({
        training_id: training.id,
        type: 'attestation',
        signature_type: 'trainer'
      });
      
      if (trainerSignatureUrl) {
        console.log('🔍 [DEBUG] Signature du formateur trouvée:', trainerSignatureUrl);
        setTrainerSignature(trainerSignatureUrl);
        // Si on est en mode formateur et qu'on a déjà signé
        if (viewContext === 'crm') {
          setIsSigned(true);
        }
      } else {
        console.log('🔍 [DEBUG] Aucune signature de formateur trouvée');
      }
    } catch (error) {
      console.error('🔍 [DEBUG] Erreur lors de la récupération de la signature du formateur:', error);
    }
  };

  // Gestionnaire pour ouvrir le canvas de signature
  const handleSignatureClick = () => {
    setShowSignatureCanvas(true);
  };

  // Gestionnaire pour annuler la signature
  const handleSignatureCancel = () => {
    setShowSignatureCanvas(false);
  };

  // Génération du PDF pour sauvegarder
  const generateDocumentPDF = async (element: HTMLElement): Promise<Blob> => {
    // Créer un élément temporaire pour la génération du PDF
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = element.innerHTML;
    document.body.appendChild(tempDiv);

    try {
      // Générer le canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        logging: false,
        useCORS: true
      });

      // Créer le PDF
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Ajouter l'image au PDF
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        0,
        imgWidth,
        imgHeight
      );

      // Convertir en Blob
      const blob = pdf.output('blob');
      return blob;
    } finally {
      // Nettoyer
      document.body.removeChild(tempDiv);
    }
  };

  // Gestionnaire pour sauvegarder la signature
  const handleSignatureSave = async (signatureDataUrl: string) => {
    setIsSaving(true);
    try {
      console.log(`🔍 [DEBUG] CompletionCertificate (${viewContext}) - handleSignatureSave called`);
      
      // Vérifier si l'utilisateur est authentifié
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour signer le document");
      }

      // Seul le formateur peut signer l'attestation
      const signatureType = 'trainer';
      
      // Sauvegarder la signature via DocumentManager
      const signatureUrl = await DocumentManager.saveSignature(
        signatureDataUrl,
        'attestation',
        {
          training_id: training.id,
          user_id: participant.id,
          created_by: session.user.id,
          type: signatureType
        }
      );
      
      // Mettre à jour l'état local de la signature
      setTrainerSignature(signatureDataUrl);
      setShowSignatureCanvas(false);
      setIsSigned(true);

      // Générer et sauvegarder le PDF signé
      if (pdfContentRef.current) {
        // Attendre que le DOM soit mis à jour avec la signature
        setTimeout(async () => {
          try {
            // Vérifier que la référence est toujours valide
            if (pdfContentRef.current) {
              const pdfBlob = await generateDocumentPDF(pdfContentRef.current);
              
              // Sauvegarder le PDF via DocumentManager
              await DocumentManager.saveDocument(
                pdfBlob,
                {
                  training_id: training.id,
                  user_id: participant.id,
                  created_by: session.user.id,
                  type: DocumentType.COMPLETION_CERTIFICATE,
                  participant_name: `${participant.first_name} ${participant.last_name}`
                }
              );
              
              console.log('🔍 [DEBUG] PDF d\'attestation signé généré et sauvegardé avec succès');
            }
          } catch (error) {
            console.error('🔍 [DEBUG] Erreur lors de la génération du PDF signé:', error);
          }
        }, 500);  // Délai pour s'assurer que le DOM est mis à jour
      }
    } catch (error) {
      console.error('🔍 [DEBUG] Erreur lors de la sauvegarde de la signature:', error);
      alert("Une erreur est survenue lors de la sauvegarde de la signature. Veuillez réessayer.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-[9999] overflow-hidden">
      {showSignatureCanvas ? (
        <SignatureCanvas 
          onSave={handleSignatureSave} 
          onCancel={handleSignatureCancel}
          initialName={training.trainer_name || ""}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Attestation de fin de formation {viewContext === 'crm' && `- ${participant.first_name} ${participant.last_name}`}
            </h3>
            <div className="flex space-x-2">
              {/* Bouton signature pour la vue CRM uniquement */}
              {viewContext === 'crm' && !isSigned && (
                <button
                  onClick={handleSignatureClick}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Signer
                </button>
              )}
              
              {/* Bouton génération PDF */}
              <button
                onClick={generatePDF}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={viewContext === 'crm' && !isSigned}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Télécharger
              </button>
              
              {/* Bouton fermeture */}
              <button
                onClick={onCancel}
                className="inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div ref={pdfContentRef}>
                <CompletionCertificateTemplate
                  training={training}
                  participant={participant}
                  organizationSettings={organizationSettings || undefined}
                  trainerSignature={trainerSignature}
                  viewContext={viewContext}
                />
              </div>
            )}
          </div>
          
          {/* Pied de page */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            {viewContext === 'crm' && isSigned && (
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