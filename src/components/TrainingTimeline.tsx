import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Bot, 
  Code2, 
  Settings2, 
  Zap,
  Building2,
  Shield,
  Telescope,
  AlertCircle,
  Eye,
  CheckCircle2,
  Trophy,
  Star,
  FileText,
  Award
} from 'lucide-react';
import { PositioningQuestionnaire } from './PositioningQuestionnaire';
import { QuestionnaireReport } from './QuestionnaireReport';
import { SatisfactionQuestionnaire } from './SatisfactionQuestionnaire';
import { InternalRulesModal } from './InternalRulesModal';
import { StudentCompletionCertificateButton } from './StudentCompletionCertificateButton';
import { StudentAttendanceSheetButton } from './StudentAttendanceSheetButton';
import { StudentTrainingAgreementButton } from './StudentTrainingAgreementButton';
import { supabase } from '../lib/supabase';

interface TrainingTimelineProps {
  questionnaireCompleted?: boolean;
  training: any;
  refreshTrigger?: number;
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
}

interface TimelineItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  status: string;
  action?: string;
}

interface TimelineStage {
  id: string;
  title: string;
  icon: React.ElementType;
  items: TimelineItem[];
}

interface TimelinePhase {
  id: string;
  title: string;
  color: string;
  stages: TimelineStage[];
}

const getScoreDisplay = (score: number | null) => {
  if (score === null) return null;

  if (score >= 80) {
    return {
      icon: Star,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20'
    };
  } else if (score >= 50) {
    return {
      icon: Trophy,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20'
    };
  } else {
    return {
      icon: Star,
      color: 'text-gray-400',
      bgColor: 'bg-gray-800'
    };
  }
};

const phases = [
  {
    id: 'before',
    title: 'Avant la formation',
    color: 'from-blue-600 to-blue-400',
    stages: [
      {
        id: 'preparation',
        title: 'Préparation',
        icon: Brain,
        items: [
          {
            id: 'questionnaire',
            title: 'Questionnaire de positionnement',
            description: 'Évaluation de vos besoins et objectifs',
            icon: AlertCircle,
            status: 'pending',
            action: 'questionnaire'
          },
          {
            id: 'internal-rules',
            title: 'Règlement Intérieur',
            description: 'Consultez le règlement intérieur de la formation',
            icon: FileText,
            status: 'available',
            action: 'internal-rules'
          },
          {
            id: 'training-agreement',
            title: 'Convention de formation',
            description: 'Signez votre convention de formation',
            icon: FileText,
            status: 'available',
            action: 'training-agreement'
          }
        ]
      }
    ]
  },
  {
    id: 'during',
    title: 'Pendant la formation',
    color: 'from-green-600 to-green-400',
    stages: [
      {
        id: 'initial-evaluation',
        title: 'Évaluation initiale',
        icon: Bot,
        items: [
          {
            id: 'initial-questionnaire',
            title: 'Questionnaire d\'évaluation initiale',
            description: 'Évaluation des connaissances de départ',
            icon: AlertCircle,
            status: 'pending',
            action: 'initial-evaluation'
          }
        ]
      },
      {
        id: 'training',
        title: 'Formation',
        icon: Code2,
        items: [
          {
            id: 'modules',
            title: 'Modules théoriques',
            description: 'Apprentissage des concepts clés',
            icon: Settings2,
            status: 'pending'
          },
          {
            id: 'exercises',
            title: 'Exercices pratiques',
            description: 'Mise en application concrète',
            icon: Zap,
            status: 'pending'
          },
          {
            id: 'attendance-sheet',
            title: 'Feuille d\'émargement',
            description: 'Signez votre présence à la formation',
            icon: FileText,
            status: 'available',
            action: 'attendance-sheet'
          }
        ]
      }
    ]
  },
  {
    id: 'after',
    title: 'Après la formation',
    color: 'from-purple-600 to-purple-400',
    stages: [
      {
        id: 'final-evaluation',
        title: 'Évaluation finale',
        icon: Building2,
        items: [
          {
            id: 'final-questionnaire',
            title: 'Questionnaire d\'évaluation finale',
            description: 'Validation des acquis',
            icon: Shield,
            status: 'pending',
            action: 'final-evaluation'
          }
        ]
      },
      {
        id: 'certification',
        title: 'Certification',
        icon: Telescope,
        items: [
          {
            id: 'satisfaction',
            title: 'Questionnaire de satisfaction',
            description: 'Votre retour sur la formation',
            icon: AlertCircle,
            status: 'pending',
            action: 'satisfaction'
          },
          {
            id: 'completion-certificate',
            title: 'Attestation de fin de formation',
            description: 'Document officiel de validation',
            icon: Award,
            status: 'pending',
            action: 'completion-certificate'
          }
        ]
      }
    ]
  }
];

