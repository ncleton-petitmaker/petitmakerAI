import React, { useState } from 'react';
import { Award } from 'lucide-react';
import { CompletionCertificate } from './shared/CompletionCertificate';
import { Training, Participant } from './shared/DocumentUtils';
import { supabase } from '../lib/supabase';

interface StudentCompletionCertificateButtonProps {
  training: any;
  participant: any;
  buttonText?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

/**
 * Bouton pour afficher l'attestation de fin de formation dans l'interface apprenant
 * 
 * IMPORTANT: Ce composant utilise le composant unifié CompletionCertificate
 * pour garantir une cohérence parfaite entre les documents.
 */
export const StudentCompletionCertificateButton: React.FC<StudentCompletionCertificateButtonProps> = ({
  training,
  participant,
  buttonText = "Attestation de fin",
  className = "",
  variant = 'primary'
}) => {
  const [showCertificate, setShowCertificate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenCertificate = async () => {
    setIsLoading(true);
    try {
      console.log("Ouverture de l'attestation de fin de formation, données:", training);
      setShowCertificate(true);
    } catch (error) {
      console.error("Erreur lors de l'ouverture de l'attestation:", error);
      alert("Une erreur est survenue lors de l'ouverture de l'attestation. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseCertificate = () => {
    setShowCertificate(false);
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
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="animate-spin h-4 w-4 mr-1.5 border-t-2 border-b-2 border-white rounded-full"></div>
        ) : (
          <Award className="h-4 w-4 mr-1.5" />
        )}
        {buttonText}
      </button>

      {/* Affichage de l'attestation */}
      {showCertificate && (
        <CompletionCertificate
          training={mapTrainingToSharedInterface(training)}
          participant={mapParticipantToSharedInterface(participant)}
          viewContext="student"
          onCancel={handleCloseCertificate}
        />
      )}
    </>
  );
}; 