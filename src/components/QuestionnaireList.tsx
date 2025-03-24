import React, { useEffect, useState, useRef } from 'react';
import { FileText, Eye, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PositioningQuestionnaire } from './PositioningQuestionnaire';
import { SatisfactionQuestionnaire } from './SatisfactionQuestionnaire';
import { generateWordLikePDF } from '../components/admin/pdfGenerator';
import { QuestionnairePDF } from './QuestionnairePDF';

interface QuestionnaireStatus {
  positioning: boolean;
  initial: boolean;
  final: boolean;
  satisfaction: boolean;
}

interface QuestionnaireScores {
  initial: number | null;
  final: number | null;
}

interface QuestionnaireListProps {
  refreshTrigger?: number;
}

export const QuestionnaireList: React.FC<QuestionnaireListProps> = ({ refreshTrigger = 0 }) => {
  const [status, setStatus] = useState<QuestionnaireStatus>({
    positioning: false,
    initial: false,
    final: false,
    satisfaction: false
  });
  const [scores, setScores] = useState<QuestionnaireScores>({
    initial: null,
    final: null
  });
  const [loading, setLoading] = useState(true);
  const [showQuestionnaire, setShowQuestionnaire] = useState<string | null>(null);
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
  const [companyStatus, setCompanyStatus] = useState<'valid' | 'pending' | 'not_found'>('valid');
  const [trainingAvailable, setTrainingAvailable] = useState<boolean>(false);

  const fetchQuestionnaireStatus = async () => {
    // Si l'entreprise n'est pas validée ou n'a pas de formations, ne pas charger les questionnaires
    if (companyStatus !== 'valid' || !trainingAvailable) {
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user profile status
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('questionnaire_completed, initial_evaluation_completed, final_evaluation_completed, satisfaction_completed, initial_evaluation_score, final_evaluation_score')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Vérifier directement dans les tables si les questionnaires existent
      // 1. Questionnaire de positionnement
      const { data: positioningData, error: positioningError } = await supabase
        .from('questionnaire_responses')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'positioning');
        
      if (positioningError) {
        console.error("Error checking positioning questionnaire:", positioningError);
      }
      
      // 2. Évaluations initiale et finale
      const evalType = 'initial_final_evaluation';
      
      const { data: evaluationData, error: evaluationError } = await supabase
        .from('questionnaire_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', evalType);
        
      if (evaluationError) {
        console.error("Error fetching evaluation data:", evaluationError);
      }
      
      // Adapter la logique en fonction de la présence ou non de sous_type
      let hasInitial, hasFinal;
      
      if (hasSousTypeColumn) {
        // Si la colonne sous_type existe, filtrer par sous_type
        hasInitial = evaluationData && evaluationData.some(item => item.sous_type === 'initial');
        hasFinal = evaluationData && evaluationData.some(item => item.sous_type === 'final');
      } else {
        // Sinon, on ne peut pas distinguer initial de final
        // On suppose que s'il y a des données d'évaluation, les deux sont complétés
        hasInitial = evaluationData && evaluationData.length > 0;
        hasFinal = evaluationData && evaluationData.length > 1;
      }
      
      // 3. Questionnaire de satisfaction
      const { data: satisfactionData, error: satisfactionError } = await supabase
        .from('satisfaction_responses')
        .select('id')
        .eq('user_id', user.id);
        
      if (satisfactionError) {
        console.error("Error checking satisfaction questionnaire:", satisfactionError);
      }
      
      // Mettre à jour les statuts des questionnaires en fonction des données trouvées
      const hasPositioning = positioningData && positioningData.length > 0;
      const hasSatisfaction = satisfactionData && satisfactionData.length > 0;
      
      // Récupérer les scores si disponibles
      let initialScore = null;
      let finalScore = null;
      
      if (evaluationData) {
        if (hasSousTypeColumn) {
          // Si la colonne sous_type existe, filtrer par sous_type
          const initialEval = evaluationData.find(item => item.sous_type === 'initial');
          const finalEval = evaluationData.find(item => item.sous_type === 'final');
          
          if (initialEval) initialScore = initialEval.score;
          if (finalEval) finalScore = finalEval.score;
        } else {
          // Sinon, on utilise les deux premiers enregistrements (si existants)
          if (evaluationData.length > 0) initialScore = evaluationData[0].score;
          if (evaluationData.length > 1) finalScore = evaluationData[1].score;
        }
      }

      if (profileData) {
        setStatus({
          positioning: hasPositioning || profileData.questionnaire_completed || false,
          initial: hasInitial || profileData.initial_evaluation_completed || false,
          final: hasFinal || profileData.final_evaluation_completed || false,
          satisfaction: hasSatisfaction || profileData.satisfaction_completed || false
        });
        
        setScores({
          initial: initialScore,
          final: finalScore
        });
      }
    } catch (error) {
      console.error('Error fetching questionnaire status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResponseData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer les réponses au questionnaire de positionnement
      const { data: positioningData, error: positioningError } = await supabase
        .from('questionnaire_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'positioning');

      if (positioningError) {
        console.error("Error fetching positioning data:", positioningError);
        return;
      }

      // Récupérer les réponses aux évaluations
      const { data: evaluationData, error: evaluationError } = await supabase
        .from('questionnaire_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'initial_final_evaluation');

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
        // Pour distinguer, on pourrait éventuellement utiliser d'autres critères (date de création, etc.)
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
    fetchUserProfile();
  }, [refreshTrigger]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer le profil utilisateur
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*, training_id, company_id, status')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setUserProfile(profileData);

      // Vérifier le statut de l'entreprise
      if (profileData.status === 'pending_company_validation') {
        setCompanyStatus('pending');
        setLoading(false); // Stop loading if company is pending
        return;
      } 
      
      // Si l'utilisateur a un company_id, vérifier si cette entreprise a des formations
      if (profileData.company_id) {
        // Vérifier si l'entreprise a des formations associées
        const { data: trainings, error: trainingsError } = await supabase
          .from('trainings')
          .select('id')
          .eq('company_id', profileData.company_id)
          .limit(1);

        if (trainingsError) throw trainingsError;
        
        if (trainings && trainings.length > 0) {
          setCompanyStatus('valid');
          setTrainingAvailable(true);
        } else {
          setCompanyStatus('pending');
          setLoading(false); // Stop loading if company has no trainings
        }
      } else if (profileData.company && !profileData.company_id) {
        setCompanyStatus('not_found');
        setLoading(false); // Stop loading if company is not found
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setLoading(false); // Stop loading on error
    }
  };

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

  return (
    <div className="bg-gray-900 rounded-lg p-6 h-full shadow-xl">
      {/* Afficher les questionnaires seulement si l'entreprise est valide et a des formations */}
      {(companyStatus === 'valid' && trainingAvailable) ? (
        <>
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
                {status.positioning && (
                  <div className="ml-2 flex items-center text-green-400">
                    <CheckCircle2 className="w-5 h-5 mr-1" />
                    <span className="text-xs">Complété</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setShowQuestionnaire('positioning')}
                  disabled={!status.positioning}
                  className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye className="w-4 h-4" />
                  <span>Voir</span>
                </button>
                <button
                  onClick={() => handleGeneratePDF('positionnement')}
                  disabled={!status.positioning || generatingPDF === 'positionnement'}
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
                {status.initial && (
                  <div className="ml-2 flex items-center text-green-400">
                    <CheckCircle2 className="w-5 h-5 mr-1" />
                    <span className="text-xs">Complété</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setShowQuestionnaire('initial')}
                  disabled={!status.initial}
                  className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye className="w-4 h-4" />
                  <span>Voir</span>
                </button>
                <button
                  onClick={() => handleGeneratePDF('evaluation_initiale')}
                  disabled={!status.initial || generatingPDF === 'evaluation_initiale'}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span>{generatingPDF === 'evaluation_initiale' ? 'Génération...' : 'PDF'}</span>
                </button>
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
                {status.final && (
                  <div className="ml-2 flex items-center text-green-400">
                    <CheckCircle2 className="w-5 h-5 mr-1" />
                    <span className="text-xs">Complété</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setShowQuestionnaire('final')}
                  disabled={!status.final}
                  className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye className="w-4 h-4" />
                  <span>Voir</span>
                </button>
                <button
                  onClick={() => handleGeneratePDF('evaluation_finale')}
                  disabled={!status.final || generatingPDF === 'evaluation_finale'}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span>{generatingPDF === 'evaluation_finale' ? 'Génération...' : 'PDF'}</span>
                </button>
              </div>
            </div>
            
            {/* Questionnaire de satisfaction */}
            <div className="bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <FileText className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Questionnaire de satisfaction</h3>
                  <p className="text-sm text-gray-400">Votre avis sur la formation</p>
                </div>
                {status.satisfaction && (
                  <div className="ml-2 flex items-center text-green-400">
                    <CheckCircle2 className="w-5 h-5 mr-1" />
                    <span className="text-xs">Complété</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setShowQuestionnaire('satisfaction')}
                  disabled={!status.satisfaction}
                  className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye className="w-4 h-4" />
                  <span>Voir</span>
                </button>
                <button
                  onClick={() => handleGeneratePDF('satisfaction')}
                  disabled={!status.satisfaction || generatingPDF === 'satisfaction'}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span>{generatingPDF === 'satisfaction' ? 'Génération...' : 'PDF'}</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Modals pour afficher les questionnaires */}
          {showQuestionnaire === 'positioning' && companyStatus === 'valid' && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <PositioningQuestionnaire 
                onClose={() => setShowQuestionnaire(null)} 
                readOnly={true}
                onSubmitSuccess={fetchQuestionnaireStatus}
                companyStatus={companyStatus}
              />
            </div>
          )}
          
          {showQuestionnaire === 'initial' && companyStatus === 'valid' && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <PositioningQuestionnaire 
                onClose={() => setShowQuestionnaire(null)} 
                readOnly={true}
                type="initial"
                onSubmitSuccess={fetchQuestionnaireStatus}
                companyStatus={companyStatus}
              />
            </div>
          )}
          
          {showQuestionnaire === 'final' && companyStatus === 'valid' && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <PositioningQuestionnaire 
                onClose={() => setShowQuestionnaire(null)} 
                readOnly={true}
                type="final"
                onSubmitSuccess={fetchQuestionnaireStatus}
                companyStatus={companyStatus}
              />
            </div>
          )}
          
          {showQuestionnaire === 'satisfaction' && companyStatus === 'valid' && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <SatisfactionQuestionnaire 
                onClose={() => setShowQuestionnaire(null)} 
                readOnly={true}
                onSubmitSuccess={fetchQuestionnaireStatus}
              />
            </div>
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
        </>
      ) : (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">Questionnaires non disponibles</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Les questionnaires seront disponibles une fois que votre entreprise sera validée et associée à une formation.
          </p>
        </div>
      )}
    </div>
  );
}; 