export const TrainingTimeline = ({ 
  questionnaireCompleted = false, 
  training = null, 
  refreshTrigger = 0, 
  onDocumentOpen, 
  onDocumentClose 
}: {
  questionnaireCompleted?: boolean;
  training?: any;
  refreshTrigger?: number;
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
}) => {
  const [evaluationStatus, setEvaluationStatus] = useState({
    initial: false,
    final: false,
    satisfaction: false
  });
  const [evaluationScores, setEvaluationScores] = useState({
    initial: null as number | null,
    final: null as number | null
  });
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<'initial' | 'final' | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showQuestionnaireReport, setShowQuestionnaireReport] = useState(false);
  const [showSatisfactionQuestionnaire, setShowSatisfactionQuestionnaire] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [showInternalRules, setShowInternalRules] = useState(false);
  const [progress, setProgress] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasSousTypeColumn, setHasSousTypeColumn] = useState<boolean | null>(null);
  const [attendanceSheetSigned, setAttendanceSheetSigned] = useState(false);
  const [trainingAgreementSigned, setTrainingAgreementSigned] = useState(false);
  const [completionCertificateSigned, setCompletionCertificateSigned] = useState(false);

  const fetchQuestionnaireStatus = async () => {
    try {
      console.log('Fetching questionnaire status in TrainingTimeline');
      
      // Get user data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const userId = user.id;
      
      // Check if user has completed positioning questionnaire
      const { data: positioningResponses, error: positioningError } = await supabase
        .from('questionnaire_responses')
        .select('id, score')
        .eq('user_id', userId)
        .eq('type', 'positioning');
      
      if (positioningError) {
        console.error('Error checking positioning questionnaire:', positioningError);
        return;
      }
      
      const hasPositioningResponses = positioningResponses && positioningResponses.length > 0;
      console.log('Positioning responses from database:', positioningResponses);
      
      if (hasPositioningResponses) {
        console.log('Found positioning questionnaire in database, marking as completed');
      }

      // Récupérer le score du questionnaire de positionnement si disponible
      const positioningScore = hasPositioningResponses ? positioningResponses[0].score : null;
      
      // Check initial evaluation
      const evalType = 'initial_final_evaluation';
      
      const { data: initialResponses, error: initialError } = await supabase
        .from('questionnaire_responses')
        .select('id, score, sous_type')
        .eq('user_id', userId)
        .eq('type', evalType);
      
      if (initialError) {
        console.error('Error checking initial evaluation:', initialError);
        return;
      }
      
      // Adapter la logique en fonction de la présence ou non de sous_type
      let hasInitialResponses, hasFinalResponses;
      let initialScore = null;
      let finalScore = null;
      
      if (hasSousTypeColumn) {
        // Si la colonne sous_type existe, filtrer par sous_type
        const initialEvals = initialResponses && initialResponses.filter(item => item.sous_type === 'initial');
        const finalEvals = initialResponses && initialResponses.filter(item => item.sous_type === 'final');
        
        hasInitialResponses = initialEvals && initialEvals.length > 0;
        hasFinalResponses = finalEvals && finalEvals.length > 0;
        
        // Récupérer les scores
        if (hasInitialResponses && initialEvals[0].score) {
          initialScore = initialEvals[0].score;
          console.log('Found initial evaluation score:', initialScore);
        }
        
        if (hasFinalResponses && finalEvals[0].score) {
          finalScore = finalEvals[0].score;
          console.log('Found final evaluation score:', finalScore);
        }
      } else {
        // Sinon, on ne peut pas distinguer initial de final
        // On suppose que s'il y a des données d'évaluation, les deux sont complétés
        hasInitialResponses = initialResponses && initialResponses.length > 0;
        hasFinalResponses = initialResponses && initialResponses.length > 1;
        
        // Récupérer les scores
        if (hasInitialResponses && initialResponses[0].score) {
          initialScore = initialResponses[0].score;
          console.log('Found initial evaluation score:', initialScore);
        }
        
        if (hasFinalResponses && initialResponses[1].score) {
          finalScore = initialResponses[1].score;
          console.log('Found final evaluation score:', finalScore);
        }
      }
      
      console.log('Initial evaluation responses from database:', initialResponses);
      if (hasInitialResponses) {
        console.log('Found initial evaluation in database, marking as completed');
      }
      
      console.log('Final evaluation responses from database:', initialResponses);
      if (hasFinalResponses) {
        console.log('Found final evaluation in database, marking as completed');
      }
      
      // Update user profile if needed
      if (hasPositioningResponses || hasInitialResponses || hasFinalResponses) {
        const profileUpdate: any = {};
        
        if (hasPositioningResponses) {
          profileUpdate.questionnaire_completed = true;
        }
        
        if (hasInitialResponses) {
          profileUpdate.initial_evaluation_completed = true;
        }
        
        if (hasFinalResponses) {
          profileUpdate.final_evaluation_completed = true;
        }
        
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .update(profileUpdate)
          .eq('id', userId)
          .select();
        
        if (profileError) {
          console.error('Error updating user profile:', profileError);
        } else {
          console.log('User profile updated:', profileData);
        }
      }
      
      // Fetch updated user profile data
      const { data: profileData, error: getProfileError } = await supabase
        .from('user_profiles')
        .select('questionnaire_completed, initial_evaluation_completed, final_evaluation_completed, satisfaction_completed')
        .eq('id', userId)
        .single();
      
      if (getProfileError) {
        console.error('Error fetching updated profile:', getProfileError);
        return;
      }
      
      console.log('Questionnaire status from profile:', profileData);
      
      // Update local state with fetched data
      setEvaluationStatus({
        initial: profileData?.initial_evaluation_completed || false,
        final: profileData?.final_evaluation_completed || false,
        satisfaction: profileData?.satisfaction_completed || false
      });
      
      // Mettre à jour les scores
      setEvaluationScores({
        initial: initialScore,
        final: finalScore
      });
      
    } catch (error) {
      console.error('Error in fetchQuestionnaireStatus:', error);
    }
  };

  useEffect(() => {
    fetchQuestionnaireStatus();
  }, [refreshTrigger]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log("Fetching user data for timeline...");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        console.log("User ID:", user.id);
        setUserId(user.id);
        
        // Log training data received from props
        console.log("Training data from props:", training);

        const { data: userProfileData, error: userProfileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        console.log("User profile data:", userProfileData);
        
        if (userProfileError) {
          console.error("Error fetching user profile data:", userProfileError);
        }
        
        if (userProfileData) {
          console.log("Setting signature states:", {
            attendanceSigned: userProfileData.has_signed_attendance,
            agreementSigned: userProfileData.has_signed_agreement
          });

          setAttendanceSheetSigned(
            userProfileData.has_signed_attendance !== undefined 
              ? userProfileData.has_signed_attendance 
              : false
          );
          setTrainingAgreementSigned(
            userProfileData.has_signed_agreement !== undefined 
              ? userProfileData.has_signed_agreement 
              : false
          );
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, [refreshTrigger, training]);

  useEffect(() => {
    return () => {
      if (onDocumentClose) {
        onDocumentClose();
      }
    };
  }, [onDocumentClose]);

  const calculateProgress = () => {
    let completed = 0;
    let total = 4;

    if (questionnaireCompleted) completed++;
    if (evaluationStatus.initial) completed++;
    if (evaluationStatus.final) completed++;
    if (evaluationStatus.satisfaction) completed++;

    return Math.round((completed / total) * 100);
  };

  const updatedPhases = phases.map(phase => ({
    ...phase,
    stages: phase.stages.map(stage => ({
      ...stage,
      items: stage.items.map(item => ({
        ...item,
        status: getItemStatus(item)
      }))
    }))
  }));

  function getItemStatus(item: any) {
    if (item.id === 'questionnaire' && questionnaireCompleted) {
      return 'completed';
    }
    if (item.id === 'initial-questionnaire' && evaluationStatus.initial) {
      return 'completed';
    }
    if (item.id === 'final-questionnaire' && evaluationStatus.final) {
      return 'completed';
    }
    if (item.id === 'satisfaction' && evaluationStatus.satisfaction) {
      return 'completed';
    }
    if (item.id === 'modules' || item.id === 'exercises') {
      return evaluationStatus.final ? 'completed' : 'pending';
    }
    if (item.id === 'attendance-sheet' && attendanceSheetSigned) {
      return 'completed';
    }
    if (item.id === 'training-agreement' && trainingAgreementSigned) {
      return 'completed';
    }
    return item.status;
  }

  const handleItemClick = (item: TimelineItem) => {
    console.log('🔍 [DEBUG] handleItemClick - START', item);
    
    if (!item.action) {
      console.log('🔍 [DEBUG] No action defined for item, returning');
      return;
    }
    
    if (item.action === 'questionnaire') {
      console.log('🔍 [DEBUG] Setting showQuestionnaire to true');
      setCurrentQuestionnaire(null);
      setReadOnly(questionnaireCompleted);
      setShowQuestionnaire(true);
      console.log('🔍 [DEBUG] Opening positioning questionnaire with:', { 
        readOnly: questionnaireCompleted, 
        currentQuestionnaire: null 
      });
    } else if (item.action === 'initial-evaluation') {
      console.log('🔍 [DEBUG] Setting up initial evaluation');
      setCurrentQuestionnaire('initial');
      setReadOnly(evaluationStatus.initial);
      setShowQuestionnaireReport(true);
      console.log('🔍 [DEBUG] Opening initial evaluation questionnaire with:', { 
        readOnly: evaluationStatus.initial, 
        currentQuestionnaire: 'initial' 
      });
    } else if (item.action === 'final-evaluation') {
      console.log('🔍 [DEBUG] Setting up final evaluation');
      setCurrentQuestionnaire('final');
      setReadOnly(evaluationStatus.final);
      setShowQuestionnaireReport(true);
      console.log('🔍 [DEBUG] Opening final evaluation questionnaire with:', { 
        readOnly: evaluationStatus.final, 
        currentQuestionnaire: 'final' 
      });
    } else if (item.action === 'satisfaction') {
      console.log('🔍 [DEBUG] Setting showSatisfactionQuestionnaire to true');
      setShowSatisfactionQuestionnaire(true);
    } else if (item.action === 'internal-rules') {
      console.log('🔍 [DEBUG] Setting showInternalRules to true');
      setShowInternalRules(true);
    } else if (item.action === 'completion-certificate' || item.action === 'attendance-sheet' || item.action === 'training-agreement') {
      console.log(`🔍 [DEBUG] Handling document click for ${item.action}`);
      if (onDocumentOpen) {
        console.log('🔍 [DEBUG] Calling onDocumentOpen from handleItemClick');
        onDocumentOpen();
      } else {
        console.log('🔍 [DEBUG] onDocumentOpen is not defined in handleItemClick');
      }
    }
    
    console.log('🔍 [DEBUG] handleItemClick - END');
  };

  const getNextStep = () => {
    if (!questionnaireCompleted) {
      return {
        text: "Remplir le questionnaire de positionnement",
        action: () => {
          setReadOnly(false);
          setShowQuestionnaire(true);
        }
      };
    }
    if (!evaluationStatus.initial) {
      return {
        text: "Passer l'évaluation initiale",
        action: () => {
          setReadOnly(false);
          setCurrentQuestionnaire('initial');
          setShowQuestionnaire(true);
        }
      };
    }
    if (!evaluationStatus.final) {
      return {
        text: "Passer l'évaluation finale",
        action: () => {
          setReadOnly(false);
          setCurrentQuestionnaire('final');
          setShowQuestionnaire(true);
        }
      };
    }
    if (!evaluationStatus.satisfaction) {
      return {
        text: "Remplir le questionnaire de satisfaction",
        action: () => {
          setShowSatisfactionQuestionnaire(true);
        }
      };
    }
    return null;
  };

  const nextStep = getNextStep();

  const renderDocumentButton = (item: TimelineItem) => {
    if (!training || !userId) {
      return (
        <button
          disabled
          className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-red-100 text-red-700"
        >
          {!training ? "Formation non assignée" : "Erreur de chargement"}
        </button>
      );
    }

    switch (item.action) {
      case 'completion-certificate':
        return (
          <StudentCompletionCertificateButton
            trainingId={training.id}
            userId={userId}
            buttonText="Voir et signer"
            variant="primary"
            onDocumentOpen={onDocumentOpen}
            onDocumentClose={onDocumentClose}
          />
        );
      case 'attendance-sheet':
        return (
          <StudentAttendanceSheetButton
            trainingId={training.id}
            userId={userId}
            buttonText="Voir et signer"
            variant="primary"
            onDocumentOpen={onDocumentOpen}
            onDocumentClose={onDocumentClose}
          />
        );
      case 'training-agreement':
        return (
          <StudentTrainingAgreementButton
            trainingId={training.id}
            userId={userId}
            buttonText="Voir et signer"
            variant="default"
            onDocumentOpen={onDocumentOpen}
            onDocumentClose={onDocumentClose}
          />
        );
      default:
        return null;
    }
  };

  // Move console.log statements outside JSX
  const debugRenderComponent = () => {
    console.log('🔍 [DEBUG] TrainingTimeline - Rendering component');
    console.log('🔍 [DEBUG] TrainingTimeline - Progress bar z-index: 10');
    console.log('🔍 [DEBUG] TrainingTimeline - Timeline container z-index: 0');
    console.log('🔍 [DEBUG] TrainingTimeline - Phase title z-index: 10');
    console.log('🔍 [DEBUG] TrainingTimeline - Modals container z-index: 30 (changed from 50)');
  };

  debugRenderComponent();

  useEffect(() => {
    const checkTableColumns = async () => {
      try {
        // Vérifier si la colonne sous_type existe en interrogeant un enregistrement
        const { data, error } = await supabase
          .from('questionnaire_responses')
          .select('*')
          .limit(1);
        
        if (error) {
          console.error('Erreur lors de la vérification de la structure de la table:', error);
          return false;
        }
        
        // Si nous avons des données, vérifier si sous_type existe dans le premier enregistrement
        if (data && data.length > 0) {
          const hasColSousType = 'sous_type' in data[0];
          console.log('🔍 [DEBUG] TrainingTimeline - Colonne sous_type existe:', hasColSousType);
          return hasColSousType;
        }
        
        // Si aucune donnée n'est retournée, nous ne pouvons pas vérifier
        console.log('🔍 [DEBUG] TrainingTimeline - Aucun enregistrement pour vérifier la structure de la table');
        return false;
      } catch (e) {
        console.error('Erreur lors de la vérification de la structure de la table:', e);
        return false;
      }
    };

    // Utiliser cette information pour adapter notre comportement
    checkTableColumns().then(hasCol => {
      console.log('🔍 [DEBUG] TrainingTimeline - Adaptation du comportement en fonction de la présence de sous_type:', hasCol);
      setHasSousTypeColumn(hasCol);
    });
  }, []);

  // Calculer la progression et mettre à jour l'état
  useEffect(() => {
    const calculatedProgress = calculateProgress();
    setProgress(calculatedProgress);
  }, [evaluationStatus, questionnaireCompleted]);

  return (
    <div className="relative">
      <div className="mb-8 sm:mb-12 bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-4">
          <h2 className="text-lg sm:text-xl font-bold">Progression de la formation</h2>
          <span className="text-xl sm:text-2xl font-bold text-blue-400">{progress}%</span>
        </div>
        
        <div className="relative">
          <div className="w-full h-3 sm:h-4 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {nextStep && (
            <button
              onClick={nextStep.action}
              className="w-full mt-4 p-3 sm:p-4 bg-green-900/30 border border-green-500/30 rounded-lg hover:bg-green-900/40 transition-colors text-left"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 shrink-0" />
                <p className="font-medium text-sm sm:text-base text-green-400">Prochaine étape</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm sm:text-base text-gray-300">{nextStep.text}</p>
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="relative before:content-[''] before:absolute before:left-4 sm:before:left-1/2 before:-translate-x-0 sm:before:-translate-x-1/2 before:top-0 before:bottom-0 before:w-[2px] before:bg-gray-800 before:z-0">
        {updatedPhases.map((phase, phaseIndex) => (
          <div key={phase.id} className="space-y-8 sm:space-y-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: phaseIndex * 0.3 }}
              className={`bg-gradient-to-br ${phase.color} p-3 sm:p-4 rounded-xl inline-block relative z-10 ml-8 sm:ml-0`}
            >
              <h2 className="text-lg sm:text-2xl font-bold text-white">{phase.title}</h2>
            </motion.div>

            {phase.stages.map((stage, stageIndex) => {
              const isEven = stageIndex % 2 === 0;
              const Icon = stage.icon;
              
              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, x: isEven ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: phaseIndex * 0.3 + stageIndex * 0.2 }}
                  className={`flex items-start gap-4 sm:gap-8 ${
                    isEven ? 'flex-row' : 'flex-row sm:flex-row-reverse'
                  } relative ml-8 sm:ml-0`}
                >
                  <div className={`w-full sm:w-1/2 ${isEven ? 'text-left sm:text-right' : 'text-left'}`}>
                    <div className={`inline-flex items-center gap-3 ${isEven ? 'sm:flex-row-reverse' : ''}`}>
                      <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${phase.color} relative z-10`}>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold relative z-10">{stage.title}</h3>
                    </div>
                    <div className={`mt-4 sm:mt-6 space-y-3 sm:space-y-4 ${isEven ? 'sm:ml-auto' : 'sm:mr-auto'} max-w-sm`}>
                      {stage.items.map((item, itemIndex) => {
                        const ItemIcon = item.icon;
                        const isQuestionnaire = item.action && (item.action.includes('questionnaire') || item.action.includes('evaluation') || item.action === 'satisfaction');
                        const isCompleted = item.status === 'completed';
                        const score = item.id === 'initial-questionnaire' ? evaluationScores.initial : item.id === 'final-questionnaire' ? evaluationScores.final : null;
                        const isCertificate = item.id === 'completion-certificate';
                        
                        return (
                          <motion.div
                            key={itemIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: phaseIndex * 0.3 + stageIndex * 0.2 + itemIndex * 0.1 }}
                            onClick={(item.action) ? () => handleItemClick(item) : undefined}
                            className={`
                              bg-gray-900 p-3 sm:p-4 rounded-xl border relative z-10
                              ${isQuestionnaire 
                                ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' 
                                : 'border-gray-800'
                              }
                              ${(item.action) ? 'cursor-pointer hover:bg-gray-800 transition-colors' : ''}
                            `}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-900/20' : 'bg-gray-800'}`}>
                                <ItemIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${isCompleted ? 'text-green-400' : 'text-gray-400'}`} />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-sm sm:text-base">{item.title}</h4>
                                <p className="text-xs sm:text-sm text-gray-400 mt-1">{item.description}</p>
                                
                                {(item.id === 'completion-certificate' || item.id === 'attendance-sheet' || item.id === 'training-agreement') && (
                                  <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                    {renderDocumentButton(item)}
                                  </div>
                                )}
                                
                                {score !== null && (
                                  <div className="mt-3 flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${getScoreDisplay(score)?.bgColor}`}>
                                      {React.createElement(getScoreDisplay(score)?.icon || Star, {
                                        className: `w-4 h-4 ${getScoreDisplay(score)?.color}`
                                      })}
                                    </div>
                                    <span className="text-sm font-medium">{score}%</span>
                                  </div>
                                )}
                              </div>
                              {isCompleted && (
                                <div className="p-1.5 rounded-full bg-green-900/20">
                                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div 
                    className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full absolute left-4 sm:left-1/2 transform -translate-x-1/2 z-20"
                  />
                  
                  <div className="hidden sm:block sm:w-1/2" />
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="relative z-30">
        {showQuestionnaire && (
          <PositioningQuestionnaire
            onClose={() => {
              console.log('🔍 [DEBUG] Closing questionnaire from TrainingTimeline');
              setShowQuestionnaire(false);
              if (onDocumentClose) onDocumentClose();
            }}
            readOnly={readOnly}
            type={currentQuestionnaire}
            onSubmitSuccess={() => {
              console.log('Questionnaire submitted successfully');
              setShowQuestionnaire(false);
              if (onDocumentClose) onDocumentClose();
              fetchQuestionnaireStatus();
            }}
          />
        )}
        
        {showQuestionnaireReport && (
          <PositioningQuestionnaire
            onClose={() => setShowQuestionnaireReport(false)}
            readOnly={readOnly}
            type={currentQuestionnaire}
            onSubmitSuccess={() => {
              setShowQuestionnaireReport(false);
              if (onDocumentClose) onDocumentClose();
              fetchQuestionnaireStatus();
            }}
          />
        )}
        
        {showSatisfactionQuestionnaire && (
          <SatisfactionQuestionnaire
            onClose={() => setShowSatisfactionQuestionnaire(false)}
            onSubmitSuccess={() => {
              setShowSatisfactionQuestionnaire(false);
              fetchQuestionnaireStatus();
            }}
          />
        )}
        
        {showInternalRules && (
          <InternalRulesModal onClose={() => setShowInternalRules(false)} />
        )}
      </div>
    </div>
  );
};