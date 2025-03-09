import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { AttendanceSheet } from './AttendanceSheet';

interface AttendanceSheetButtonProps {
  training: any;
  participants: any[];
  buttonText?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export const AttendanceSheetButton: React.FC<AttendanceSheetButtonProps> = ({
  training,
  participants,
  buttonText = "Feuilles d'émargement",
  className = "",
  variant = 'primary'
}) => {
  const [showAttendanceSheet, setShowAttendanceSheet] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any | null>(null);

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
  };

  // Fonction pour sélectionner un participant
  const handleSelectParticipant = (participant: any) => {
    setSelectedParticipant(participant);
  };

  // Styles conditionnels pour le bouton
  const buttonStyles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white",
    outline: "bg-white hover:bg-gray-100 text-gray-800 border border-gray-300"
  };

  return (
    <>
      <button
        onClick={handleOpenAttendanceSheet}
        className={`inline-flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${buttonStyles[variant]} ${className}`}
      >
        <FileText className="h-4 w-4 mr-2" />
        {buttonText}
      </button>

      {/* Modal de sélection de participant ou affichage de la feuille d'émargement */}
      {showAttendanceSheet && !selectedParticipant && participants.length > 1 && (
        <div className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-[100] overflow-hidden p-0 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[100vh] sm:max-h-[90vh] overflow-hidden flex flex-col m-0 sm:m-4">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">
                Sélectionner un participant
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <ul className="divide-y divide-gray-200">
                {participants.map((participant) => (
                  <li key={participant.id}>
                    <button
                      onClick={() => handleSelectParticipant(participant)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 text-left flex items-center"
                    >
                      <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 sm:mr-4">
                        <span className="text-blue-800 font-medium text-xs sm:text-sm">
                          {participant.first_name.charAt(0)}{participant.last_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm sm:text-base">
                          {participant.first_name} {participant.last_name}
                        </p>
                        {participant.job_position && (
                          <p className="text-xs sm:text-sm text-gray-500">{participant.job_position}</p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseAttendanceSheet}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Affichage de la feuille d'émargement pour le participant sélectionné */}
      {showAttendanceSheet && selectedParticipant && (
        <AttendanceSheet
          training={{
            id: training.id,
            title: training.title,
            duration: training.duration,
            trainer_name: training.trainer_name || '',
            location: training.location,
            start_date: training.start_date,
            end_date: training.end_date
          }}
          participant={selectedParticipant}
          onCancel={handleCloseAttendanceSheet}
        />
      )}
    </>
  );
}; 