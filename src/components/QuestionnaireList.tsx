import React, { useEffect, useState, useRef } from 'react';
import { FileText, Eye, Download, CheckCircle2, AlertCircle, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PositioningQuestionnaire } from './PositioningQuestionnaire';
import { SatisfactionQuestionnaire } from './SatisfactionQuestionnaire';
import { generateWordLikePDF } from '../components/admin/pdfGenerator';
import { QuestionnairePDF } from './QuestionnairePDF';
import { Modal } from '../components/ui/Modal';

export type QuestionnaireType = 'positioning' | 'initial_final_evaluation' | 'satisfaction';
export type QuestionnaireSubType = 'initial' | 'final' | null;

const getQuestionnaireTitle = (type: QuestionnaireType | null): string => {
  switch (type) {
    case 'positioning':
      return 'Questionnaire de positionnement';
    case 'initial_final_evaluation':
      return 'Évaluation initiale ou finale';
    case 'satisfaction':
      return 'Questionnaire de satisfaction';
    default:
      return 'Questionnaire';
  }
};

interface QuestionnaireStatus {
  available: boolean;
  completed: boolean;
}

interface QuestionnaireStatuses {
  positioning: QuestionnaireStatus;
  initial: QuestionnaireStatus;
  final: QuestionnaireStatus;
  satisfaction: QuestionnaireStatus;
}

interface QuestionnaireScores {
  initial: number | null;
  final: number | null;
}

interface QuestionnaireListProps {
  refreshTrigger?: number;
}

