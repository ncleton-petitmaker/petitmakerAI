import React, { useState, useRef } from 'react';
import { X, Download } from 'lucide-react';
import { generateWordLikePDF } from './admin/pdfGenerator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SignatureCanvas } from './SignatureCanvas';
import { supabase } from '../lib/supabase';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface StudentAttendanceSheetProps {
  training: {
    id: string;
    title: string;
    duration: string;
    trainer_name: string;
    location: string;
    start_date: string | null;
    end_date: string | null;
  };
  participant: {
    id: string;
    first_name: string;
    last_name: string;
    job_position?: string;
  };
  onCancel: () => void;
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
}

export const StudentAttendanceSheet: React.FC<StudentAttendanceSheetProps> = ({
  training,
  participant,
  onCancel,
  onDocumentOpen,
  onDocumentClose
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
      const fileName = `Emargement_${participant.first_name}_${participant.last_name}_${training.title.replace(/\s+/g, '_')}.pdf`;
      
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

  const getTrainingDates = () => {
    const startDate = formatDate(training.start_date);
    const endDate = formatDate(training.end_date);
    
    if (startDate && endDate && startDate !== endDate) {
      return { startDate, endDate };
    } else if (startDate) {
      return { startDate, endDate: startDate };
    }
    return { startDate: '', endDate: '' };
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
      const fileName = `attendance_signature_${participant.id}_${training.id}_${Date.now()}.png`;
      
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
          has_signed_attendance: true,
          attendance_signature_url: urlData.publicUrl,
          attendance_signature_date: new Date().toISOString()
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
          const pdfFileName = `attendance_sheet_${participant.id}_${training.id}_${Date.now()}.pdf`;
          
          console.log('🔍 [DEBUG] Téléchargement du PDF dans le bucket:', pdfFileName);
          
          // Télécharger le PDF dans le bucket Supabase
          const { data: pdfData, error: pdfError } = await supabase.storage
            .from('attendance-sheets')
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
            .from('attendance-sheets')
            .getPublicUrl(pdfFileName);
          
          console.log('🔍 [DEBUG] URL publique du PDF:', pdfUrlData);
          
          // Créer une entrée dans la table documents
          console.log('🔍 [DEBUG] Création de l\'entrée document');
          const { error: docError } = await supabase
            .from('documents')
            .insert({
              title: `Feuille d'émargement - ${participant.first_name} ${participant.last_name}`,
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
      
      console.log('Signature de la feuille d\'émargement enregistrée avec succès');
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

  const { startDate, endDate } = getTrainingDates();

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
              Feuille d'émargement
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
                <h1 className="text-2xl font-bold mb-2">FEUILLE D'ÉMARGEMENT</h1>
              </div>
              
              <div className="mb-6">
                <p className="font-bold">Intitulé de la formation :</p>
                <p className="border-b border-gray-300 py-1">{training.title}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="font-bold">Date de début :</p>
                  <p className="border-b border-gray-300 py-1">{startDate}</p>
                </div>
                <div>
                  <p className="font-bold">Date de fin :</p>
                  <p className="border-b border-gray-300 py-1">{endDate}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="font-bold">Durée :</p>
                  <p className="border-b border-gray-300 py-1">{training.duration}</p>
                </div>
                <div>
                  <p className="font-bold">Lieu :</p>
                  <p className="border-b border-gray-300 py-1">{training.location}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="font-bold">Formateur :</p>
                <p className="border-b border-gray-300 py-1">{training.trainer_name}</p>
              </div>
              
              <div className="mb-8">
                <p className="font-bold">Participant :</p>
                <p className="border-b border-gray-300 py-1">{participant.first_name} {participant.last_name}{participant.job_position ? ` - ${participant.job_position}` : ''}</p>
              </div>
              
              <table className="w-full border-collapse border border-gray-300 mb-8">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-100 p-2">Date</th>
                    <th className="border border-gray-300 bg-gray-100 p-2">Matin<br />(9h-12h30)</th>
                    <th className="border border-gray-300 bg-gray-100 p-2">Après-midi<br />(13h30-17h)</th>
                  </tr>
                </thead>
                <tbody>
                  {startDate === endDate ? (
                    <tr>
                      <td className="border border-gray-300 p-2 text-center">{startDate}</td>
                      <td className="border border-gray-300 p-2 h-16 text-center">
                        {participantSignature && (
                          <img src={participantSignature} alt="Signature du participant" className="h-14 mx-auto" />
                        )}
                      </td>
                      <td className="border border-gray-300 p-2 h-16 text-center">
                        {participantSignature && (
                          <img src={participantSignature} alt="Signature du participant" className="h-14 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ) : (
                    // Si la formation dure plusieurs jours, créer une ligne pour chaque jour
                    (() => {
                      const rows = [];
                      const start = new Date(training.start_date || '');
                      const end = new Date(training.end_date || '');
                      
                      for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
                        const formattedDate = format(day, 'dd/MM/yyyy', { locale: fr });
                        rows.push(
                          <tr key={formattedDate}>
                            <td className="border border-gray-300 p-2 text-center">{formattedDate}</td>
                            <td className="border border-gray-300 p-2 h-16 text-center">
                              {participantSignature && (
                                <img src={participantSignature} alt="Signature du participant" className="h-14 mx-auto" />
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 h-16 text-center">
                              {participantSignature && (
                                <img src={participantSignature} alt="Signature du participant" className="h-14 mx-auto" />
                              )}
                            </td>
                          </tr>
                        );
                      }
                      
                      return rows;
                    })()
                  )}
                </tbody>
              </table>
              
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
                  <p className="font-bold">Signature du formateur :</p>
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