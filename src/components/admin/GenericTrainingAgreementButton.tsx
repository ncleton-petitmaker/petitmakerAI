import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { GenericTrainingAgreement } from '../shared/GenericTrainingAgreement';
import { Training, Participant, OrganizationSettings } from '../shared/DocumentUtils';
import { supabase } from '../../lib/supabase';

interface GenericTrainingAgreementButtonProps {
  training: any;
  participants: any[];
  buttonText?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

/**
 * Bouton pour générer une convention de formation dans l'interface CRM utilisant le nouveau système
 * 
 * Cette version utilise le composant GenericTrainingAgreement pour assurer une cohérence
 * dans la gestion des signatures à travers toute l'application.
 */
export const GenericTrainingAgreementButton: React.FC<GenericTrainingAgreementButtonProps> = ({
  training,
  participants,
  buttonText = "Convention de formation",
  className = "",
  variant = 'primary'
}) => {
  const [showAgreement, setShowAgreement] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [formattedTraining, setFormattedTraining] = useState<Training | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  
  // Charger les données formatées lorsqu'un participant est sélectionné
  useEffect(() => {
    if (selectedParticipant) {
      loadParticipantData(selectedParticipant);
    }
  }, [selectedParticipant]);

  const loadParticipantData = async (participantData: any) => {
    setIsLoading(true);
    setHasError(false);

    try {
      // Mapper les données de formation au format attendu par le composant partagé
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

      // Mapper les données du participant au format attendu
      setParticipant({
        id: participantData.id,
        first_name: participantData.first_name,
        last_name: participantData.last_name,
        email: participantData.email || '',
        job_position: participantData.job_position || '',
        status: participantData.status || '',
        company: participantData.company || ''
      });

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour ouvrir la modal de sélection de participant
  const handleOpenAgreement = () => {
    if (participants.length === 1) {
      // S'il n'y a qu'un seul participant, ouvrir directement sa convention
      setSelectedParticipant(participants[0]);
      setShowAgreement(true);
    } else if (participants.length > 1) {
      // S'il y a plusieurs participants, ouvrir la modal de sélection
      setShowAgreement(true);
    } else {
      // S'il n'y a pas de participants
      alert("Aucun participant n'est inscrit à cette formation.");
    }
  };

  const handleCloseAgreement = () => {
    setShowAgreement(false);
    setSelectedParticipant(null);
    setFormattedTraining(null);
    setParticipant(null);
  };

  const handleSelectParticipant = (participantData: any) => {
    setSelectedParticipant(participantData);
  };

  // Classes du bouton selon la variante
  const getButtonClass = () => {
    if (className) return className;

    let baseClass = "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium ";
    
    switch (variant) {
      case 'primary':
        return baseClass + "bg-blue-600 text-white hover:bg-blue-700";
      case 'secondary':
        return baseClass + "bg-gray-100 text-gray-800 hover:bg-gray-200";
      case 'outline':
        return baseClass + "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50";
      default:
        return baseClass + "bg-blue-600 text-white hover:bg-blue-700";
    }
  };

  return (
    <>
      <button
        onClick={handleOpenAgreement}
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

      {showAgreement && !selectedParticipant && participants.length > 1 && (
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
                  onClick={handleCloseAgreement}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAgreement && selectedParticipant && formattedTraining && participant && (
        <GenericTrainingAgreement
          training={formattedTraining}
          participant={participant}
          onCancel={handleCloseAgreement}
          viewContext="crm"
        />
      )}
    </>
  );
}; 