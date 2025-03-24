import React, { useState, useEffect } from 'react';
import { FileText, Calendar } from 'lucide-react';
import { GenericAttendanceSheet } from '../shared/GenericAttendanceSheet';
import { Training, Participant } from '../shared/DocumentUtils';
import { supabase } from '../../lib/supabase';

interface GenericAttendanceSheetButtonProps {
  training: any;
  participants: any[];
  buttonText?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

/**
 * Bouton pour générer une feuille d'émargement dans l'interface CRM
 * utilisant le nouveau système de gestion des signatures.
 * 
 * Cette version utilise le système unifié de gestion des documents pour assurer
 * une cohérence dans la gestion des signatures à travers toute l'application.
 */
export const GenericAttendanceSheetButton: React.FC<GenericAttendanceSheetButtonProps> = ({
  training,
  participants,
  buttonText = "Feuilles d'émargement",
  className = "",
  variant = 'primary'
}) => {
  const [showAttendanceSheet, setShowAttendanceSheet] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any | null>(null);
  const [signedDates, setSignedDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDateSelectionOpen, setIsDateSelectionOpen] = useState(false);
  const [formattedTraining, setFormattedTraining] = useState<Training | null>(null);
  const [formattedParticipant, setFormattedParticipant] = useState<Participant | null>(null);

  useEffect(() => {
    if (selectedParticipant && !formattedTraining) {
      formatTrainingData();
    }
  }, [selectedParticipant]);

  // Formater les données de la formation pour le composant GenericAttendanceSheet
  const formatTrainingData = () => {
    setIsLoading(true);
    try {
      // Formater les données de la formation
      setFormattedTraining({
        id: training.id,
        title: training.title,
        duration: training.duration,
        trainer_name: training.trainer_name || '',
        trainer_details: training.trainer_details || '',
        location: training.location,
        start_date: training.start_date,
        end_date: training.end_date,
        objectives: Array.isArray(training.objectives) ? training.objectives : 
                  typeof training.objectives === 'string' ? [training.objectives] : 
                  ['Objectifs à définir'],
        price: training.price,
        evaluation_methods: training.evaluation_methods,
        tracking_methods: training.tracking_methods,
        pedagogical_methods: training.pedagogical_methods,
        material_elements: training.material_elements
      });

      // Formater les données du participant
      setFormattedParticipant({
        id: selectedParticipant.id,
        first_name: selectedParticipant.first_name,
        last_name: selectedParticipant.last_name,
        email: selectedParticipant.email || '',
        job_position: selectedParticipant.job_position || '',
        status: selectedParticipant.status || '',
        company: selectedParticipant.company_name || ''
      });

      // Générer les dates disponibles pour la formation
      if (training.start_date && training.end_date) {
        const dates = getDateList(training.start_date, training.end_date);
        setSignedDates(dates);
      } else {
        const today = new Date();
        setSignedDates([today.toISOString().split('T')[0]]);
      }

      setIsDateSelectionOpen(true);
    } catch (error) {
      console.error('Erreur lors du formatage des données:', error);
    } finally {
      setIsLoading(false);
    }
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

  // Fonction pour ouvrir la modal de sélection de participant
  const handleOpenAttendanceSheet = () => {
    if (participants.length === 1) {
      // S'il n'y a qu'un seul participant, ouvrir directement sa feuille d'émargement
      setSelectedParticipant(participants[0]);
      setShowAttendanceSheet(true);
    } else if (participants.length > 1) {
      // S'il y a plusieurs participants, ouvrir la modal de sélection
      setShowAttendanceSheet(true);
    } else {
      // S'il n'y a pas de participants
      alert("Aucun participant n'est inscrit à cette formation.");
    }
  };

  // Fonction pour fermer la modal
  const handleCloseAttendanceSheet = () => {
    setShowAttendanceSheet(false);
    setSelectedParticipant(null);
    setFormattedTraining(null);
    setFormattedParticipant(null);
    setIsDateSelectionOpen(false);
  };

  // Fonction pour sélectionner un participant
  const handleSelectParticipant = (participant: any) => {
    setSelectedParticipant(participant);
  };

  // Fonction pour fermer la sélection de date et afficher le document
  const handleContinueWithDates = () => {
    setIsDateSelectionOpen(false);
  };

  // Classes du bouton selon la variante
  const getButtonClass = () => {
    if (className) return className;

    switch (variant) {
      case 'primary':
        return "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700";
      case 'secondary':
        return "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-600 text-white hover:bg-gray-700";
      case 'outline':
        return "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50";
      default:
        return "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700";
    }
  };

  return (
    <>
      <button
        onClick={handleOpenAttendanceSheet}
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

      {showAttendanceSheet && !selectedParticipant && participants.length > 1 && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Sélectionner un participant</h3>
              <div className="space-y-2">
                {participants.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectParticipant(p)}
                    className="w-full text-left p-3 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <div className="font-medium">{p.first_name} {p.last_name}</div>
                    {p.email && <div className="text-sm text-gray-500">{p.email}</div>}
                    {p.job_position && <div className="text-xs text-gray-400">{p.job_position}</div>}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleCloseAttendanceSheet}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {formattedTraining && formattedParticipant && isDateSelectionOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Dates de la formation</h3>
              <p className="text-sm text-gray-500 mb-4">
                La feuille d'émargement inclura les dates suivantes :
              </p>
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                <ul className="space-y-2">
                  {signedDates.map((date) => (
                    <li key={date} className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                      <span>{new Date(date).toLocaleDateString('fr-FR')}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={handleCloseAttendanceSheet}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleContinueWithDates}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Continuer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {formattedTraining && formattedParticipant && !isDateSelectionOpen && (
        <GenericAttendanceSheet
          training={formattedTraining}
          participant={formattedParticipant}
          onCancel={handleCloseAttendanceSheet}
          viewContext="crm"
          signedDates={signedDates}
        />
      )}
    </>
  );
}; 