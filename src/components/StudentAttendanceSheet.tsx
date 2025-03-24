import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateDocumentPDF } from './shared/DocumentUtils';

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
    company?: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [existingDocumentUrl, setExistingDocumentUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const documentCloseCalled = useRef(false);

  useEffect(() => {
    // Créer un élément div pour le portail s'il n'existe pas déjà
    const existingPortal = document.getElementById('attendance-sheet-portal');
    if (!existingPortal) {
      const newPortalElement = document.createElement('div');
      newPortalElement.id = 'attendance-sheet-portal';
      document.body.appendChild(newPortalElement);
    }

    // Appeler onDocumentOpen si fourni
    if (onDocumentOpen) {
      onDocumentOpen();
    }

    // Cleanup function
    return () => {
      // Appeler onDocumentClose si fourni et s'il n'a pas déjà été appelé
      if (onDocumentClose && !documentCloseCalled.current) {
        documentCloseCalled.current = true;
        onDocumentClose();
      }
      
      const portal = document.getElementById('attendance-sheet-portal');
      if (portal && portal.childNodes.length === 0) {
        portal.remove();
      }
    };
  }, []);

  // Effet pour charger le document (PDF ou générer un PDF depuis une signature)
  useEffect(() => {
    if (existingDocumentUrl) {
      setPdfLoading(true);
      setPdfError(false);
      
      console.log('🔍 [DEBUG] URL du document existant:', existingDocumentUrl);
      
      // Déterminer si c'est une signature ou un PDF
      const isSignatureUrl = existingDocumentUrl.includes('signatures/') || 
                             existingDocumentUrl.includes('signature') ||
                             !existingDocumentUrl.toLowerCase().endsWith('.pdf');
                             
      if (isSignatureUrl) {
        console.log('🔍 [DEBUG] C\'est une URL de signature, recherche du PDF associé');
        
        // Chercher le PDF correspondant dans la table documents
        supabase
          .from('documents')
          .select('file_url')
          .eq('training_id', training.id)
          .eq('user_id', participant.id)
          .eq('type', 'emargement')
          .order('created_at', { ascending: false })
          .limit(1)
          .then(({ data, error }) => {
            if (error) {
              console.error('🔍 [DEBUG] Erreur lors de la recherche du PDF:', error);
              setPdfError(true);
              setPdfLoading(false);
            } else if (data && data.length > 0 && data[0].file_url) {
              console.log('🔍 [DEBUG] PDF trouvé:', data[0].file_url);
              setDocumentUrl(data[0].file_url);
              setPdfLoading(false);
            } else {
              console.log('🔍 [DEBUG] Aucun PDF trouvé, utilisation de l\'URL de signature');
              setDocumentUrl(existingDocumentUrl);
              setPdfLoading(false);
            }
          });
      } else {
        console.log('🔍 [DEBUG] C\'est une URL de PDF, utilisation directe');
        setDocumentUrl(existingDocumentUrl);
        setPdfLoading(false);
      }
    }
  }, [existingDocumentUrl, training.id, participant.id]);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      setIsLoading(true);
      try {
        // Générer les dates disponibles basées sur les dates de formation
        if (training.start_date && training.end_date) {
          const dates = getDateList(training.start_date, training.end_date);
          setAvailableDates(dates);
          
          if (dates.length > 0) {
            setSelectedDate(dates[0]);
          }
        }
        
        // Vérifier si un document existe déjà pour cette formation et cet utilisateur
        const { data: existingDocuments, error: docError } = await supabase
          .from('documents')
          .select('*')
          .eq('training_id', training.id)
          .eq('user_id', participant.id)
          .or('type.eq.autre,type.eq.emargement') // recherche dans les deux types
          .ilike('title', '%Feuille d\'émargement%')
          .order('created_at', { ascending: false });
          
        if (docError) {
          console.error('Erreur lors de la vérification des documents existants:', docError);
        } else if (existingDocuments && existingDocuments.length > 0) {
          // Utiliser le document le plus récent
          const latestDoc = existingDocuments[0];
          
          if (latestDoc.file_url) {
            setExistingDocumentUrl(latestDoc.file_url);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAttendanceData();
  }, [training, participant]);

  // Générer la liste des dates entre deux dates
  const getDateList = (startDateStr: string, endDateStr: string): string[] => {
    const dates: string[] = [];
    
    try {
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      
      // Si les dates sont invalides, retourner un tableau vide
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return [];
      }
      
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        // Exclure les week-ends (0 = dimanche, 6 = samedi)
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          dates.push(format(currentDate, 'yyyy-MM-dd'));
        }
        
        // Passer au jour suivant
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } catch (error) {
      console.error('Erreur lors de la génération des dates:', error);
    }
    
    return dates;
  };

  // Formater une date pour l'affichage
  const formatDisplayDate = (dateStr: string): string => {
    try {
      const date = parse(dateStr, 'yyyy-MM-dd', new Date());
      return format(date, 'dd MMMM yyyy', { locale: fr });
    } catch (error) {
      return dateStr;
    }
  };

  // Si on est en train de charger les données
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col p-6">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Chargement de la feuille d'émargement...</p>
          </div>
        </div>
      </div>
    );
  }

  // Si un document existe, l'afficher dans un iframe
  if (existingDocumentUrl) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col h-[90vh]">
          <div className="p-6 flex items-center justify-between border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Feuille d'émargement signée</h2>
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
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
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
                title="Feuille d'émargement signée" 
                className="w-full h-full min-h-[70vh] rounded-lg border border-gray-600"
                style={{ backgroundColor: 'white' }}
                onLoad={() => console.log('🔍 [DEBUG] Document iframe loaded successfully')}
                onError={() => {
                  console.error('🔍 [DEBUG] Error loading document iframe');
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
              download="feuille_emargement.pdf"
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
              <Download className="w-5 h-5" /> Télécharger la feuille d'émargement
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Affichage simple avec message si aucun document n'existe
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col">
        <div className="p-6 flex items-center justify-between border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Feuille d'émargement</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="bg-gray-700 bg-opacity-50 rounded-lg border border-gray-600 p-4 mb-6">
            <p className="text-white mb-4">
              Aucune feuille d'émargement signée n'est disponible pour le moment. Veuillez contacter votre formateur.
            </p>
            
            {availableDates.length > 0 && (
              <div className="mt-4">
                <div className="text-white mb-2">Dates de formation :</div>
                <ul className="list-disc pl-5 text-white space-y-1">
                  {availableDates.map((date) => (
                    <li key={date}>{formatDisplayDate(date)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 