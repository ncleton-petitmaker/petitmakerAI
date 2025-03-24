import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Users,
  ExternalLink,
  Edit,
  Trash2,
  Info,
  Eye,
  CheckCircle2,
  XCircle,
  Trophy,
  Star,
  Download,
  Clock,
  FileText
} from 'lucide-react';
import { LoadingSpinner } from '../LoadingSpinner';
import { PositioningQuestionnaire } from '../PositioningQuestionnaire';
import { SatisfactionQuestionnaire } from '../SatisfactionQuestionnaire';
import { generateWordLikePDF } from './pdfGenerator';
import { QuestionnairePDF } from '../QuestionnairePDF';
import { GenericAttendanceSheetButton } from './GenericAttendanceSheetButton';
import { CompletionCertificateButton } from './CompletionCertificateButton';

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

interface LearnerDetailProps {
  onBack?: () => void;
}

export const LearnerDetail: React.FC<LearnerDetailProps> = ({ onBack }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [learner, setLearner] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [questionnaireStatus, setQuestionnaireStatus] = useState<QuestionnaireStatus>({
    positioning: false,
    initial: false,
    final: false,
    satisfaction: false
  });
  const [questionnaireScores, setQuestionnaireScores] = useState<QuestionnaireScores>({
    initial: null,
    final: null
  });
  const [questionnaireResponses, setQuestionnaireResponses] = useState<{
    positioning: any | null;
    initial: any | null;
    final: any | null;
    satisfaction: any | null;
  }>({
    positioning: null,
    initial: null,
    final: null,
    satisfaction: null
  });
  const [showQuestionnaire, setShowQuestionnaire] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchLearnerDetails();
    }
  }, [id]);

  const fetchLearnerDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Reset states to avoid duplicates during reloads
      setTrainings([]);
      setDocuments([]);
      
      // Fetch learner profile with all necessary data in a single request
      const { data: learnerData, error: learnerError } = await supabase
        .from('user_profiles')
        .select('*, companies(*)')
        .eq('id', id)
        .single();

      if (learnerError) throw learnerError;

      // Get learner's email
      const { data: emailData, error: emailError } = await supabase
        .rpc('get_auth_users_email', { user_id: id });
      
      if (emailError) throw emailError;
      
      const learnerWithEmail = {
        ...learnerData,
        auth_email: emailData || 'Email non disponible'
      };

      setLearner(learnerWithEmail);

      // Récupérer les données des questionnaires en parallèle pour optimiser les performances
      const [positioningResponse, evaluationResponse, satisfactionResponse] = await Promise.all([
        // 1. Questionnaire de positionnement
        supabase
          .from('questionnaire_responses')
          .select('*')
          .eq('user_id', id)
          .eq('type', 'positioning'),
        
        // 2. Évaluations initiale et finale
        supabase
          .from('questionnaire_responses')
          .select('*')
          .eq('user_id', id)
          .eq('type', 'initial_final_evaluation'),
        
        // 3. Questionnaire de satisfaction
        supabase
          .from('satisfaction_responses')
          .select('*')
          .eq('user_id', id)
      ]);
      
      // Gérer les erreurs potentielles
      if (positioningResponse.error) {
        console.error("Error checking positioning questionnaire:", positioningResponse.error);
      }
      
      if (evaluationResponse.error) {
        console.error("Error checking evaluation responses:", evaluationResponse.error);
      }
      
      if (satisfactionResponse.error) {
        console.error("Error checking satisfaction questionnaire:", satisfactionResponse.error);
      }
      
      // Extraire les données des réponses
      const positioningData = positioningResponse.data;
      const evaluationData = evaluationResponse.data;
      const satisfactionData = satisfactionResponse.data;
      
      console.log("Positioning data:", positioningData);
      console.log("Evaluation data:", evaluationData);
      console.log("Satisfaction data:", satisfactionData);
      
      // Vérifier si la colonne sous_type existe
      const hasSousTypeColumn = evaluationData && evaluationData.length > 0 && 'sous_type' in evaluationData[0];
      console.log("Has sous_type column:", hasSousTypeColumn);
      
      // Mettre à jour les statuts des questionnaires en fonction des données trouvées
      const hasPositioning = positioningData && positioningData.length > 0;
      
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
      
      const hasSatisfaction = satisfactionData && satisfactionData.length > 0;
      
      // Récupérer les scores des évaluations
      let initialScore = null;
      let finalScore = null;
      
      // Organiser les données d'évaluation
      let initialEval, finalEval;
      
      if (hasSousTypeColumn) {
        // Si la colonne sous_type existe, filtrer par sous_type
        initialEval = evaluationData?.find(item => item.sous_type === 'initial');
        finalEval = evaluationData?.find(item => item.sous_type === 'final');
      } else {
        // Sinon, on ne peut pas distinguer initial de final, donc on prend les deux premiers (si existants)
        initialEval = evaluationData && evaluationData.length > 0 ? evaluationData[0] : null;
        finalEval = evaluationData && evaluationData.length > 1 ? evaluationData[1] : null;
      }
      
      if (initialEval) initialScore = initialEval.score;
      if (finalEval) finalScore = finalEval.score;

      // Stocker les réponses complètes des questionnaires
      const positioningResponse1 = hasPositioning && positioningData.length > 0 ? positioningData[0] : null;
      const satisfactionResponse1 = hasSatisfaction && satisfactionData.length > 0 ? satisfactionData[0] : null;
      
      setQuestionnaireResponses({
        positioning: positioningResponse1,
        initial: initialEval,
        final: finalEval,
        satisfaction: satisfactionResponse1
      });

      console.log("Questionnaire responses:", {
        positioning: positioningResponse1,
        initial: initialEval,
        final: finalEval,
        satisfaction: satisfactionResponse1
      });

      // Mettre à jour les états avec les données récupérées
      setQuestionnaireStatus({
        positioning: hasPositioning || learnerData.questionnaire_completed || false,
        initial: hasInitial || learnerData.initial_evaluation_completed || false,
        final: hasFinal || learnerData.final_evaluation_completed || false,
        satisfaction: hasSatisfaction || learnerData.satisfaction_completed || false
      });
      
      console.log("Questionnaire status:", {
        positioning: hasPositioning || learnerData.questionnaire_completed || false,
        initial: hasInitial || learnerData.initial_evaluation_completed || false,
        final: hasFinal || learnerData.final_evaluation_completed || false,
        satisfaction: hasSatisfaction || learnerData.satisfaction_completed || false
      });
      
      setQuestionnaireScores({
        initial: initialScore !== null ? initialScore : learnerData.initial_evaluation_score,
        final: finalScore !== null ? finalScore : learnerData.final_evaluation_score
      });

      console.log("Questionnaire scores:", {
        initial: initialScore !== null ? initialScore : learnerData.initial_evaluation_score,
        final: finalScore !== null ? finalScore : learnerData.final_evaluation_score
      });

      // Fetch trainings
      // If learner has a training_id, fetch that training first
      if (learnerData.training_id) {
        const { data: trainingData, error: trainingError } = await supabase
          .from('trainings')
          .select('*')
          .eq('id', learnerData.training_id)
          .single();

        if (trainingError) {
          console.error('Error fetching training:', trainingError);
        } else if (trainingData) {
          setTrainings([{
            id: `direct-${trainingData.id}`,
            status: learnerData.training_status || 'registered',
            training_id: trainingData.id,
            trainings: trainingData,
            isDirectEnrollment: true,
            enrollmentType: 'direct'
          }]);
        }
      }

      // Fetch company details and trainings if company_id exists
      if (learnerData.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', learnerData.company_id)
          .single();

        if (companyError) throw companyError;
        setCompany(companyData);

        // Fetch all trainings associated with the company
        const { data: companyTrainings, error: companyTrainingsError } = await supabase
          .from('trainings')
          .select('*')
          .eq('company_id', learnerData.company_id);

        if (companyTrainingsError) {
          console.error('Error fetching company trainings:', companyTrainingsError);
        } else if (companyTrainings) {
          setTrainings(companyTrainings.map(training => ({
            id: `company-${training.id}-${learnerData.company_id}`,
            status: 'company_associated',
            training_id: training.id,
            trainings: training,
            isDirectEnrollment: false,
            enrollmentType: 'company'
          })));
        }
      }

    } catch (error) {
      console.error('Error fetching learner details:', error);
      setError('Impossible de charger les détails de l\'apprenant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/admin');
    }
  };

  const handleEdit = () => {
    navigate('/admin', { 
      state: { 
        openLearnerEdit: true, 
        learnerToEdit: learner 
      } 
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non disponible';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Non disponible';
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewQuestionnaire = (type: string) => {
    console.log(`=== Viewing questionnaire: ${type} ===`);
    console.log(`User ID: ${id}`);
    console.log(`Questionnaire status: ${JSON.stringify(questionnaireStatus)}`);
    
    // Log the response data structure for debugging
    const responseData = type === 'positioning' ? questionnaireResponses.positioning :
                 type === 'initial' ? questionnaireResponses.initial :
                 type === 'final' ? questionnaireResponses.final :
                 questionnaireResponses.satisfaction;
                 
    console.log(`Response data:`, responseData);
    
    if (responseData) {
      console.log(`Response data type: ${typeof responseData}`);
      console.log(`Response data keys: ${Object.keys(responseData)}`);
      
      // NOUVEAU: analyser profondément la structure des données
      console.log("Response data full structure:", JSON.stringify(responseData, null, 2));
      
      if (responseData.responses) {
        console.log(`Responses field type: ${typeof responseData.responses}`);
        
        // NOUVEAU: tenter de convertir les réponses si c'est une chaîne
        if (typeof responseData.responses === 'string') {
          try {
            // Tentative de parsing de la chaîne JSON
            const parsedResponses = JSON.parse(responseData.responses);
            console.log(`Parsed responses:`, parsedResponses);
            
            // IMPORTANT: Mettre à jour la structure de données directement avant d'afficher
            if (type === 'positioning') {
              questionnaireResponses.positioning = {
                ...responseData,
                responses: parsedResponses
              };
            } else if (type === 'initial') {
              questionnaireResponses.initial = {
                ...responseData,
                responses: parsedResponses
              };
            } else if (type === 'final') {
              questionnaireResponses.final = {
                ...responseData,
                responses: parsedResponses
              };
            } else if (type === 'satisfaction') {
              questionnaireResponses.satisfaction = {
                ...responseData,
                responses: parsedResponses
              };
            }
          } catch (e: any) {
            console.error(`Could not parse responses: ${e.message}`);
          }
        } else {
          console.log(`Responses field content:`, responseData.responses);
        }
      } else {
        console.warn("No responses field in the data object!");
      }
    } else {
      console.warn(`No response data available for ${type} questionnaire`);
    }
    
    setShowQuestionnaire(type);
  };

  const handleGeneratePDF = async (type: string) => {
    if (!pdfRef.current) return;
    
    try {
      setGeneratingPDF(type);
      await new Promise(resolve => setTimeout(resolve, 500));
      await generateWordLikePDF(pdfRef.current, `${type}_${learner.first_name}_${learner.last_name}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF.');
    } finally {
      setGeneratingPDF(null);
    }
  };

  const prepareQuestionnaireData = (responseData: any) => {
    if (!responseData) {
      console.log("No response data provided");
      return null;
    }
    
    console.log("Original response data:", responseData);
    console.log("Response data type:", typeof responseData);
    console.log("Response data keys:", Object.keys(responseData));
    
    // Créer une structure propre pour les données
    const result = {
      ...responseData, // Conserver toutes les propriétés originales
      responses: {} // Initialiser avec un objet vide
    };
    
    // Traiter le champ responses
    if (responseData.responses) {
      if (typeof responseData.responses === 'string') {
        try {
          result.responses = JSON.parse(responseData.responses);
          console.log("Parsed JSON string responses:", result.responses);
        } catch (e) {
          console.error("Error parsing responses JSON:", e);
          // En cas d'erreur, essayer d'extraire un maximum d'informations
          try {
            // Essayer de nettoyer la chaîne si elle contient des caractères spéciaux
            const cleanedJson = responseData.responses.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
            result.responses = JSON.parse(cleanedJson);
            console.log("Parsed cleaned JSON string:", result.responses);
          } catch (cleanError) {
            console.error("Failed to parse even after cleaning:", cleanError);
            
            // Dernière tentative: essayer de trouver des patterns dans la chaîne
            try {
              const responseStr = responseData.responses.toString();
              // Créer un objet à partir de la chaîne s'il contient des clés identifiables
              const tempObj: Record<string, string> = {};
              const keyValuePattern = /"([^"]+)":"([^"]+)"/g;
              let match;
              while ((match = keyValuePattern.exec(responseStr)) !== null) {
                tempObj[match[1]] = match[2];
              }
              
              if (Object.keys(tempObj).length > 0) {
                result.responses = tempObj;
                console.log("Extracted responses from string pattern:", result.responses);
              }
            } catch (patternError) {
              console.error("All parsing attempts failed");
              result.responses = {}; // Définir un objet vide
            }
          }
        }
      } else if (typeof responseData.responses === 'object') {
        // Si c'est déjà un objet, le copier directement
        result.responses = { ...responseData.responses };
        console.log("Using existing object responses:", result.responses);
      } else {
        console.warn("Responses is neither a string nor an object:", responseData.responses);
        result.responses = {};
      }
    } else {
      console.warn("No responses field found in data");
      result.responses = {};
    }
    
    console.log("Final prepared data:", result);

    // Si les données contiennent un score, le sauvegarder dans localStorage
    if (responseData && responseData.score !== undefined && responseData.score !== null && id) {
      try {
        const storageKey = `questionnaire_${responseData.type || 'unknown'}_${id}_score`;
        localStorage.setItem(storageKey, responseData.score.toString());
        console.log(`Saved score ${responseData.score} to localStorage with key ${storageKey}`);
      } catch (e) {
        console.error("Error saving score to localStorage:", e);
      }
    }

    return result;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <LoadingSpinner message="Chargement des détails de l'apprenant..." />
      </div>
    );
  }

  if (error || !learner) {
    return (
      <div className="bg-white shadow rounded-lg p-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Détails de l'apprenant</h1>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error || "Impossible de trouver l'apprenant demandé"}
        </div>
        <div className="mt-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Détails de l'apprenant</h1>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleEdit}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Edit className="h-4 w-4 mr-1" />
            Modifier
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Learner profile */}
        <div className="flex flex-col md:flex-row md:items-start">
          {/* Logo and basic info */}
          <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
            <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-800 text-2xl font-medium">
                {learner.first_name?.charAt(0)}{learner.last_name?.charAt(0)}
              </span>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {learner.first_name} {learner.last_name}
            </h2>
            
            <div className="mt-1 flex items-center">
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                learner.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {learner.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
              {learner.is_admin && (
                <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                  Administrateur
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{learner.auth_email}</p>
                </div>
              </div>

              {learner.phone && (
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Téléphone</p>
                    <p className="text-sm text-gray-900">{learner.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start">
                <Building2 className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Entreprise</p>
                  <p className="text-sm text-gray-900">
                    {company ? (
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/admin/companies/${company.id}`);
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {company.name}
                      </a>
                    ) : (
                      learner.company || 'Non assignée'
                    )}
                  </p>
                </div>
              </div>

              {learner.job_position && (
                <div className="flex items-start">
                  <Users className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Poste / Fonction</p>
                    <p className="text-sm text-gray-900">{learner.job_position}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Date d'inscription</p>
                  <p className="text-sm text-gray-900">{formatDate(learner.created_at)}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Clock className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Dernière connexion</p>
                  <p className="text-sm text-gray-900">
                    {learner.last_login ? (
                      <>
                        {formatDate(learner.last_login)} à {formatTime(learner.last_login)}
                      </>
                    ) : (
                      'Jamais connecté'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Training Section */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Formation</h3>
          
          {trainings.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune formation</h3>
              <p className="mt-1 text-sm text-gray-500">
                Cet apprenant n'est inscrit à aucune formation.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {trainings.map((training) => (
                  <li key={training.id}>
                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-blue-800" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {training.trainings.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {training.trainings.start_date ? (
                                <span>
                                  Du {new Date(training.trainings.start_date).toLocaleDateString('fr-FR')}
                                  {training.trainings.end_date && (
                                    <> au {new Date(training.trainings.end_date).toLocaleDateString('fr-FR')}</>
                                  )}
                                </span>
                              ) : (
                                <span>Dates non définies</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <GenericAttendanceSheetButton 
                            training={training.trainings}
                            participants={[{
                              id: learner.id,
                              first_name: learner.first_name,
                              last_name: learner.last_name,
                              job_position: learner.job_position
                            }]}
                            buttonText="Émargement"
                            variant="outline"
                          />
                          <CompletionCertificateButton
                            training={training.trainings}
                            participants={[{
                              id: learner.id,
                              first_name: learner.first_name,
                              last_name: learner.last_name,
                              job_position: learner.job_position
                            }]}
                            buttonText="Attestation"
                            variant="outline"
                          />
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            training.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : training.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {training.status === 'completed' 
                              ? 'Terminée' 
                              : training.status === 'in_progress'
                                ? 'En cours'
                                : training.status === 'registered'
                                  ? 'Inscrit'
                                  : 'Associée'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Questionnaires */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Questionnaires</h3>
          
          <div className="space-y-4">
            {/* Questionnaire de positionnement */}
            <div className="bg-white shadow rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Questionnaire de positionnement</h3>
                  <p className="text-sm text-gray-500">Évaluation des besoins et objectifs</p>
                </div>
                {questionnaireStatus.positioning && (
                  <div className="ml-2 flex items-center text-green-600">
                    <CheckCircle2 className="w-5 h-5 mr-1" />
                    <span className="text-xs">Complété</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <button
                  onClick={() => handleViewQuestionnaire('positioning')}
                  disabled={!questionnaireStatus.positioning}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                >
                  <Eye className="w-4 h-4" />
                  <span>Voir</span>
                </button>
                <button
                  onClick={() => handleGeneratePDF('positionnement')}
                  disabled={!questionnaireStatus.positioning || generatingPDF === 'positionnement'}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  <Download className="w-4 h-4" />
                  <span>{generatingPDF === 'positionnement' ? 'Génération...' : 'PDF'}</span>
                </button>
              </div>
            </div>
            
            {/* Évaluation initiale */}
            <div className="bg-white shadow rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Évaluation initiale</h3>
                  <p className="text-sm text-gray-500">Évaluation des connaissances de départ</p>
                  {questionnaireStatus.initial && questionnaireScores.initial !== null && (
                    <p className="text-sm text-yellow-600 mt-1">Score: {questionnaireScores.initial}%</p>
                  )}
                </div>
                {questionnaireStatus.initial && (
                  <div className="ml-2 flex items-center text-green-600">
                    <CheckCircle2 className="w-5 h-5 mr-1" />
                    <span className="text-xs">Complété</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <button
                  onClick={() => handleViewQuestionnaire('initial')}
                  disabled={!questionnaireStatus.initial}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                >
                  <Eye className="w-4 h-4" />
                  <span>Voir</span>
                </button>
                <button
                  onClick={() => handleGeneratePDF('evaluation_initiale')}
                  disabled={!questionnaireStatus.initial || generatingPDF === 'evaluation_initiale'}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  <Download className="w-4 h-4" />
                  <span>{generatingPDF === 'evaluation_initiale' ? 'Génération...' : 'PDF'}</span>
                </button>
              </div>
            </div>
            
            {/* Évaluation finale */}
            <div className="bg-white shadow rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Évaluation finale</h3>
                  <p className="text-sm text-gray-500">Évaluation des connaissances acquises</p>
                  {questionnaireStatus.final && questionnaireScores.final !== null && (
                    <p className="text-sm text-yellow-600 mt-1">Score: {questionnaireScores.final}%</p>
                  )}
                </div>
                {questionnaireStatus.final && (
                  <div className="ml-2 flex items-center text-green-600">
                    <CheckCircle2 className="w-5 h-5 mr-1" />
                    <span className="text-xs">Complété</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <button
                  onClick={() => handleViewQuestionnaire('final')}
                  disabled={!questionnaireStatus.final}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                >
                  <Eye className="w-4 h-4" />
                  <span>Voir</span>
                </button>
                <button
                  onClick={() => handleGeneratePDF('evaluation_finale')}
                  disabled={!questionnaireStatus.final || generatingPDF === 'evaluation_finale'}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  <Download className="w-4 h-4" />
                  <span>{generatingPDF === 'evaluation_finale' ? 'Génération...' : 'PDF'}</span>
                </button>
              </div>
            </div>
            
            {/* Questionnaire de satisfaction */}
            <div className="bg-white shadow rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <FileText className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Questionnaire de satisfaction</h3>
                  <p className="text-sm text-gray-500">Retour sur la formation</p>
                </div>
                {questionnaireStatus.satisfaction && (
                  <div className="ml-2 flex items-center text-green-600">
                    <CheckCircle2 className="w-5 h-5 mr-1" />
                    <span className="text-xs">Complété</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <button
                  onClick={() => handleViewQuestionnaire('satisfaction')}
                  disabled={!questionnaireStatus.satisfaction}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                >
                  <Eye className="w-4 h-4" />
                  <span>Voir</span>
                </button>
                <button
                  onClick={() => handleGeneratePDF('satisfaction')}
                  disabled={!questionnaireStatus.satisfaction || generatingPDF === 'satisfaction'}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  <Download className="w-4 h-4" />
                  <span>{generatingPDF === 'satisfaction' ? 'Génération...' : 'PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showQuestionnaire === 'positioning' && (
        <PositioningQuestionnaire 
          onClose={() => setShowQuestionnaire(null)} 
          readOnly={true}
          type={null}
          adminResponseData={prepareQuestionnaireData(questionnaireResponses.positioning)}
          onSubmitSuccess={fetchLearnerDetails}
        />
      )}

      {showQuestionnaire === 'initial' && (
        <PositioningQuestionnaire 
          onClose={() => setShowQuestionnaire(null)} 
          readOnly={true}
          type="initial"
          adminResponseData={prepareQuestionnaireData(questionnaireResponses.initial)}
          onSubmitSuccess={fetchLearnerDetails}
        />
      )}

      {showQuestionnaire === 'final' && (
        <PositioningQuestionnaire 
          onClose={() => setShowQuestionnaire(null)} 
          readOnly={true}
          type="final"
          adminResponseData={prepareQuestionnaireData(questionnaireResponses.final)}
          onSubmitSuccess={fetchLearnerDetails}
        />
      )}

      {showQuestionnaire === 'satisfaction' && (
        <SatisfactionQuestionnaire 
          onClose={() => setShowQuestionnaire(null)} 
          readOnly={true}
          adminResponseData={prepareQuestionnaireData(questionnaireResponses.satisfaction)}
          onSubmitSuccess={fetchLearnerDetails}
        />
      )}

      {/* Hidden PDF container */}
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
    