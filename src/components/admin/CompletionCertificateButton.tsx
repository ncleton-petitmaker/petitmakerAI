import React, { useState } from 'react';
import { Award } from 'lucide-react';
import { CompletionCertificate } from '../shared/CompletionCertificate';
import { Training, Participant } from '../shared/DocumentUtils';

interface CompletionCertificateButtonProps {
  training: any;
  participants: any[];
  buttonText?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

/**
 * Bouton pour générer une attestation de fin de formation dans l'interface CRM
 * 
 * IMPORTANT: Ce composant utilise le composant unifié CompletionCertificate
 * pour garantir une cohérence parfaite entre les documents.
 */
export const CompletionCertificateButton: React.FC<CompletionCertificateButtonProps> = ({
  training,
  participants,
  buttonText = "Attestation de fin",
  className = "",
  variant = 'primary'
}) => {
  const [showCertificate, setShowCertificate] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);

  const handleOpenCertificate = () => {
    console.log("Ouverture du certificat, données de formation:", training);
    
    // Si un seul participant, ouvrir directement l'attestation
    if (participants.length === 1) {
      setSelectedParticipant(participants[0]);
      setShowCertificate(true);
    } else if (participants.length > 1) {
      // Sinon, afficher la modal de sélection
      setShowCertificate(true);
      setSelectedParticipant(null);
    }
  };

  const handleCloseCertificate = () => {
    setShowCertificate(false);
    setSelectedParticipant(null);
  };

  const handleSelectParticipant = (participant: any) => {
    setSelectedParticipant(participant);
  };

  // Définir les classes du bouton en fonction de la variante
  let buttonClasses = "inline-flex items-center rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ";
  
  if (variant === 'primary') {
    buttonClasses += "px-3 py-2 border border-transparent text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 ";
  } else if (variant === 'secondary') {
    buttonClasses += "px-3 py-2 border border-transparent text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 ";
  } else if (variant === 'outline') {
    buttonClasses += "px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 ";
  }
  
  buttonClasses += className;

  // Formatage des données selon les interfaces partagées
  const mapTrainingToSharedInterface = (training: any): Training => ({
    id: training.id,
    title: training.title,
    duration: training.duration,
    trainer_name: training.trainer_name || '',
    location: training.location,
    start_date: training.start_date,
    end_date: training.end_date,
    objectives: Array.isArray(training.objectives) ? training.objectives : 
               typeof training.objectives === 'string' ? [training.objectives] : 
               ['Objectifs à définir'],
    evaluation_methods: {
      profile_evaluation: training.evaluation_methods?.profile_evaluation || false,
      skills_evaluation: training.evaluation_methods?.skills_evaluation || false,
      knowledge_evaluation: training.evaluation_methods?.knowledge_evaluation || false,
      satisfaction_survey: training.evaluation_methods?.satisfaction_survey || false
    },
    tracking_methods: {
      attendance_sheet: training.tracking_methods?.attendance_sheet || false,
      completion_certificate: training.tracking_methods?.completion_certificate || false
    },
    pedagogical_methods: {
      needs_evaluation: training.pedagogical_methods?.needs_evaluation || false,
      theoretical_content: training.pedagogical_methods?.theoretical_content || false,
      practical_exercises: training.pedagogical_methods?.practical_exercises || false,
      case_studies: training.pedagogical_methods?.case_studies || false,
      experience_sharing: training.pedagogical_methods?.experience_sharing || false,
      digital_support: training.pedagogical_methods?.digital_support || false
    },
    material_elements: {
      computer_provided: training.material_elements?.computer_provided || false,
      pedagogical_material: training.material_elements?.pedagogical_material || false,
      digital_support_provided: training.material_elements?.digital_support_provided || false
    }
  });

  const mapParticipantToSharedInterface = (participant: any): Participant => ({
    id: participant.id,
    first_name: participant.first_name,
    last_name: participant.last_name,
    job_position: participant.job_position || undefined,
    company: participant.company_name || undefined
  });

  return (
    <>
      <button
        onClick={handleOpenCertificate}
        className={buttonClasses}
        disabled={participants.length === 0}
      >
        <Award className="h-4 w-4 mr-1.5" />
        {buttonText}
      </button>

      {/* Modal de sélection de participant ou affichage de l'attestation */}
      {showCertificate && !selectedParticipant && participants.length > 1 && (
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
                onClick={handleCloseCertificate}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Affichage de l'attestation pour le participant sélectionné */}
      {showCertificate && selectedParticipant && (
        <CompletionCertificate
          training={mapTrainingToSharedInterface(training)}
          participant={mapParticipantToSharedInterface(selectedParticipant)}
          viewContext="crm"
          onCancel={handleCloseCertificate}
        />
      )}
    </>
  );
}; 