export const QuestionnaireList: React.FC<QuestionnaireListProps> = ({ refreshTrigger = 0 }) => {
  const [status, setStatus] = useState<QuestionnaireStatuses>({
    positioning: { available: false, completed: false },
    initial: { available: false, completed: false },
    final: { available: false, completed: false },
    satisfaction: { available: false, completed: false }
  });
  const [scores, setScores] = useState<QuestionnaireScores>({
    initial: null,
    final: null
  });
  const [loading, setLoading] = useState(true);
  const [showQuestionnaire, setShowQuestionnaire] = useState<QuestionnaireType | null>(null);
  const [currentSubType, setCurrentSubType] = useState<QuestionnaireSubType>(null);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [hasSousTypeColumn, setHasSousTypeColumn] = useState<boolean | null>(null);
  const [responseData, setResponseData] = useState<Record<string, any>>({
    positioning: null,
    initial: null,
    final: null,
    satisfaction: null
  });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [companyStatus, setCompanyStatus] = useState<'valid' | 'pending' | 'not_found'>('pending');
  const [trainingAvailable, setTrainingAvailable] = useState(false);

  const fetchQuestionnaireStatus = async () => {
    try {
      console.log('🔍 [DEBUG] Starting fetchQuestionnaireStatus');
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Récupérer le profil de l'utilisateur avec les données de formation
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          training:trainings (
            id,
            title,
            evaluation_methods
          )
        `)
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      console.log('🔍 [DEBUG] Profile data:', profileData);

      if (!profileData?.training?.id) {
        console.log('🔍 [DEBUG] No training found for user');
        setTrainingAvailable(false);
        setLoading(false);
        return;
      }

      setTrainingAvailable(true);
      const trainingId = profileData.training.id;
      console.log('🔍 [DEBUG] Training found:', profileData.training);

      const evaluationMethods = profileData.training.evaluation_methods || {};
      const shouldShowPositioning = evaluationMethods.positioning_questionnaire || false;
      const shouldShowEvaluation = evaluationMethods.initial_final_evaluation || false;
      const shouldShowSatisfaction = evaluationMethods.satisfaction_survey || false;

      // Récupérer les templates de questionnaires disponibles pour cette formation spécifique
      const { data: templates, error: templatesError } = await supabase
        .from('questionnaire_templates')
        .select('id, type')
        .eq('training_id', trainingId)
        .eq('is_active', true);

      if (templatesError) {
        console.error('Error fetching questionnaire templates:', templatesError);
        throw templatesError;
      }

      console.log('🔍 [DEBUG] Available templates for training:', templates);

      // Si aucun template n'est trouvé pour cette formation, ne pas afficher de questionnaires
      if (!templates || templates.length === 0) {
        console.log('🔍 [DEBUG] No questionnaire templates found for this training');
        setStatus({
          positioning: { available: false, completed: false },
          initial: { available: false, completed: false },
          final: { available: false, completed: false },
          satisfaction: { available: false, completed: false }
        });
        setLoading(false);
        return;
      }

      // Organiser les templates par type
      const templatesByType = templates.reduce((acc: any, template) => {
        acc[template.type] = template.id;
        return acc;
      }, {});

      console.log('🔍 [DEBUG] Templates by type:', templatesByType);

      // Vérifier les réponses existantes pour cette formation spécifique
      const { data: responses, error: responsesError } = await supabase
        .from('questionnaire_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('training_id', trainingId);

      if (responsesError) {
        console.error('Error fetching questionnaire responses:', responsesError);
        throw responsesError;
      }

      console.log('🔍 [DEBUG] User responses for training:', responses);

      // Analyser les réponses
      const hasPositioning = responses?.some(r => r.type === 'positioning') || false;
      const hasInitialEvaluation = responses?.some(r => 
        r.type === 'initial_final_evaluation' && 
        r.sous_type === 'initial'
      ) || false;
      const hasFinalEvaluation = responses?.some(r => 
        r.type === 'initial_final_evaluation' && 
        r.sous_type === 'final'
      ) || false;
      const hasSatisfaction = responses?.some(r => r.type === 'satisfaction') || false;

      // Mettre à jour l'état avec les questionnaires disponibles et leur statut
      const newStatus = {
        positioning: {
          available: shouldShowPositioning && !!templatesByType['positioning'] && !hasPositioning,
          completed: hasPositioning
        },
        initial: {
          available: shouldShowEvaluation && !!templatesByType['initial_final_evaluation'] && !hasInitialEvaluation,
          completed: hasInitialEvaluation
        },
        final: {
          available: shouldShowEvaluation && !!templatesByType['initial_final_evaluation'] && !hasFinalEvaluation,
          completed: hasFinalEvaluation
        },
        satisfaction: {
          available: shouldShowSatisfaction && !!templatesByType['satisfaction'] && !hasSatisfaction,
          completed: hasSatisfaction
        }
      };

      console.log('🔍 [DEBUG] Setting new questionnaire status:', newStatus);
      setStatus(newStatus);

      // Mettre à jour les scores si disponibles
      if (responses) {
        const initialResponse = responses.find(r => 
          r.type === 'initial_final_evaluation' && 
          r.sous_type === 'initial'
        );
        const finalResponse = responses.find(r => 
          r.type === 'initial_final_evaluation' && 
          r.sous_type === 'final'
        );

        setScores({
          initial: initialResponse?.score || null,
          final: finalResponse?.score || null
        });

        // Mettre à jour les données de réponse pour chaque type
        setResponseData({
          positioning: responses.find(r => r.type === 'positioning') || null,
          initial: initialResponse || null,
          final: finalResponse || null,
          satisfaction: responses.find(r => r.type === 'satisfaction') || null
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching questionnaire status:', error);
      setLoading(false);
    }
  };

  const fetchResponseData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer d'abord le profil utilisateur pour avoir l'ID de la formation
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*, training:trainings (id)')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        return;
      }

      // Si pas de formation associée, ne pas continuer
      if (!profileData?.training?.id) {
        console.log('No training associated with user');
        setResponseData({
          positioning: null,
          initial: null,
          final: null,
          satisfaction: null
        });
        return;
      }

      // Récupérer les réponses au questionnaire de positionnement pour cette formation
      const { data: positioningData, error: positioningError } = await supabase
        .from('questionnaire_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'positioning')
        .eq('training_id', profileData.training.id);

      if (positioningError) {
        console.error("Error fetching positioning data:", positioningError);
        return;
      }

      // Récupérer les réponses aux évaluations pour cette formation
      const { data: evaluationData, error: evaluationError } = await supabase
        .from('questionnaire_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'initial_final_evaluation')
        .eq('training_id', profileData.training.id);

      if (evaluationError) {
        console.error("Error fetching evaluation data:", evaluationError);
        return;
      }

      let initialEval = null;
      let finalEval = null;
      
      if (hasSousTypeColumn) {
        // Si la colonne sous_type existe, filtrer par sous_type
        initialEval = evaluationData?.find(item => item.sous_type === 'initial');
        finalEval = evaluationData?.find(item => item.sous_type === 'final');
      } else {
        // Sinon, on ne peut pas distinguer initial de final, donc on prend les deux premiers (si existants)
        initialEval = evaluationData && evaluationData.length > 0 ? evaluationData[0] : null;
        finalEval = evaluationData && evaluationData.length > 1 ? evaluationData[1] : null;
      }

      // Utilisez le premier élément du tableau pour positioning s'il existe
      const positioningResponse = positioningData && positioningData.length > 0 ? positioningData[0] : null;

      setResponseData({
        positioning: positioningResponse,
        initial: initialEval,
        final: finalEval,
        satisfaction: null
      });
      
    } catch (error) {
      console.error("Error fetching response data:", error);
    }
  };

  useEffect(() => {
    // Only fetch if company is valid and has trainings
    if (companyStatus === 'valid' && trainingAvailable) {
      fetchQuestionnaireStatus();
      fetchResponseData();
    }
  }, [refreshTrigger, companyStatus, trainingAvailable]);

  // Ajouter un effet pour rafraîchir périodiquement le statut des questionnaires
  useEffect(() => {
    // Only set interval if company is valid and has trainings
    if (companyStatus !== 'valid' || !trainingAvailable) {
      return;
    }
    
    // Rafraîchir le statut des questionnaires toutes les 30 secondes au lieu de 5
    const intervalId = setInterval(() => {
      // Vérifier si le composant est toujours monté avant de rafraîchir
      if (document.hidden) {
        return; // Ne pas rafraîchir si l'onglet est en arrière-plan
      }
      fetchQuestionnaireStatus();
    }, 30000); // 30 secondes au lieu de 5

    // Nettoyer l'intervalle lorsque le composant est démonté
    return () => clearInterval(intervalId);
  }, [companyStatus, trainingAvailable]);

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

  const handleGeneratePDF = async (type: string) => {
    if (!pdfRef.current) return;
    
    try {
      setGeneratingPDF(type);
      
      // Attendre que le composant PDF soit rendu
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Générer le PDF
      const fileName = `Questionnaire_${type}_${new Date().toISOString().split('T')[0]}.pdf`;
      await generateWordLikePDF(pdfRef.current, fileName);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF.');
    } finally {
      setGeneratingPDF(null);
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select(`
            *,
            company:companies (
              id,
              name,
              status
            )
          `)
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        console.log('🔍 [DEBUG] Profile data:', profileData);

        // Vérifier le statut de l'entreprise
        if (!profileData.company) {
          console.log('🔍 [DEBUG] No company found');
          setCompanyStatus('not_found');
          return;
        }

        if (profileData.company.status === 'pending') {
          console.log('🔍 [DEBUG] Company status is pending');
          setCompanyStatus('pending');
          return;
        }

        setCompanyStatus('valid');
        fetchQuestionnaireStatus();
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [refreshTrigger]);

  if (loading) {
    // Don't show loading spinner if company is not valid
    if (companyStatus !== 'valid') {
      return null;
    }
    
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Return null if company is not valid or no training available
  if (companyStatus !== 'valid' || !trainingAvailable) {
    return null;
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 h-full shadow-xl">
      <h2 className="text-xl font-bold mb-6">Mes questionnaires</h2>
      <div className="space-y-4">
        {/* Questionnaire de positionnement */}
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold">Questionnaire de positionnement</h3>
              <p className="text-sm text-gray-400">Évaluation de vos besoins et objectifs</p>
            </div>
            {status.positioning.completed && (
              <div className="ml-2 flex items-center text-green-400">
                <CheckCircle2 className="w-5 h-5 mr-1" />
                <span className="text-xs">Complété</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <button
              onClick={() => setShowQuestionnaire('positioning')}
              disabled={!status.positioning.available}
              className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="w-4 h-4" />
              <span>Voir</span>
            </button>
            <button
              onClick={() => handleGeneratePDF('positionnement')}
              disabled={!status.positioning.available || generatingPDF === 'positionnement'}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>{generatingPDF === 'positionnement' ? 'Génération...' : 'PDF'}</span>
            </button>
          </div>
        </div>
        
        {/* Évaluation initiale */}
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <FileText className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold">Évaluation initiale</h3>
              <p className="text-sm text-gray-400">Évaluation des connaissances de départ</p>
              {scores.initial !== null && (
                <p className="text-sm text-yellow-400 mt-1">Score: {scores.initial}%</p>
              )}
            </div>
            {status.initial.completed && (
              <div className="ml-2 flex items-center text-green-400">
                <CheckCircle2 className="w-5 h-5 mr-1" />
                <span className="text-xs">Complété</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <button
              onClick={() => {
                setShowQuestionnaire('initial_final_evaluation');
                setCurrentSubType('initial');
              }}
              disabled={!status.initial.available}
              className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trophy size={16} />
              <span>Évaluation initiale</span>
            </button>
            {status.initial.completed && (
              <button
                onClick={() => {
                  setShowQuestionnaire('initial_final_evaluation');
                  setCurrentSubType('initial');
                }}
                className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center gap-1"
              >
                <Eye size={16} />
                <span>Voir mes réponses</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Évaluation finale */}
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold">Évaluation finale</h3>
              <p className="text-sm text-gray-400">Évaluation des connaissances acquises</p>
              {scores.final !== null && (
                <p className="text-sm text-yellow-400 mt-1">Score: {scores.final}%</p>
              )}
            </div>
            {status.final.completed && (
              <div className="ml-2 flex items-center text-green-400">
                <CheckCircle2 className="w-5 h-5 mr-1" />
                <span className="text-xs">Complété</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <button
              onClick={() => {
                setShowQuestionnaire('initial_final_evaluation');
                setCurrentSubType('final');
              }}
              disabled={!status.final.available}
              className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trophy size={16} />
              <span>Évaluation finale</span>
            </button>
            {status.final.completed && (
              <button
                onClick={() => {
                  setShowQuestionnaire('initial_final_evaluation');
                  setCurrentSubType('final');
                }}
                className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center gap-1"
              >
                <Eye size={16} />
                <span>Voir mes réponses</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Questionnaire de satisfaction - ne l'afficher que s'il est disponible */}
        {status.satisfaction.available && (
          <div className="bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <FileText className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold">Questionnaire de satisfaction</h3>
                <p className="text-sm text-gray-400">Votre avis sur la formation</p>
              </div>
              {status.satisfaction.completed && (
                <div className="ml-2 flex items-center text-green-400">
                  <CheckCircle2 className="w-5 h-5 mr-1" />
                  <span className="text-xs">Complété</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 self-end sm:self-auto">
              <button
                onClick={() => setShowQuestionnaire('satisfaction')}
                disabled={!status.satisfaction.available}
                className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye className="w-4 h-4" />
                <span>Voir</span>
              </button>
              <button
                onClick={() => handleGeneratePDF('satisfaction')}
                disabled={!status.satisfaction.available || generatingPDF === 'satisfaction'}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>{generatingPDF === 'satisfaction' ? 'Génération...' : 'PDF'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Modals pour afficher les questionnaires */}
      {showQuestionnaire === 'initial_final_evaluation' && (
        <Modal onClose={() => {
          setShowQuestionnaire(null);
          setCurrentSubType(null);
        }} title={getQuestionnaireTitle('initial_final_evaluation')}>
          <PositioningQuestionnaire
            onClose={() => {
              setShowQuestionnaire(null);
              setCurrentSubType(null);
            }}
            readOnly={currentSubType === 'initial' ? status.initial.completed : status.final.completed}
            type={currentSubType}
            companyStatus={companyStatus}
            onSubmitSuccess={() => {
              setShowQuestionnaire(null);
              setCurrentSubType(null);
              fetchQuestionnaireStatus();
            }}
          />
        </Modal>
      )}
      
      {showQuestionnaire === 'positioning' && (
        <Modal onClose={() => setShowQuestionnaire(null)} title={getQuestionnaireTitle('positioning')}>
          <PositioningQuestionnaire
            onClose={() => setShowQuestionnaire(null)}
            readOnly={status.positioning.completed}
            type="positioning"
            companyStatus={companyStatus}
            onSubmitSuccess={() => {
              setShowQuestionnaire(null);
              fetchQuestionnaireStatus();
            }}
          />
        </Modal>
      )}
      
      {showQuestionnaire === 'satisfaction' && (
        <Modal onClose={() => {
          setShowQuestionnaire(null);
          setResponseData(prev => ({ ...prev, satisfaction: null }));
        }} title={getQuestionnaireTitle('satisfaction')}>
          <SatisfactionQuestionnaire
            onClose={() => {
              setShowQuestionnaire(null);
              setResponseData(prev => ({ ...prev, satisfaction: null }));
            }}
            readOnly={status.satisfaction.completed}
            adminResponseData={responseData.satisfaction}
            onSubmitSuccess={() => {
              setShowQuestionnaire(null);
              setResponseData(prev => ({ ...prev, satisfaction: null }));
              fetchQuestionnaireStatus();
            }}
          />
        </Modal>
      )}
      
      {/* Conteneur caché pour la génération de PDF */}
      <div className="hidden">
        {generatingPDF === 'positionnement' && (
          <div ref={pdfRef}>
            <QuestionnairePDF type="positioning" />
          </div>
        )}
        
        {generatingPDF === 'evaluation_initiale' && (
          <div ref={pdfRef}>
            <QuestionnairePDF type="initial" />
          </div>
        )}
        
        {generatingPDF === 'evaluation_finale' && (
          <div ref={pdfRef}>
            <QuestionnairePDF type="final" />
          </div>
        )}
        
        {generatingPDF === 'satisfaction' && (
          <div ref={pdfRef}>
            <QuestionnairePDF type="satisfaction" />
          </div>
        )}
      </div>
    </div>
  );
}; 