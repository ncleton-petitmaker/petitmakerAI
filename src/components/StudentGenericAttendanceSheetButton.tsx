import React, { useState, useEffect } from 'react';
import { FileText, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GenericAttendanceSheet } from './shared/GenericAttendanceSheet';
import { Training, Participant } from './shared/DocumentUtils';

interface StudentGenericAttendanceSheetButtonProps {
  trainingId: string;
  userId: string;
  buttonText?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
}

/**
 * Bouton permettant d'afficher la feuille d'émargement pour l'apprenant
 * utilisant le nouveau système de gestion des signatures.
 * 
 * Cette version utilise le système unifié de gestion des documents pour assurer
 * une cohérence dans la gestion des signatures à travers toute l'application.
 */
export const StudentGenericAttendanceSheetButton: React.FC<StudentGenericAttendanceSheetButtonProps> = ({
  trainingId,
  userId,
  buttonText = "Feuille d'émargement",
  className = '',
  variant = 'default',
  onDocumentOpen,
  onDocumentClose
}) => {
  const [showAttendanceSheet, setShowAttendanceSheet] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [formattedTraining, setFormattedTraining] = useState<Training | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  useEffect(() => {
    if (showAttendanceSheet && !formattedTraining) {
      loadTrainingData();
    }
  }, [showAttendanceSheet, formattedTraining]);

  const loadTrainingData = async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      // Récupérer les données de la formation
      const { data: trainingData, error: trainingError } = await supabase
        .from('trainings')
        .select(`
          id,
          title,
          start_date,
          end_date,
          duration,
          location,
          objectives,
          evaluation_methods,
          tracking_methods,
          pedagogical_methods,
          material_elements,
          trainer_name,
          trainer_details,
          price,
          company_id
        `)
        .eq('id', trainingId)
        .single();

      if (trainingError) throw trainingError;

      // Récupérer les données de l'apprenant (l'utilisateur connecté)
      const { data: participantData, error: participantError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          user_id,
          training_id,
          status,
          first_name,
          last_name,
          email,
          phone,
          job_position,
          company_id,
          company_name
        `)
        .eq('training_id', trainingId)
        .eq('id', userId)
        .single();

      if (participantError) throw participantError;

      // Formater les données de formation
      setFormattedTraining({
        id: trainingData.id,
        title: trainingData.title,
        duration: trainingData.duration,
        trainer_name: trainingData.trainer_name || '',
        trainer_details: trainingData.trainer_details || '',
        location: trainingData.location,
        start_date: trainingData.start_date,
        end_date: trainingData.end_date,
        objectives: Array.isArray(trainingData.objectives) ? trainingData.objectives : 
                  typeof trainingData.objectives === 'string' ? [trainingData.objectives] : 
                  ['Objectifs à définir'],
        price: trainingData.price,
        evaluation_methods: trainingData.evaluation_methods,
        tracking_methods: trainingData.tracking_methods,
        pedagogical_methods: trainingData.pedagogical_methods,
        material_elements: trainingData.material_elements
      });

      // Formater les données du participant
      setParticipant({
        id: participantData.id,
        first_name: participantData.first_name,
        last_name: participantData.last_name,
        email: participantData.email || '',
        job_position: participantData.job_position || '',
        status: participantData.status || '',
        company: participantData.company_name || ''
      });

      // Générer les dates disponibles pour la formation
      if (trainingData.start_date && trainingData.end_date) {
        const dates = getDateList(trainingData.start_date, trainingData.end_date);
        setAvailableDates(dates);
      } else {
        const today = new Date();
        setAvailableDates([today.toISOString().split('T')[0]]);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDocument = () => {
    setShowAttendanceSheet(true);
    if (onDocumentOpen) onDocumentOpen();
  };

  const handleCloseDocument = () => {
    setShowAttendanceSheet(false);
    setFormattedTraining(null);
    setParticipant(null);
    setSelectedDate('');
    if (onDocumentClose) onDocumentClose();
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
  };

  // Générer une liste de dates pour la formation
  const getDateList = (startDateStr: string, endDateStr: string) => {
    const dates = [];
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Réinitialiser les heures pour éviter des problèmes de comparaison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // Ajouter chaque jour entre start_date et end_date
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  };

  // Classes du bouton selon la variante
  const getButtonClass = () => {
    if (className) return className;

    let baseClass = "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium ";
    
    switch (variant) {
      case 'default':
        return baseClass + "bg-blue-600 text-white hover:bg-blue-700";
      case 'outline':
        return baseClass + "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50";
      case 'ghost':
        return baseClass + "text-gray-700 hover:bg-gray-100";
      default:
        return baseClass + "bg-blue-600 text-white hover:bg-blue-700";
    }
  };

  return (
    <>
      <button
        onClick={handleOpenDocument}
        className={getButtonClass()}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-1"></div>
            Chargement...
          </div>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            {buttonText}
          </>
        )}
      </button>

      {showAttendanceSheet && formattedTraining && participant && !selectedDate && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Sélectionner une date</h3>
              <p className="text-sm text-gray-500 mb-4">
                Veuillez sélectionner la date pour laquelle vous souhaitez signer la feuille d'émargement.
              </p>
              <div className="space-y-2">
                {availableDates.map((date) => (
                  <button
                    key={date}
                    onClick={() => handleSelectDate(date)}
                    className="w-full text-left p-3 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
                  >
                    <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                    <div className="font-medium">{new Date(date).toLocaleDateString('fr-FR')}</div>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleCloseDocument}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAttendanceSheet && formattedTraining && participant && selectedDate && (
        <GenericAttendanceSheet
          training={formattedTraining}
          participant={participant}
          onCancel={handleCloseDocument}
          onDocumentOpen={onDocumentOpen}
          onDocumentClose={onDocumentClose}
          viewContext="student"
          signedDates={[selectedDate]}
        />
      )}

      {showAttendanceSheet && hasError && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-red-600">Erreur</h3>
              <p className="mb-4">
                Une erreur est survenue lors du chargement de la feuille d'émargement. 
                Veuillez réessayer ultérieurement ou contacter votre formateur.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={handleCloseDocument}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 