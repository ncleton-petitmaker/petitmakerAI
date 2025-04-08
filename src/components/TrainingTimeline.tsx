import React, { useEffect, useState, useRef } from 'react';
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
  Award,
  AlertTriangle
} from 'lucide-react';
import { PositioningQuestionnaire } from './PositioningQuestionnaire';
import { QuestionnaireReport } from './QuestionnaireReport';
import { SatisfactionQuestionnaire } from './SatisfactionQuestionnaire';
import { InternalRulesModal } from './InternalRulesModal';
import { StudentCompletionCertificateButton } from './StudentCompletionCertificateButton';
import { StudentGenericAttendanceSheetButton } from './StudentGenericAttendanceSheetButton';
import { StudentGenericTrainingAgreementButton } from './StudentGenericTrainingAgreementButton';
import { supabase } from '../lib/supabase';
import { Root } from 'react-dom/client';
import { AttendanceSheetPortal } from './AttendanceSheetPortal';
import ReactDOM from 'react-dom/client';
import { TrainingAgreementPortal } from './TrainingAgreementPortal';

// Map pour stocker les références aux roots React
const reactRoots = new Map<string, Root>();

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
  questionnaireCompleted: initialQuestionnaireCompleted = false,
  training,
  refreshTrigger,
  onDocumentOpen,
  onDocumentClose
}: TrainingTimelineProps) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [evaluationStatus, setEvaluationStatus] = useState({
    initial: false,
    final: false,
    satisfaction: false
  });
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(initialQuestionnaireCompleted);
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
  const [hasSousTypeColumn, setHasSousTypeColumn] = useState<boolean | null>(null);
  const [attendanceSheetSigned, setAttendanceSheetSigned] = useState(false);
  const [trainingAgreementSigned, setTrainingAgreementSigned] = useState(false);
  const [completionCertificateSigned, setCompletionCertificateSigned] = useState(false);
  const [satisfactionData, setSatisfactionData] = useState<any>(null);
  const [internalRulesAcknowledged, setInternalRulesAcknowledged] = useState(false);
  const [certificateDownloaded, setCertificateDownloaded] = useState(false);
  const [companyStatus, setCompanyStatus] = useState<'valid' | 'pending' | 'not_found'>('valid');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAttendanceSheetButtonCalled, setIsAttendanceSheetButtonCalled] = useState(false);
  const [isTrainingAgreementButtonCalled, setIsTrainingAgreementButtonCalled] = useState(false);
  const [questionnaireResponses, setQuestionnaireResponses] = useState<any>(null);

  const fetchQuestionnaireStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const currentUserId = user.id;

      // Récupérer d'abord les templates actifs pour cette formation
      const { data: templates, error: templatesError } = await supabase
        .from('questionnaire_templates')
        .select('id, type')
        .eq('training_id', training.id)
        .eq('is_active', true);

      if (templatesError) {
        console.error('Error fetching templates:', templatesError);
        return;
      }

      // Organiser les templates par type
      const templatesByType = templates?.reduce((acc: any, template) => {
        acc[template.type] = template.id;
        return acc;
      }, {});

      if (!templatesByType) {
        console.error('No templates found for training');
        return;
      }

      // Check positioning questionnaire
      const { data: positioningResponses, error: positioningError } = await supabase
        .from('questionnaire_responses')
        .select('id, score')
        .eq('user_id', currentUserId)
        .eq('type', 'positioning')
        .eq('template_id', templatesByType['positioning']);

      if (positioningError) {
        console.error('Error checking positioning questionnaire:', positioningError);
        return;
      }
      
      const hasPositioningResponses = positioningResponses && positioningResponses.length > 0;
      
      // Check evaluations (initial and final)
      const { data: evaluationResponses, error: evaluationError } = await supabase
        .from('questionnaire_responses')
        .select('id, score, sous_type')
        .eq('user_id', currentUserId)
        .eq('type', 'initial_final_evaluation')
        .eq('template_id', templatesByType['initial_final_evaluation']);

      if (evaluationError) {
        console.error('Error checking evaluations:', evaluationError);
        return;
      }

      // Vérifier les évaluations initiales et finales
      const hasInitialEval = evaluationResponses?.some(r => r.sous_type === 'initial') || false;
      const hasFinalEval = evaluationResponses?.some(r => r.sous_type === 'final') || false;

      // Check satisfaction questionnaire
      const { data: satisfactionResponses, error: satisfactionError } = await supabase
        .from('questionnaire_responses')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('type', 'satisfaction')
        .eq('template_id', templatesByType['satisfaction']);

      if (satisfactionError) {
        console.error('Error checking satisfaction questionnaire:', satisfactionError);
        return;
      }

      const hasSatisfactionResponses = satisfactionResponses && satisfactionResponses.length > 0;

      // Mettre à jour les états locaux
      setQuestionnaireCompleted(hasPositioningResponses);
      setEvaluationStatus({
        initial: hasInitialEval,
        final: hasFinalEval,
        satisfaction: hasSatisfactionResponses
      });

      // Mettre à jour le profil utilisateur si nécessaire
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('questionnaire_completed, initial_evaluation_completed, final_evaluation_completed, satisfaction_completed')
        .eq('id', currentUserId)
        .single();

      if (profile && (
        profile.questionnaire_completed !== hasPositioningResponses ||
        profile.initial_evaluation_completed !== hasInitialEval ||
        profile.final_evaluation_completed !== hasFinalEval ||
        profile.satisfaction_completed !== hasSatisfactionResponses
      )) {
        await supabase
          .from('user_profiles')
          .update({
            questionnaire_completed: hasPositioningResponses,
            initial_evaluation_completed: hasInitialEval,
            final_evaluation_completed: hasFinalEval,
            satisfaction_completed: hasSatisfactionResponses
          })
          .eq('id', currentUserId);
      }
    } catch (error) {
      console.error('Error in fetchQuestionnaireStatus:', error);
    }
  };

  useEffect(() => {
    fetchQuestionnaireStatus();
  }, [refreshTrigger]);

    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        setUserId(user.id);

        const { data: userProfileData, error: userProfileError } = await supabase
          .from('user_profiles')
          .select('*, has_signed_certificate, internal_rules_acknowledged')
          .eq('id', user.id)
          .single();
        
        if (userProfileError) {
          console.error("Error fetching user profile data:", userProfileError);
        }
        
        if (userProfileData) {
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
          setCompletionCertificateSigned(
            userProfileData.has_signed_certificate !== undefined 
              ? userProfileData.has_signed_certificate 
              : false
          );
          setInternalRulesAcknowledged(
            userProfileData.internal_rules_acknowledged !== undefined 
              ? userProfileData.internal_rules_acknowledged 
              : false
          );
          
          // Set user profile
          setUserProfile(userProfileData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

  useEffect(() => {
    return () => {
      // Nous ne devrions pas appeler onDocumentClose lors du démontage normal
      // car cela provoque une boucle infinie avec le refresh trigger
      // onDocumentClose sera appelé explicitement lorsque nécessaire
    };
  }, []);

  const calculateProgress = () => {
    let completed = 0;
    let total = 8; // Augmentation du nombre total d'étapes (4 existantes + 4 nouvelles)

    // Étapes existantes
    if (questionnaireCompleted) completed++;
    if (evaluationStatus.initial) completed++;
    if (evaluationStatus.final) completed++;
    if (evaluationStatus.satisfaction) completed++;
    
    // Nouvelles étapes
    if (internalRulesAcknowledged) completed++;
    if (trainingAgreementSigned) completed++;
    if (attendanceSheetSigned) completed++;
    if (certificateDownloaded) completed++;

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
    if (item.id === 'internal-rules' && internalRulesAcknowledged) {
      return 'completed';
    }
    if (item.id === 'training-agreement' && trainingAgreementSigned) {
      return 'completed';
    }
    if (item.id === 'attendance-sheet' && attendanceSheetSigned) {
      return 'completed';
    }
    if (item.id === 'completion-certificate' && certificateDownloaded) {
      return 'completed';
    }
    return item.status || 'pending';
  }

  const fetchQuestionnaireResponses = async (userId: string, type: string, templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('questionnaire_responses')
        .select('*')
        .eq('user_id', userId)
        .eq('type', type)
        .eq('template_id', templateId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching questionnaire responses:', error);
      return null;
    }
  };

  const handleItemClick = async (item: TimelineItem) => {
    console.log('🔍 [DEBUG] handleItemClick - START');
    
    if (item.action === 'questionnaire') {
      console.log('🔍 [DEBUG] Setting up positioning questionnaire');
      setCurrentQuestionnaire(null);
      setReadOnly(questionnaireCompleted);

      if (questionnaireCompleted) {
        // Récupérer d'abord les templates actifs pour cette formation
        const { data: templates } = await supabase
          .from('questionnaire_templates')
          .select('id, type')
          .eq('training_id', training.id)
          .eq('is_active', true)
          .eq('type', 'positioning');

        if (templates && templates.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const responses = await fetchQuestionnaireResponses(user.id, 'positioning', templates[0].id);
            setQuestionnaireResponses(responses);
          }
        }

        setShowQuestionnaireReport(true);
        setShowQuestionnaire(false);
      } else {
        setShowQuestionnaireReport(false);
        setShowQuestionnaire(true);
      }

      console.log('🔍 [DEBUG] Opening positioning questionnaire with:', { 
        readOnly: questionnaireCompleted, 
        currentQuestionnaire: null,
        showQuestionnaireReport: questionnaireCompleted,
        showQuestionnaire: !questionnaireCompleted
      });
    } else if (item.action === 'initial-evaluation') {
      console.log('🔍 [DEBUG] Setting up initial evaluation');
      setCurrentQuestionnaire('initial');
      setReadOnly(evaluationStatus.initial);
      setShowQuestionnaireReport(true);
      setShowQuestionnaire(false);
      console.log('🔍 [DEBUG] Opening initial evaluation questionnaire with:', { 
        readOnly: evaluationStatus.initial, 
        currentQuestionnaire: 'initial' 
      });
    } else if (item.action === 'final-evaluation') {
      console.log('🔍 [DEBUG] Setting up final evaluation');
      setCurrentQuestionnaire('final');
      setReadOnly(evaluationStatus.final);
      setShowQuestionnaireReport(true);
      setShowQuestionnaire(false);
      console.log('🔍 [DEBUG] Opening final evaluation questionnaire with:', { 
        readOnly: evaluationStatus.final, 
        currentQuestionnaire: 'final' 
      });
    } else if (item.action === 'satisfaction') {
      console.log('🔍 [DEBUG] Setting showSatisfactionQuestionnaire to true');
      const isSatisfactionCompleted = evaluationStatus.satisfaction;
      setReadOnly(isSatisfactionCompleted);
      setShowSatisfactionQuestionnaire(true);
      
      if (isSatisfactionCompleted && !satisfactionData) {
        fetchSatisfactionData();
      }
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
      
      setTimeout(() => {
        console.log('🔍 [DEBUG] Forcing data refresh after document action');
        fetchQuestionnaireStatus();
        fetchUserData();
      }, 1000);
    }
    
    console.log('🔍 [DEBUG] handleItemClick - END');
  };

  const getNextStep = () => {
    // Questionnaire de positionnement (première étape)
    if (!questionnaireCompleted) {
      return {
        text: "Remplir le questionnaire de positionnement",
        action: () => {
          setReadOnly(false);
          setShowQuestionnaire(true);
        }
      };
    }
    
    // Règlement intérieur (deuxième étape)
    if (!internalRulesAcknowledged) {
      return {
        text: "Consulter et valider le règlement intérieur",
        action: () => {
          setShowInternalRules(true);
        }
      };
    }
    
    // Convention de formation (troisième étape)
    if (!trainingAgreementSigned) {
      return {
        text: "Signer la convention de formation",
        action: () => {
          // L'action est déjà gérée par le bouton dans la timeline
          const item = updatedPhases
            .flatMap(phase => phase.stages)
            .flatMap(stage => stage.items)
            .find(item => item.id === 'training-agreement');
          
          if (item) {
            handleItemClick(item);
          }
        }
      };
    }
    
    // Évaluation initiale (quatrième étape)
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
    
    // Feuille d'émargement (cinquième étape)
    if (!attendanceSheetSigned) {
      return {
        text: "Signer la feuille d'émargement",
        action: () => {
          // L'action est déjà gérée par le bouton dans la timeline
          const item = updatedPhases
            .flatMap(phase => phase.stages)
            .flatMap(stage => stage.items)
            .find(item => item.id === 'attendance-sheet');
          
          if (item) {
            handleItemClick(item);
          }
        }
      };
    }
    
    // Évaluation finale (sixième étape)
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
    
    // Questionnaire de satisfaction (septième étape)
    if (!evaluationStatus.satisfaction) {
      return {
        text: "Remplir le questionnaire de satisfaction",
        action: () => {
          setShowSatisfactionQuestionnaire(true);
        }
      };
    }
    
    // Attestation de fin de formation (huitième et dernière étape)
    if (!certificateDownloaded) {
      return {
        text: "Télécharger l'attestation de fin de formation",
        action: () => {
          // L'action est déjà gérée par le bouton dans la timeline
          const item = updatedPhases
            .flatMap(phase => phase.stages)
            .flatMap(stage => stage.items)
            .find(item => item.id === 'completion-certificate');
          
          if (item) {
            handleItemClick(item);
          }
        }
      };
    }
    
    // Si toutes les étapes sont complétées
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
          <AlertTriangle className="mr-2 h-4 w-4" />
          Non disponible
        </button>
      );
    }

    if (item.status === 'pending') {
      return (
        <button
          disabled
          className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-yellow-100 text-yellow-700"
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          En attente
        </button>
      );
    }

    // Si l'entreprise n'est pas validée, désactiver les boutons de document
    if (companyStatus !== 'valid') {
      return (
        <button
          disabled
          className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-gray-700 text-gray-400 cursor-not-allowed"
        >
          <FileText className="h-4 w-4 mr-1.5" />
          Temporairement indisponible
        </button>
      );
    }

    // Fonction pour gérer le clic sur le lien
    const handleLinkClick = (e: React.MouseEvent, documentType: string) => {
      console.log('🔍 [DEBUG] Link clicked for document type:', documentType);
      
      // Empêcher la navigation par défaut
      e.preventDefault();
      e.stopPropagation();
      
      // Empêcher la propagation à tous les niveaux
      if (e.nativeEvent) {
        e.nativeEvent.stopImmediatePropagation();
        e.nativeEvent.preventDefault();
      }
      
      // Informer le parent que le document a été ouvert
      if (onDocumentOpen) {
        console.log('🔍 [DEBUG] Calling onDocumentOpen from link click');
        onDocumentOpen();
      }
      
      // Ouvrir le document approprié
      switch (documentType) {
        case 'completion-certificate':
          console.log('🔍 [DEBUG] Opening completion certificate');
          // Rechercher d'abord si une URL de document signé existe déjà
          supabase
            .from('user_profiles')
            .select('has_signed_certificate, certificate_signature_url')
            .eq('id', userId)
            .single()
            .then(({ data }) => {
              if (data && data.has_signed_certificate) {
                // Vérifier si l'URL est celle d'une signature ou d'un document PDF
                if (data.certificate_signature_url) {
                  // Vérifier si l'URL est pour une signature ou un document PDF
                  if (data.certificate_signature_url.includes('signatures')) {
                    console.log('🔍 [DEBUG] URL is for signature, need to fetch actual PDF document');
                    
                    // Rechercher le document PDF dans la table documents
                    supabase
                      .from('documents')
                      .select('file_url')
                      .eq('user_id', userId)
                      .eq('training_id', training.id)
                      .eq('type', 'certificate')
                      .single()
                      .then(({ data: docData, error }) => {
                        if (error) {
                          console.error('🔍 [DEBUG] Error fetching document URL:', error);
                          // Fallback à l'affichage du composant
                          showCompletionCertificate();
                        } else if (docData && docData.file_url) {
                          console.log('🔍 [DEBUG] Found document URL:', docData.file_url);
                          showSignedDocument(docData.file_url, "Attestation de fin de formation");
                        } else {
                          console.log('🔍 [DEBUG] No document found, showing component');
                          showCompletionCertificate();
                        }
                      });
                  } else {
                    // C'est déjà un document PDF
                    console.log('🔍 [DEBUG] URL appears to be a PDF document, displaying it directly');
                    showSignedDocument(data.certificate_signature_url, "Attestation de fin de formation");
                  }
                } else {
                  console.log('🔍 [DEBUG] No URL found, opening certificate for signing');
                  showCompletionCertificate();
                }
              } else {
                // Si pas signé, ouvrir le composant pour signature
                console.log('🔍 [DEBUG] Certificate not signed, opening for signing');
                showCompletionCertificate();
              }
            });
          break;
        case 'attendance-sheet':
          console.log('🔍 [DEBUG] Opening attendance sheet');
          // Rechercher d'abord si une URL de document signé existe déjà
          supabase
            .from('user_profiles')
            .select('has_signed_attendance, attendance_signature_url')
            .eq('id', userId)
            .single()
            .then(({ data }) => {
              if (data && data.has_signed_attendance) {
                // Vérifier si l'URL est celle d'une signature ou d'un document PDF
                if (data.attendance_signature_url) {
                  // Vérifier si l'URL est pour une signature ou un document PDF
                  if (data.attendance_signature_url.includes('signatures')) {
                    console.log('🔍 [DEBUG] URL is for signature, need to fetch actual PDF document');
                    
                    // Rechercher le document PDF dans la table documents
                    supabase
                      .from('documents')
                      .select('file_url')
                      .eq('user_id', userId)
                      .eq('training_id', training.id)
                      .eq('type', 'attestation')
                      .single()
                      .then(({ data: docData, error }) => {
                        if (error) {
                          console.error('🔍 [DEBUG] Error fetching document URL:', error);
                          // Fallback à l'affichage du composant
                          showAttendanceSheet(training);
                        } else if (docData && docData.file_url) {
                          console.log('🔍 [DEBUG] Found document URL:', docData.file_url);
                          showSignedDocument(docData.file_url, "Feuille d'émargement");
                        } else {
                          console.log('🔍 [DEBUG] No document found, showing component');
                          showAttendanceSheet(training);
                        }
                      });
                  } else {
                    // C'est déjà un document PDF
                    console.log('🔍 [DEBUG] URL appears to be a PDF document, displaying it directly');
                    showSignedDocument(data.attendance_signature_url, "Feuille d'émargement");
                  }
                } else {
                  console.log('🔍 [DEBUG] No URL found, opening attendance sheet for signing');
                  showAttendanceSheet(training);
                }
              } else {
                // Si pas signé, ouvrir le composant pour signature
                console.log('🔍 [DEBUG] Attendance sheet not signed, opening for signing');
                showAttendanceSheet(training);
              }
            });
          break;
        case 'training-agreement':
          console.log('🔍 [DEBUG] Opening training agreement');
          
          // Rechercher d'abord si une URL de document signé existe déjà
          supabase
            .from('user_profiles')
            .select('has_signed_agreement, agreement_signature_url')
            .eq('id', userId)
            .single()
            .then(({ data }) => {
              if (data && data.has_signed_agreement) {
                if (data.agreement_signature_url) {
                  // Vérifier si l'URL est celle d'une signature ou d'un document PDF
                  if (data.agreement_signature_url.includes('signatures')) {
                    console.log('🔍 [DEBUG] URL is for signature, need to fetch actual PDF document');
                    
                    // Rechercher le document PDF dans la table documents
                    supabase
                      .from('documents')
                      .select('file_url')
                      .eq('user_id', userId)
                      .eq('training_id', training.id)
                      .eq('type', 'convention')
                      .single()
                      .then(({ data: docData, error }) => {
                        if (error) {
                          console.error('🔍 [DEBUG] Error fetching document URL:', error);
                          
                          // Essayer de récupérer depuis le localStorage en fallback
                          const localStorageKey = `document_${training.id}_${userId}_convention`;
                          const storedUrl = localStorage.getItem(localStorageKey);
                          
                          if (storedUrl) {
                            console.log('🔍 [DEBUG] Using document URL from localStorage:', storedUrl);
                            showSignedDocument(storedUrl, "Convention de formation professionnelle");
                          } else {
                            console.log('🔍 [DEBUG] No document found, falling back to signature URL');
                            // If we can't find the document, try to regenerate it
                            console.log('🔍 [DEBUG] Attempting to regenerate the document');
                            showTrainingAgreement();
                          }
                        } else if (docData && docData.file_url) {
                          console.log('🔍 [DEBUG] Found document URL:', docData.file_url);
                          showSignedDocument(docData.file_url, "Convention de formation professionnelle");
                        } else {
                          console.log('🔍 [DEBUG] No document found, falling back to signature URL');
                          // If we can't find the document, try to regenerate it
                          console.log('🔍 [DEBUG] Attempting to regenerate the document');
                          showTrainingAgreement();
                        }
                      });
                  } else {
                    // C'est déjà un document PDF
                    console.log('🔍 [DEBUG] URL appears to be a PDF document, displaying it directly');
                    showSignedDocument(data.agreement_signature_url, "Convention de formation professionnelle");
                  }
                } else {
                  console.log('🔍 [DEBUG] No URL found, opening agreement for signing');
                  showTrainingAgreement();
                }
              } else {
                // Si pas signé, ouvrir le composant StudentGenericTrainingAgreementButton pour signature
                console.log('🔍 [DEBUG] Agreement not signed, opening for signing');
                showTrainingAgreement();
              }
            });
          break;
        default:
          console.log('🔍 [DEBUG] Unknown document type:', documentType);
      }
    };

    const isQuestionnaireItem = isQuestionnaire(item);
    const isDocumentItem = isDocument(item);
    const isDisabled = (isQuestionnaireItem || isDocumentItem) && companyStatus !== 'valid';

    switch (item.action) {
      case 'completion-certificate':
        return (
          <a
            href="#"
            className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              completionCertificateSigned 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            onClick={(e) => handleLinkClick(e, 'completion-certificate')}
            data-document-type="completion-certificate"
            data-training-id={training.id}
            data-user-id={userId}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            {completionCertificateSigned ? "Voir" : "Voir et signer"}
          </a>
        );
      case 'attendance-sheet':
        return (
          <a
            href="#"
            className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              attendanceSheetSigned 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            onClick={(e) => handleLinkClick(e, 'attendance-sheet')}
            data-document-type="attendance-sheet"
            data-training-id={training.id}
            data-user-id={userId}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            {attendanceSheetSigned ? "Voir" : "Voir et signer"}
          </a>
        );
      case 'training-agreement':
        return (
          <a
            href="#"
            className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              trainingAgreementSigned
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
            onClick={(e) => {
              e.preventDefault();
              showTrainingAgreement();
            }}
          >
            {trainingAgreementSigned ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Signé
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Voir le document
              </>
            )}
          </a>
        );
      default:
        return null;
    }
  };

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
          return hasColSousType;
        }
        
        // Si aucune donnée n'est retournée, nous ne pouvons pas vérifier
        return false;
      } catch (e) {
        console.error('Erreur lors de la vérification de la structure de la table:', e);
        return false;
      }
    };

    // Utiliser cette information pour adapter notre comportement
    checkTableColumns().then(hasCol => {
      setHasSousTypeColumn(hasCol);
    });
  }, []);

  // Calculer la progression et mettre à jour l'état
  useEffect(() => {
    const calculatedProgress = calculateProgress();
    setProgress(calculatedProgress);
  }, [
    evaluationStatus, 
    questionnaireCompleted, 
    internalRulesAcknowledged, 
    trainingAgreementSigned, 
    attendanceSheetSigned, 
    certificateDownloaded
  ]);

  // Fonction pour récupérer les données du questionnaire de satisfaction
  const fetchSatisfactionData = async () => {
    try {
      console.log('Fetching satisfaction questionnaire data');
      
      // Récupérer l'ID de l'utilisateur
      let userIdToUse = userId;
      
      if (!userIdToUse) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error("No user found");
          return;
        }
        userIdToUse = user.id;
        setUserId(userIdToUse);
      }
      
      // Récupérer les réponses du questionnaire de satisfaction
      const { data: responsesData, error: responsesError } = await supabase
        .from('satisfaction_responses')
        .select('*')
        .eq('user_id', userIdToUse);
        
      if (responsesError) {
        console.error("Error fetching satisfaction responses:", responsesError);
        return;
      }
      
      console.log("Satisfaction responses data:", responsesData);
      
      if (responsesData && responsesData.length > 0) {
        setSatisfactionData(responsesData[0]);
        setShowSatisfactionQuestionnaire(true);
      } else {
        // Si aucune donnée n'est trouvée, afficher quand même le questionnaire
        setShowSatisfactionQuestionnaire(true);
      }
    } catch (error) {
      console.error('Error fetching satisfaction data:', error);
      // Afficher quand même le questionnaire en cas d'erreur
      setShowSatisfactionQuestionnaire(true);
    }
  };

  // Nouvelle fonction pour vérifier le statut de l'entreprise
  const fetchCompanyStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCompanyStatus('not_found');
        return;
      }

      // Récupérer les données du profil utilisateur avec l'id de l'entreprise
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('status, company_id, company')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        setCompanyStatus('not_found');
        return;
      }

      // Vérifier si le statut de l'utilisateur est explicitement en attente
      if (profileData.status === 'pending_company_validation') {
        setCompanyStatus('pending');
        return;
      }

      // Si l'utilisateur a un company_id
      if (profileData.company_id) {
        // Faire une requête séparée pour obtenir les données de l'entreprise
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id, name, status')
          .eq('id', profileData.company_id)
          .single();
        
        if (companyError) {
          console.error('Error fetching company data:', companyError);
          setCompanyStatus('not_found');
          return;
        }
        
        // Vérifier si l'entreprise a un statut non valide
        if (companyData && companyData.status === 'pending') {
          setCompanyStatus('pending');
          return;
        }

        // Vérifier si l'entreprise a des formations associées
        const { data: trainings, error: trainingsError } = await supabase
          .from('trainings')
          .select('id')
          .eq('company_id', profileData.company_id)
          .limit(1);

        if (trainingsError) {
          console.error('Error checking company trainings:', trainingsError);
          setCompanyStatus('not_found');
          return;
        }
        
        if (trainings && trainings.length > 0) {
          setCompanyStatus('valid');
        } else {
          setCompanyStatus('pending');
        }
      } else {
        setCompanyStatus('not_found');
      }
    } catch (error) {
      console.error('Error in fetchCompanyStatus:', error);
      setCompanyStatus('not_found');
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchCompanyStatus();
  }, [refreshTrigger]);

  // Modification pour pouvoir cliquer directement sur les documents
  const handleDocumentClick = (item: TimelineItem) => {
    // Informer le parent que le document a été ouvert
    if (onDocumentOpen) {
      onDocumentOpen();
    }
    
    // Vérifier le type de document et appeler la fonction appropriée
    if (item.action === 'training-agreement') {
      showTrainingAgreement();
    } else if (item.action === 'attendance-sheet') {
      showAttendanceSheet(training);
    } else if (item.action === 'completion-certificate') {
      showCompletionCertificate();
    } else if (item.action === 'internal-rules') {
      setShowInternalRules(true);
    } else if (item.action && (
      item.action.includes('questionnaire') || 
      item.action.includes('evaluation') || 
      item.action === 'satisfaction'
    )) {
      // Gérer les différents types de questionnaires
      if (item.action === 'questionnaire') {
        setCurrentQuestionnaire(null);
        setReadOnly(questionnaireCompleted);
        setShowQuestionnaire(true);
      } else if (item.action === 'initial-evaluation') {
        setCurrentQuestionnaire('initial');
        setReadOnly(evaluationStatus.initial);
        setShowQuestionnaireReport(true);
      } else if (item.action === 'final-evaluation') {
        setCurrentQuestionnaire('final');
        setReadOnly(evaluationStatus.final);
        setShowQuestionnaireReport(true);
      } else if (item.action === 'satisfaction') {
        const isSatisfactionCompleted = evaluationStatus.satisfaction;
        setReadOnly(isSatisfactionCompleted);
        
        if (isSatisfactionCompleted && !satisfactionData) {
          fetchSatisfactionData();
        }
      }
    } else {
      // Si c'est un autre type de document, afficher un message
      alert(`Fonctionnalité non implémentée: ${item.action}`);
    }
  };

  // Fonction pour afficher le document signé
  const showSignedDocument = (documentUrl: string, title: string) => {
    console.log('🔍 [DEBUG] Showing signed document:', documentUrl);
    
    // Ensure the URL is properly encoded
    let encodedUrl = documentUrl;
    try {
      // Check if the URL is already encoded
      const decodedUrl = decodeURIComponent(documentUrl);
      if (decodedUrl === documentUrl) {
        // URL is not encoded, encode it
        const urlObj = new URL(documentUrl);
        // Only encode the pathname part
        urlObj.pathname = urlObj.pathname.split('/').map(segment => 
          segment.includes('.') ? 
            // Don't encode the file extension
            segment.split('.').map((part, i) => 
              i === segment.split('.').length - 1 ? part : encodeURIComponent(part)
            ).join('.') : 
            encodeURIComponent(segment)
        ).join('/');
        encodedUrl = urlObj.toString();
      }
    } catch (e) {
      console.error('🔍 [DEBUG] Error encoding URL:', e);
      // If there's an error, use the original URL
      encodedUrl = documentUrl;
    }
    
    console.log('🔍 [DEBUG] Encoded document URL:', encodedUrl);
    
    // Créer ou réutiliser le conteneur modal
    const modalContainer = document.getElementById('signed-document-modal') || 
      (() => {
        const el = document.createElement('div');
        el.id = 'signed-document-modal';
        document.body.appendChild(el);
        return el;
      })();
    
    // Créer le contenu de la modal avec un affichage standard
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-[9999] overflow-hidden bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div class="relative bg-white rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b bg-gray-50">
            <h3 class="text-xl font-semibold">${title}</h3>
            <button 
              id="close-modal-button"
              class="inline-flex items-center p-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-hidden p-0 bg-gray-100">
            <iframe 
              src="${encodedUrl}" 
              class="w-full h-full border-0" 
              title="${title}"
            ></iframe>
          </div>
        </div>
      </div>
    `;
    
    // Ajouter un événement de fermeture
    const closeButton = document.getElementById('close-modal-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        modalContainer.innerHTML = '';
        if (onDocumentClose) {
          onDocumentClose();
        }
      });
    }
  };

  // Fonction pour afficher la feuille d'émargement
  const showAttendanceSheet = (training: any) => {
    console.log("Showing attendance sheet for training", training);

    if (!training?.id || !userId) {
      return;
    }

    // Définir isAttendanceSheetButtonCalled pour éviter les appels multiples
    setIsAttendanceSheetButtonCalled(true);

    // Créer un élément temporaire pour le bouton de feuille d'émargement
    const portalElement = document.createElement('div');
    portalElement.id = 'attendance-sheet-button-portal';
    document.body.appendChild(portalElement);

    // Créer un portail React
    const root = ReactDOM.createRoot(portalElement);
    
    // Fonction pour nettoyer
    const cleanup = () => {
      root.unmount();
      document.body.removeChild(portalElement);
      setIsAttendanceSheetButtonCalled(false);
      
      if (onDocumentClose) {
        onDocumentClose();
      }
    };

    // Rendu du composant dans le portail
    root.render(
      <AttendanceSheetPortal
        training={training}
        userId={userId}
        onCancel={cleanup}
        onDocumentOpen={onDocumentOpen}
        onDocumentClose={onDocumentClose}
      />
    );
  };

  // Fonction pour afficher l'attestation de fin de formation
  const showCompletionCertificate = () => {
    console.log('🔍 [DEBUG] Showing completion certificate for signature');
    
    // Créer un élément temporaire pour le portail
    const portalContainer = document.getElementById('completion-certificate-portal') || 
      (() => {
        const el = document.createElement('div');
        el.id = 'completion-certificate-portal';
        document.body.appendChild(el);
        return el;
      })();
    
    // Vérifier que training.id et userId ne sont pas null
    if (!training || !training.id || !userId) {
      console.error('🔍 [DEBUG] Missing required data for completion certificate', { 
        trainingId: training?.id, 
        userId 
      });
      return;
    }
    
    // Informer le parent que le document a été ouvert
    if (onDocumentOpen) {
      console.log('🔍 [DEBUG] Calling onDocumentOpen for completion certificate');
      onDocumentOpen();
    }
    
    // Rendre le composant CompletionCertificate directement dans le portail
    import('react-dom').then(({ createPortal }) => {
      import('react').then(({ createElement }) => {
        import('./shared/CompletionCertificate').then(({ CompletionCertificate }) => {
          const portalRoot = document.getElementById('completion-certificate-portal');
          if (portalRoot) {
            const trainingData = {
              id: training.id,
              title: training.title || '',
              duration: training.duration || '',
              trainer_name: training.trainer_name || '',
              location: training.location || '',
              start_date: training.start_date,
              end_date: training.end_date,
              objectives: training.objectives || [],
              evaluation_methods: training.evaluation_methods || {
                profile_evaluation: false,
                skills_evaluation: false,
                knowledge_evaluation: false,
                satisfaction_survey: false
              },
              tracking_methods: training.tracking_methods || [],
              pedagogical_methods: training.pedagogical_methods || [],
              material_elements: training.material_elements || []
            };
            
            const participantData = {
              id: userId,
              first_name: '',
              last_name: '',
              job_position: ''
            };
            
            // Récupérer les données du participant
            supabase
              .from('user_profiles')
              .select('first_name, last_name, job_position')
              .eq('id', userId)
              .single()
              .then(({ data }) => {
                if (data) {
                  participantData.first_name = data.first_name;
                  participantData.last_name = data.last_name;
                  participantData.job_position = data.job_position;
                  
                  // Créer l'élément React
                  const element = createElement(CompletionCertificate, {
                    training: trainingData,
                    participant: participantData,
                    viewContext: 'student',
                    onCancel: () => {
                      console.log('🔍 [DEBUG] Completion certificate closed');
                      // Nettoyer le portail
                      const portalRoot = document.getElementById('completion-certificate-portal');
                      if (portalRoot) {
                        portalRoot.innerHTML = '';
                      }
                      
                      // Appeler onDocumentClose pour informer le parent
                      if (onDocumentClose) {
                        console.log('🔍 [DEBUG] Calling onDocumentClose from completion certificate onCancel');
                        onDocumentClose();
                      }
                    }
                  });
                  
                  // Rendre l'élément dans le portail
                  import('react-dom/client').then(({ createRoot }) => {
                    const root = createRoot(portalRoot);
                    root.render(element);
                  });
                }
              });
          }
        });
      });
    });
  };

  // Fonction pour afficher le composant TrainingAgreementPortal
  const showTrainingAgreement = () => {
    console.log('🔍 [DEBUG] Showing training agreement for signature');
    
    // Vérifier que training.id et userId ne sont pas null
    if (!training || !training.id || !userId) {
      console.error('🔍 [DEBUG] Missing required data for training agreement', { 
        trainingId: training?.id, 
        userId 
      });
      return;
    }

    // Définir isTrainingAgreementButtonCalled pour éviter les appels multiples
    setIsTrainingAgreementButtonCalled(true);

    // Créer un élément temporaire pour la convention de formation
    const portalElement = document.createElement('div');
    portalElement.id = 'training-agreement-button-portal';
    document.body.appendChild(portalElement);

    // Créer un portail React
    const root = ReactDOM.createRoot(portalElement);
    
    // Fonction pour nettoyer
    const cleanup = () => {
      root.unmount();
      document.body.removeChild(portalElement);
      setIsTrainingAgreementButtonCalled(false);
      
      if (onDocumentClose) {
        onDocumentClose();
      }
    };

    // Construire l'objet training pour le composant
    const trainingData = {
      id: training.id,
      title: training.title,
      duration: training.duration,
      trainer_name: training.trainer_name || '',
      location: typeof training.location === 'string' 
        ? training.location 
        : training.location?.name || '',
      start_date: training.start_date,
      end_date: training.end_date
    };

    // Rendu du composant dans le portail
    root.render(
      <TrainingAgreementPortal
        training={trainingData}
        userId={userId}
        onCancel={cleanup}
        onDocumentOpen={onDocumentOpen}
        onDocumentClose={onDocumentClose}
      />
    );
  };

  const isQuestionnaire = (item: TimelineItem) => {
    return item.action && (
      item.action.includes('questionnaire') || 
      item.action.includes('evaluation') || 
      item.action === 'satisfaction'
    );
  };

  const isDocument = (item: TimelineItem) => {
    return item.id === 'training-agreement' 
      || item.id === 'attendance-sheet' 
      || item.id === 'completion-certificate' 
      || item.id === 'internal-rules'
      || item.action === 'pdf';
  };

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

          {!training && (
            <div className="w-full mt-4 p-3 sm:p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 shrink-0" />
                <p className="font-medium text-sm sm:text-base text-yellow-400">En attente de validation</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm sm:text-base text-gray-300">
                  Votre entreprise est en attente de validation par un administrateur. 
                  Une fois validée, vous aurez accès à votre formation.
                </p>
              </div>
            </div>
          )}

          {nextStep && companyStatus === 'valid' && (
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

      {training && companyStatus === 'valid' ? (
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
                        const isCompleted = item.status === 'completed';
                        const isQuestionnaireItem = isQuestionnaire(item);
                        const isDocumentItem = isDocument(item);
                        const isDisabled = (isQuestionnaireItem || isDocumentItem) && companyStatus !== 'valid';
                        
                        return (
                          <motion.div
                            key={itemIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: phaseIndex * 0.3 + stageIndex * 0.2 + itemIndex * 0.1 }}
                            onClick={
                              (item.action && 
                               !(item.id === 'completion-certificate' || 
                                 item.id === 'attendance-sheet' || 
                                 item.id === 'training-agreement')) && !isDisabled 
                                ? (e) => {
                                    console.log('🔍 [DEBUG] Item clicked:', item);
                                    // Vérifier si le clic provient d'un lien de document
                                    const target = e.target as HTMLElement;
                                    if (target.closest('a[data-document-type]')) {
                                      console.log('🔍 [DEBUG] Click originated from document link, ignoring');
                                      return;
                                    }
                                    handleItemClick(item);
                                  } 
                                : isDocumentItem && !isDisabled 
                                  ? () => handleDocumentClick(item)
                                  : undefined
                            }
                            className={`
                              bg-gray-900 p-3 sm:p-4 rounded-xl border relative z-10
                              ${isQuestionnaireItem 
                                ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' 
                                : isDocumentItem
                                  ? 'border-green-500/50 shadow-lg shadow-green-500/10'
                                : 'border-gray-800'
                              }
                              ${isDisabled ? 'opacity-75' : ''}
                              ${(item.action && 
                                 !(item.id === 'completion-certificate' || 
                                   item.id === 'attendance-sheet' || 
                                   item.id === 'training-agreement')) && !isDisabled
                                   ? 'cursor-pointer hover:bg-gray-800 transition-colors' 
                                   : item.id === 'completion-certificate' || item.id === 'attendance-sheet' || item.id === 'training-agreement'
                                     ? 'cursor-pointer hover:bg-gray-800 transition-colors'
                                     : (isDisabled ? 'cursor-default' : '')}
                            `}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg flex-shrink-0 ${isCompleted ? 'bg-green-900/30' : isDisabled ? 'bg-gray-700/50' : 'bg-gray-700'}`}>
                                {isCompleted ? (
                                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                                ) : (
                                  <ItemIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${isDisabled ? 'text-gray-400' : isDocumentItem ? 'text-green-400' : 'text-blue-400'}`} />
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className={`font-medium text-base sm:text-lg ${isDisabled ? 'text-gray-400' : ''}`}>{item.title}</h4>
                                  {isDisabled && (
                                    <span className="inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-400">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      En attente
                                    </span>
                                  )}
                                </div>
                                
                                <p className={`text-xs sm:text-sm ${isDisabled ? 'text-gray-500' : 'text-gray-400'} mt-1`}>{item.description}</p>
                                
                                {/* Ajouter les boutons de document directement ici */}
                                {(item.id === 'completion-certificate' || 
                                  item.id === 'attendance-sheet' || 
                                  item.id === 'training-agreement') && !isDisabled && (
                                  <div className="mt-2">
                                    {renderDocumentButton(item)}
                                  </div>
                                )}
                              </div>
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
      ) : (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-center">
          <Building2 className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Entreprise en attente de validation</h3>
          <p className="text-gray-300 max-w-md mx-auto">
            Vous recevrez une notification dès que votre entreprise sera validée et associée à une formation.
          </p>
        </div>
      )}

      <div className="relative z-30">
        {showQuestionnaire && (
          <PositioningQuestionnaire
            onClose={() => {
              console.log('🔍 [DEBUG] Closing questionnaire from TrainingTimeline');
              setShowQuestionnaire(false);
              if (onDocumentClose) onDocumentClose();
            }}
            type="positioning"
            companyStatus={companyStatus}
            onSubmitSuccess={() => {
              console.log('🔍 [DEBUG] Questionnaire submitted successfully');
              setShowQuestionnaire(false);
              if (onDocumentClose) onDocumentClose();
              fetchQuestionnaireStatus();
            }}
          />
        )}
        
        {showQuestionnaireReport && (
          <PositioningQuestionnaire
            onClose={() => {
              setShowQuestionnaireReport(false);
              setQuestionnaireResponses(null);
            }}
            readOnly={readOnly}
            type={currentQuestionnaire ? "initial_final_evaluation" : "positioning"}
            sous_type={currentQuestionnaire}
            companyStatus={companyStatus}
            adminResponseData={questionnaireResponses}
            onSubmitSuccess={() => {
              setShowQuestionnaireReport(false);
              setQuestionnaireResponses(null);
              if (onDocumentClose) onDocumentClose();
              fetchQuestionnaireStatus();
            }}
          />
        )}
        
        {showSatisfactionQuestionnaire && (
          <SatisfactionQuestionnaire
            onClose={() => {
              setShowSatisfactionQuestionnaire(false);
              setSatisfactionData(null);
              if (onDocumentClose) onDocumentClose();
            }}
            readOnly={readOnly}
            adminResponseData={satisfactionData}
            onSubmitSuccess={() => {
              setShowSatisfactionQuestionnaire(false);
              setSatisfactionData(null);
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