import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GenericTrainingAgreement } from './shared/GenericTrainingAgreement';
import { Training, Participant } from './shared/DocumentUtils';

interface StudentGenericTrainingAgreementButtonProps {
  trainingId: string;
  userId: string;
  buttonText?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
}

/**
 * Bouton permettant d'afficher la convention de formation pour l'apprenant
 * utilisant le nouveau système de gestion des signatures.
 * 
 * Cette version utilise le système unifié de gestion des documents pour assurer
 * une cohérence dans la gestion des signatures à travers toute l'application.
 * 
 * Modification: Maintenant, cette convention affiche tous les participants de la formation
 * dans une seule convention.
 */
export const StudentGenericTrainingAgreementButton: React.FC<StudentGenericTrainingAgreementButtonProps> = ({
  trainingId,
  userId,
  buttonText = 'Convention de formation',
  className = '',
  variant = 'default',
  onDocumentOpen,
  onDocumentClose
}) => {
  const [showAgreement, setShowAgreement] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [formattedTraining, setFormattedTraining] = useState<Training | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    if (showAgreement && !formattedTraining) {
      loadTrainingData();
    }
  }, [showAgreement, formattedTraining]);

  const loadTrainingData = async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      // Récupérer les données de la formation
      const { data: trainingData, error: trainingError } = await supabase
        .from('trainings')
        .select('*')
        .eq('id', trainingId)
        .single();

      if (trainingError) {
        console.error('Erreur lors de la récupération de la formation:', trainingError);
        setHasError(true);
        return;
      }

      // Récupérer les données du participant
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('id', userId)
        .single();

      if (participantError) {
        console.error('Erreur lors de la récupération du participant:', participantError);
        setHasError(true);
        return;
      }

      // Récupérer tous les participants de cette formation
      const { data: allParticipantsData, error: allParticipantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('training_id', trainingId);

      if (allParticipantsError) {
        console.error('Erreur lors de la récupération de tous les participants:', allParticipantsError);
        // On continue même s'il y a une erreur ici, car ce n'est pas bloquant
      }

      // Formater les objets
      const formattedParticipant: Participant = {
        id: participantData.id,
        first_name: participantData.first_name,
        last_name: participantData.last_name,
        email: participantData.email || '',
        job_position: participantData.job_position || '',
        status: participantData.status || '',
        company: participantData.company || participantData.company_name || ''
      };

      // Formater tous les participants
      const formattedAllParticipants: Participant[] = allParticipantsData 
        ? allParticipantsData.map(p => ({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            email: p.email || '',
            job_position: p.job_position || '',
            status: p.status || '',
            company: p.company || p.company_name || ''
          }))
        : [formattedParticipant]; // Au minimum, utiliser le participant actuel

      // Formater les données de formation
      // Analyser les méthodes pédagogiques si elles sont en JSON
      let pedagogicalMethods = trainingData.pedagogical_methods;
      let materialElements = trainingData.material_elements;

      if (typeof pedagogicalMethods === 'string') {
        try {
          pedagogicalMethods = JSON.parse(pedagogicalMethods);
        } catch (e) {
          console.error('Erreur lors du parsing des méthodes pédagogiques:', e);
          pedagogicalMethods = {};
        }
      }

      if (typeof materialElements === 'string') {
        try {
          materialElements = JSON.parse(materialElements);
        } catch (e) {
          console.error('Erreur lors du parsing des éléments matériels:', e);
          materialElements = {};
        }
      }

      const formattedTrainingObj: Training = {
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
        evaluation_methods: {
          profile_evaluation: trainingData.evaluation_methods?.profile_evaluation || false,
          skills_evaluation: trainingData.evaluation_methods?.skills_evaluation || false,
          knowledge_evaluation: trainingData.evaluation_methods?.knowledge_evaluation || false,
          satisfaction_survey: trainingData.evaluation_methods?.satisfaction_survey || false
        },
        tracking_methods: {
          attendance_sheet: trainingData.tracking_methods?.attendance_sheet || false,
          completion_certificate: trainingData.tracking_methods?.completion_certificate || false
        },
        pedagogical_methods: {
          needs_evaluation: pedagogicalMethods?.needs_evaluation || false,
          theoretical_content: pedagogicalMethods?.theoretical_content || false,
          practical_exercises: pedagogicalMethods?.practical_exercises || false,
          case_studies: pedagogicalMethods?.case_studies || false,
          experience_sharing: pedagogicalMethods?.experience_sharing || false,
          digital_support: pedagogicalMethods?.digital_support || false
        },
        material_elements: {
          computer_provided: materialElements?.computer_provided || false,
          pedagogical_material: materialElements?.pedagogical_material || false,
          digital_support_provided: materialElements?.digital_support_provided || false
        }
      };

      // Mettre à jour les états
      setFormattedTraining(formattedTrainingObj);
      setParticipant(formattedParticipant);
      setAllParticipants(formattedAllParticipants);

      console.log('✅ [DEBUG] StudentGenericTrainingAgreementButton - Données chargées:', {
        training: formattedTrainingObj,
        participant: formattedParticipant,
        allParticipants: formattedAllParticipants
      });
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDocument = () => {
    console.log('✅ [DEBUG] StudentGenericTrainingAgreementButton - Ouverture du document');
    
    // Réinitialiser les états pour éviter les problèmes de stale data
    setFormattedTraining(null);
    setParticipant(null);
    setAllParticipants([]);
    setIsLoading(true);
    setHasError(false);
    
    // Afficher d'abord le document, puis charger les données
    setShowAgreement(true);
    
    // Notifier l'ouverture du document
    if (onDocumentOpen) onDocumentOpen();
    
    // Charger les données après l'ouverture de la convention
    loadTrainingData().catch(error => {
      console.error('❌ [ERROR] Erreur lors du chargement des données:', error);
      setHasError(true);
      setIsLoading(false);
    });
  };

  const handleCloseDocument = () => {
    console.log('✅ [DEBUG] StudentGenericTrainingAgreementButton - Fermeture du document');
    
    // Masquer d'abord la convention
    setShowAgreement(false);
    
    // Réinitialiser progressivement tous les états
    setTimeout(() => {
      setFormattedTraining(null);
      setParticipant(null);
      setAllParticipants([]);
      setIsLoading(false);
      setHasError(false);
      
      console.log('✅ [DEBUG] StudentGenericTrainingAgreementButton - États réinitialisés après fermeture');
      
      // Notifier la fermeture du document
      if (onDocumentClose) onDocumentClose();
    }, 300);
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

      {showAgreement && formattedTraining && participant && allParticipants.length > 0 && (
        <GenericTrainingAgreement
          training={formattedTraining}
          participant={participant}
          participants={allParticipants}
          onCancel={handleCloseDocument}
          onDocumentOpen={onDocumentOpen}
          onDocumentClose={onDocumentClose}
          viewContext="student"
        />
      )}

      {showAgreement && hasError && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-red-600">Erreur</h3>
              <p className="mb-4">
                Une erreur est survenue lors du chargement de la convention de formation. 
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