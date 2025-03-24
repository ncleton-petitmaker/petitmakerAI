import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, CheckCircle2, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'rating' | 'yes_no';
  options?: string[];
  correct_answer?: string;
  is_required: boolean;
}

interface PositioningQuestionnaireProps {
  onClose: () => void;
  readOnly?: boolean;
  type?: 'initial' | 'final' | null;
  onSubmitSuccess?: () => void;
  adminResponseData?: any;
  companyStatus?: 'valid' | 'pending' | 'not_found';
}

export const PositioningQuestionnaire: React.FC<PositioningQuestionnaireProps> = ({ 
  onClose, 
  readOnly = false, 
  type = null, 
  onSubmitSuccess,
  adminResponseData,
  companyStatus = 'valid'
}) => {
  console.log('PositioningQuestionnaire - Props:', { 
    readOnly, 
    type, 
    hasAdminData: !!adminResponseData,
    adminResponseDataDetails: adminResponseData ? JSON.stringify(adminResponseData).substring(0, 100) + '...' : 'none'
  });
  
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [hasSousTypeColumn, setHasSousTypeColumn] = useState<boolean | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // If company is not validated, don't fetch questions
        if (companyStatus !== 'valid') {
          console.log('🔍 [DEBUG] Company not validated, skipping question fetch');
          setIsLoading(false);
          return;
        }
        
        // Si nous avons des données d'admin, utiliser ces données directement
        if (adminResponseData) {
          console.log('🔍 [DEBUG] Using admin response data:', adminResponseData);
          
          // Récupérer les questions depuis les données admin
          const { data: templateData, error: templateError } = await supabase
            .from('questionnaire_templates')
            .select('id')
            .eq('id', adminResponseData.template_id)
            .single();
            
          if (templateError) {
            console.error('🔍 [DEBUG] Error fetching template from admin data:', templateError);
            throw templateError;
          }
          
          if (!templateData) {
            console.error('🔍 [DEBUG] No template found for admin data');
            throw new Error('No template found');
          }

          // Récupérer les questions associées au template
          const { data: questionData, error: questionsError } = await supabase
            .from('questionnaire_questions')
            .select('*')
            .eq('template_id', templateData.id)
            .order('order_index');

          if (questionsError) {
            console.error('🔍 [DEBUG] Error fetching questions:', questionsError);
            throw questionsError;
          }

          if (!questionData || questionData.length === 0) {
            console.error('🔍 [DEBUG] No questions found for template:', templateData.id);
            throw new Error('No questions found');
          }
          
          console.log('🔍 [DEBUG] Loaded', questionData.length, 'questions for template from admin data');
          setQuestions(questionData);

          // Récupérer les bonnes réponses pour chaque question
          const correctAnswersMap: Record<string, any> = {};
          questionData.forEach((question: any) => {
            if (question.correct_answer) {
              correctAnswersMap[question.id] = question.correct_answer;
            }
          });
          
          console.log('🔍 [DEBUG] Correct answers:', correctAnswersMap);
          setCorrectAnswers(correctAnswersMap);
          
          // Extraire les réponses de l'utilisateur
          let userResponses = adminResponseData.responses;
          
          // Si les réponses sont une chaîne, les parser en JSON
          if (typeof userResponses === 'string') {
            try {
              userResponses = JSON.parse(userResponses);
              console.log('🔍 [DEBUG] Parsed responses from string:', userResponses);
            } catch (e) {
              console.error('🔍 [DEBUG] Error parsing responses:', e);
              userResponses = {};
            }
          }
          
          console.log('🔍 [DEBUG] Setting answers from admin data:', userResponses);
          setAnswers(userResponses || {});
          
          // Définir le score si disponible
          if (adminResponseData.score !== undefined && adminResponseData.score !== null) {
            console.log('🔍 [DEBUG] Setting score from admin data:', adminResponseData.score);
            setScore(adminResponseData.score);
          }

          setIsLoading(false);
          return;
        }
        
        // Récupérer l'utilisateur connecté
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        // Vérifier si la colonne sous_type existe
        await checkTableColumns();
        
        // Déterminer le type de questionnaire à rechercher
        const templateType = (type === 'initial' || type === 'final') 
          ? 'initial_final_evaluation'
          : 'positioning';
        console.log('🔍 [DEBUG] Recherche de template de type:', templateType);
        
        // Récupérer le training ID depuis l'URL si disponible
        const urlParams = new URLSearchParams(window.location.search);
        const trainingId = urlParams.get('training_id');
        console.log('🔍 [DEBUG] Found training ID:', trainingId);
        
        // Récupérer le template de questionnaire
        const { data: templates, error: templateError } = await supabase
          .from('questionnaire_templates')
          .select('*')
          .eq('type', templateType)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (templateError) {
          console.error('🔍 [DEBUG] Error fetching template:', templateError);
          throw templateError;
        }
        
        if (!templates || templates.length === 0) {
          console.error('🔍 [DEBUG] No template found for type:', templateType);
          throw new Error(`No template found for type: ${templateType}`);
        }
        
        // Utiliser le premier template actif
        const template = templates[0];
        console.log('🔍 [DEBUG] Using template:', template.id);
        setTemplateId(template.id);
        
        // Récupérer les questions du template
        const { data: questionData, error: questionsError } = await supabase
          .from('questionnaire_questions')
          .select('*')
          .eq('template_id', template.id)
          .order('order_index');

        if (questionsError) {
          console.error('🔍 [DEBUG] Error fetching questions:', questionsError);
          throw questionsError;
        }
        
        if (!questionData || questionData.length === 0) {
          console.error('🔍 [DEBUG] No questions found for template:', template.id);
          throw new Error('No questions found');
        }

        console.log('🔍 [DEBUG] Loaded', questionData.length, 'questions');
        setQuestions(questionData);
        
        // Récupérer les bonnes réponses pour chaque question
        const correctAnswersMap: Record<string, any> = {};
        questionData.forEach((question: any) => {
          if (question.correct_answer) {
            correctAnswersMap[question.id] = question.correct_answer;
          }
        });
        
        console.log('🔍 [DEBUG] Correct answers:', correctAnswersMap);
        setCorrectAnswers(correctAnswersMap);

        // If in readOnly mode, fetch previous answers
        if (readOnly) {
          // Déterminer le type de réponse à rechercher
          const responseType = (type === 'initial' || type === 'final') 
            ? 'initial_final_evaluation'
            : 'positioning';
          
          // Ajouter un champ sous_type pour distinguer entre évaluation initiale et finale
          const sousType = type === 'initial' ? 'initial' : type === 'final' ? 'final' : null;
          
          console.log('🔍 [DEBUG] In readOnly mode, fetching answers for user:', user.id, 'template:', template.id, 'type:', responseType, 'sous_type:', sousType, 'hasSousTypeColumn:', hasSousTypeColumn);
          
          // Pour des raisons de débogage, récupérer toutes les réponses d'abord
          const allResponsesQuery = supabase
            .from('questionnaire_responses')
            .select('*')
            .eq('user_id', user.id);
            
          const { data: allResponses, error: allResponsesError } = await allResponsesQuery;
          
          console.log('🔍 [DEBUG] All user responses:', allResponses ? allResponses.length : 0);
          console.log('🔍 [DEBUG] CURRENT TYPE:', type);
          
          if (allResponses) {
            allResponses.forEach(r => {
              const isRelevant = (r.type === responseType) && 
                                  (!hasSousTypeColumn || !sousType || r.sous_type === sousType);
              console.log('🔍 [DEBUG] Response:', r.id, 
                        'type:', r.type, 
                        'sous_type:', r.sous_type, 
                        'score:', r.score,
                        'isRelevant:', isRelevant,
                        'current type:', type);
            });
          }
          
          // Construire la requête de base pour récupérer les réponses
          // IMPORTANT: Nous devons récupérer les réponses spécifiques au type (initial ou final)
          let queryBuilder = supabase
            .from('questionnaire_responses')
            .select('id, responses, score, sous_type, template_id')
            .eq('user_id', user.id)
            .eq('type', responseType);
            
          // Filtrer strictement par sous_type si nous sommes en mode initial ou final
          if (hasSousTypeColumn && sousType) {
            console.log('🔍 [DEBUG] Filtering strictly by sous_type:', sousType);
            queryBuilder = queryBuilder.eq('sous_type', sousType);
          }
          
          // Exécuter la requête
          const { data: responsesFiltered, error: responsesFilteredError } = await queryBuilder;
          
          if (responsesFilteredError) {
            console.error('🔍 [DEBUG] Error fetching filtered responses:', responsesFilteredError);
          }
          
          console.log('🔍 [DEBUG] Responses filtered by type and sous_type:', 
                    responsesFiltered ? responsesFiltered.length : 0, 
                    'results for type:', responseType, 
                    'sous_type:', sousType);
                    
          if (responsesFiltered && responsesFiltered.length > 0) {
            // Log all found responses 
            responsesFiltered.forEach((r, i) => {
              // Cast le type pour accéder à sous_type en toute sécurité
              const responseWithSousType = r as any;
              console.log(`🔍 [DEBUG] Filtered response ${i}:`, r.id, 'score:', r.score, 'sous_type:', responseWithSousType.sous_type, 'template_id:', r.template_id);
            });
            
            // Sélectionner la bonne réponse selon le type
            let selectedResponse;
            
            // Pour le type final, nous voulons spécifiquement la réponse avec sous_type = 'final'
            if (type === 'final') {
              selectedResponse = responsesFiltered.find(r => !hasSousTypeColumn || (r as any).sous_type === 'final');
              console.log('🔍 [DEBUG] Selected FINAL response:', selectedResponse?.id, 'score:', selectedResponse?.score);
            } 
            // Pour le type initial, nous voulons spécifiquement la réponse avec sous_type = 'initial'
            else if (type === 'initial') {
              selectedResponse = responsesFiltered.find(r => !hasSousTypeColumn || (r as any).sous_type === 'initial');
              console.log('🔍 [DEBUG] Selected INITIAL response:', selectedResponse?.id, 'score:', selectedResponse?.score);
            } 
            // Pour le questionnaire de positionnement
            else {
              selectedResponse = responsesFiltered[0];
            }
            
            if (selectedResponse) {
              console.log('🔍 [DEBUG] Using selected response:', selectedResponse.id, 'score:', selectedResponse.score);
              
              // S'assurer que answers est bien un objet
              const answersObj = typeof selectedResponse.responses === 'string' 
                ? JSON.parse(selectedResponse.responses) 
                : selectedResponse.responses;
                
              console.log('🔍 [DEBUG] Setting answers state with:', answersObj);
              setAnswers(answersObj || {});
              setScore(selectedResponse.score);
            } else {
              console.log('🔍 [DEBUG] No response selected for type:', type);
              
              // Utiliser la première réponse filtrée comme secours
              const fallbackResponse = responsesFiltered[0];
              console.log('🔍 [DEBUG] Using fallback response:', fallbackResponse.id, 'score:', fallbackResponse.score);
              
              // S'assurer que answers est bien un objet
              const answersObj = typeof fallbackResponse.responses === 'string' 
                ? JSON.parse(fallbackResponse.responses) 
                : fallbackResponse.responses;
                
              console.log('🔍 [DEBUG] Setting answers state with fallback:', answersObj);
              setAnswers(answersObj || {});
              setScore(fallbackResponse.score);
            }
          } else {
            console.log('🔍 [DEBUG] No responses found with filters');
          }
          
          // Maintenant avec template_id
          queryBuilder = queryBuilder.eq('template_id', template.id);
          
          // Exécuter la requête avec template_id
          const { data: responsesData, error: responsesError } = await queryBuilder;

          console.log('🔍 [DEBUG] Responses without template filter:', responsesFiltered ? responsesFiltered.length : 0);
          console.log('🔍 [DEBUG] Responses with template filter:', responsesData ? responsesData.length : 0);
          
          if (responsesError) {
            console.error('🔍 [DEBUG] Error fetching previous answers:', responsesError);
          }
          
          if (responsesData && responsesData.length > 0) {
            const responses = responsesData[0]; // Prendre le premier résultat
            console.log('🔍 [DEBUG] Found previous answers:', 
                        Object.keys(responses.responses || {}).length, 
                        'answers for template', template.id);
            console.log('🔍 [DEBUG] Previous answers content:', JSON.stringify(responses.responses).substring(0, 200) + '...');
            console.log('🔍 [DEBUG] Previous answers score:', responses.score);
            console.log('🔍 [DEBUG] Response ID:', responses.id);
            
            // S'assurer que answers est bien un objet
            const answersObj = typeof responses.responses === 'string' 
              ? JSON.parse(responses.responses) 
              : responses.responses;
            
            console.log('🔍 [DEBUG] Setting answers state with:', answersObj);
            setAnswers(answersObj || {});
            setScore(responses.score);
          } else if (responsesFiltered && responsesFiltered.length > 0) {
            // Si aucune réponse n'a été trouvée avec le template_id, utiliser les réponses filtrées
            console.log('🔍 [DEBUG] Using answers filtered by type');
            const responses = responsesFiltered[0];
            
            // S'assurer que answers est bien un objet
            const answersObj = typeof responses.responses === 'string'
              ? JSON.parse(responses.responses)
              : responses.responses;
              
            console.log('🔍 [DEBUG] Setting answers state with (filtered):', answersObj);
            setAnswers(answersObj || {});
            setScore(responses.score);
          } else {
            console.log('🔍 [DEBUG] No previous answers found for template', template.id);
          }
        }
        
        setIsLoading(false);
        console.log('🔍 [DEBUG] fetchQuestions - END');
      } catch (error) {
        console.error('Error in fetchQuestions:', error);
        setError('Une erreur est survenue lors du chargement des questions.');
        setIsLoading(false);
      }
    };

    // Fonction pour vérifier si la colonne sous_type existe
    const checkTableColumns = async () => {
      try {
        // Vérifier si la colonne sous_type existe en interrogeant un enregistrement
        const { data, error } = await supabase
          .from('questionnaire_responses')
          .select('*')
          .limit(1);
          
        if (error) {
          console.error('🔍 [DEBUG] Error checking table columns:', error);
          setHasSousTypeColumn(true); // Par défaut, supposer que la colonne existe
          return;
        }
        
        // Si nous avons des données, vérifier si sous_type existe dans le premier enregistrement
        if (data && data.length > 0) {
          const hasColSousType = 'sous_type' in data[0];
          console.log('🔍 [DEBUG] Colonne sous_type existe:', hasColSousType);
          setHasSousTypeColumn(hasColSousType);
        } else {
          // Par défaut, supposer que la colonne existe
          console.log('🔍 [DEBUG] Aucune donnée pour vérifier la colonne sous_type, supposer qu\'elle existe');
          setHasSousTypeColumn(true);
        }
      } catch (error) {
        console.error('🔍 [DEBUG] Error in checkTableColumns:', error);
        // Par défaut, supposer que la colonne existe
        setHasSousTypeColumn(true);
      }
    };

    fetchQuestions();
  }, [readOnly, type, adminResponseData, hasSousTypeColumn, companyStatus]);

  const handleAnswer = async (questionId: string, answer: any) => {
    if (readOnly) return;
    
    const newAnswers = {
      ...answers,
      [questionId]: answer
    };
    
    setAnswers(newAnswers);

    // Auto-advance for multiple choice and yes/no questions
    const currentQuestion = questions[currentStep];
    if (currentQuestion && 
        (currentQuestion.question_type === 'multiple_choice' || 
         currentQuestion.question_type === 'yes_no' ||
         currentQuestion.question_type === 'rating')) {
      if (currentStep < questions.length - 1) {
        setTimeout(() => {
          setCurrentStep(currentStep + 1);
        }, 300);
      }
    }
  };

  const calculateScore = (responses: Record<string, any>) => {
    if (!type || (type !== 'initial' && type !== 'final')) return 0;

    let correct = 0;
    let total = questions.length;

    questions.forEach(question => {
      if (responses[question.id] !== undefined && 
          responses[question.id] !== null && 
          responses[question.id] === question.correct_answer) {
        correct++;
      }
    });

    return Math.round((correct / total) * 100);
  };

  const canProceed = () => {
    if (readOnly) return true;
    
    const currentQuestion = questions[currentStep];
    if (!currentQuestion) return false;

    const answer = answers[currentQuestion.id];
    
    // For text answers, allow proceeding if there's any input
    if (currentQuestion.question_type === 'short_answer') {
      return true;
    }
    
    // For other types, require an answer
    return answer !== undefined && answer !== null && answer !== '';
  };

  const handleSubmit = async () => {
    try {
      console.log('🔍 [DEBUG] handleSubmit - START', { type, templateId, readOnly });
      setIsSubmitting(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      console.log('🔍 [DEBUG] Submitting for user:', user.id);

      const finalScore = type === 'initial' || type === 'final' ? calculateScore(answers) : null;
      console.log('🔍 [DEBUG] Calculated score:', finalScore);

      // Déterminer le type d'enregistrement
      const responseType = (type === 'initial' || type === 'final') 
        ? 'initial_final_evaluation'
        : 'positioning';
      
      // Ajouter un champ sous_type pour distinguer entre évaluation initiale et finale
      const sousType = type === 'initial' ? 'initial' : type === 'final' ? 'final' : null;
      
      console.log('🔍 [DEBUG] Saving response with type:', responseType, 'and sous_type:', sousType, 'hasSousTypeColumn:', hasSousTypeColumn);

      // Vérifier si une réponse existe déjà
      console.log('🔍 [DEBUG] Checking for existing response - user:', user.id, 'type:', responseType);
      const queryBuilder = supabase
        .from('questionnaire_responses')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', responseType)
        .eq('template_id', templateId);
      
      // Ajouter le filtrage par sous-type si nécessaire et si la colonne existe
      if (sousType && hasSousTypeColumn) {
        queryBuilder.eq('sous_type', sousType);
      }
        
      const { data: existingResponse, error: fetchError } = await queryBuilder.maybeSingle();

      if (fetchError) throw fetchError;

      console.log('🔍 [DEBUG] Existing response check result:', existingResponse ? `Found ID: ${existingResponse.id}` : 'No existing response');

      let submitError;
      if (existingResponse) {
        // Mettre à jour la réponse existante
        console.log('🔍 [DEBUG] Updating existing response:', existingResponse.id);
        const { error } = await supabase
          .from('questionnaire_responses')
          .update({
            responses: answers,
            score: finalScore,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingResponse.id);
        submitError = error;
        if (error) {
          console.error('🔍 [DEBUG] Error updating response:', error);
        } else {
          console.log('🔍 [DEBUG] Response updated successfully');
        }
      } else {
        // Créer une nouvelle réponse
        console.log('🔍 [DEBUG] Creating new response');
        const responseData: {
          user_id: string;
          type: string;
          responses: Record<string, any>;
          score: number | null;
          template_id: string | null;
          sous_type?: string;
        } = {
          user_id: user.id,
          type: responseType,
          responses: answers,
          score: finalScore,
          template_id: templateId
        };
        
        // Ajouter le sous-type si nécessaire et si la colonne existe
        if (sousType && hasSousTypeColumn) {
          responseData.sous_type = sousType;
        }
        
        const { error, data } = await supabase
          .from('questionnaire_responses')
          .insert(responseData)
          .select();
        submitError = error;
        if (error) {
          console.error('🔍 [DEBUG] Error creating response:', error);
        } else {
          console.log('🔍 [DEBUG] Response created successfully:', data);
        }
      }

      if (submitError) throw submitError;

      // Update user profile
      const profileUpdate: any = {};
      if (type === 'initial') {
        profileUpdate.initial_evaluation_completed = true;
        profileUpdate.initial_evaluation_score = finalScore;
      } else if (type === 'final') {
        profileUpdate.final_evaluation_completed = true;
        profileUpdate.final_evaluation_score = finalScore;
      } else {
        profileUpdate.questionnaire_completed = true;
      }

      console.log('🔍 [DEBUG] Updating user profile:', profileUpdate);
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update(profileUpdate)
        .eq('id', user.id);

      if (profileError) {
        console.error('🔍 [DEBUG] Error updating profile:', profileError);
        throw profileError;
      } else {
        console.log('🔍 [DEBUG] Profile updated successfully');
      }

      console.log('🔍 [DEBUG] Questionnaire submission successful, calling onSubmitSuccess if provided');
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }

      console.log('🔍 [DEBUG] handleSubmit - END, closing questionnaire');
      onClose();
    } catch (error) {
      console.error('Error submitting questionnaire:', error);
      setError('Une erreur est survenue lors de l\'enregistrement de vos réponses.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Don't show an error if company status is not valid, just close silently
  if (companyStatus !== 'valid') {
    console.log('🔍 [DEBUG] Not showing questionnaire because company is not valid');
    
    // If it's an admin view (with adminResponseData), still allow viewing
    if (adminResponseData) {
      console.log('🔍 [DEBUG] Admin view detected, allowing questionnaire display');
    } else {
      // For non-admin views, show a helpful message and close
      return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl p-8 max-w-lg w-full">
            <div className="flex flex-col items-center mb-6">
              <div className="mb-4 bg-amber-500/10 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Questionnaires non disponibles</h2>
              <p className="text-gray-300 text-center">
                Les questionnaires seront disponibles une fois que votre entreprise sera validée et associée à une formation.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Fermer
            </button>
          </div>
        </div>
      );
    }
  }

  if (error || questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-xl p-8 max-w-lg w-full">
          <h2 className="text-xl font-semibold text-white mb-4">Erreur</h2>
          <p className="text-gray-300 mb-6">
            {error || "Aucune question n'est disponible pour ce questionnaire."}
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 flex items-center justify-between border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">
            {type === 'initial' ? "Évaluation initiale" :
             type === 'final' ? "Évaluation finale" :
             "Questionnaire de positionnement"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {(type === 'initial' || type === 'final' || type === null) && score !== null && (
          <div className="mx-6 mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Score {type === 'initial' ? 'initial' : type === 'final' ? 'final' : 'de positionnement'}</h3>
              <p className="text-blue-400">
                {type === 'initial' || type === 'final' 
                  ? `${score}% de bonnes réponses` 
                  : `${score}% de correspondance avec les réponses attendues`}
              </p>
            </div>
            <Trophy className="w-10 h-10 text-blue-500" />
          </div>
        )}

        <div className="mx-6 mt-4 mb-2">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>Question {currentStep + 1} sur {questions.length}</span>
            <span>{Math.round((currentStep / (questions.length - 1)) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500" 
              style={{ width: `${(currentStep / (questions.length - 1)) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-4">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <p className="text-lg text-white">{questions[currentStep]?.question_text}</p>

                  {questions[currentStep]?.question_type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {questions[currentStep].options?.map((option) => {
                        const isUserAnswer = answers[questions[currentStep].id] === option;
                        const isCorrectAnswer = correctAnswers[questions[currentStep].id] === option;
                        const showCorrectAnswer = type === 'final' && readOnly;
                        const isEvaluation = type === 'initial' || type === 'final';
                        
                        return (
                          <label
                            key={option}
                            className={`flex items-center space-x-3 p-4 rounded-lg border ${
                              isEvaluation ? (
                                isUserAnswer && isCorrectAnswer
                                  ? 'bg-green-500/20 border-green-500/50'
                                  : isUserAnswer && !isCorrectAnswer
                                  ? 'bg-red-500/20 border-red-500/50'
                                  : showCorrectAnswer && isCorrectAnswer
                                  ? 'bg-green-500/10 border-green-500/50'
                                  : 'border-gray-800 hover:border-gray-700'
                              ) : (
                                isUserAnswer 
                                  ? 'bg-blue-500/20 border-blue-500/50'
                                  : 'border-gray-800 hover:border-gray-700'
                              )
                            } cursor-pointer transition-colors`}
                            onClick={() => !readOnly && handleAnswer(questions[currentStep].id, option)}
                          >
                            <input
                              type="radio"
                              value={option}
                              checked={isUserAnswer}
                              onChange={() => {}}
                              disabled={readOnly}
                              className="hidden"
                            />
                            <div
                              className={`w-4 h-4 rounded-full border ${
                                isEvaluation ? (
                                  isUserAnswer
                                    ? isCorrectAnswer
                                      ? 'border-green-500 bg-green-500'
                                      : 'border-red-500 bg-red-500'
                                    : showCorrectAnswer && isCorrectAnswer
                                    ? 'border-green-500 bg-green-500'
                                    : 'border-gray-600'
                                ) : (
                                  isUserAnswer
                                    ? 'border-blue-500 bg-blue-500'
                                    : 'border-gray-600'
                                )
                              }`}
                            >
                              {(isUserAnswer || (showCorrectAnswer && isCorrectAnswer)) && (
                                <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                              )}
                            </div>
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-white">{option}</span>
                              
                              {showCorrectAnswer && (
                                <div className="ml-2">
                                  {isCorrectAnswer && !isUserAnswer && (
                                    <span className="text-green-400 text-sm font-medium">Bonne réponse</span>
                                  )}
                                  
                                  {isUserAnswer && !isCorrectAnswer && (
                                    <span className="text-red-400 text-sm font-medium">Votre réponse est incorrecte</span>
                                  )}
                                  
                                  {isUserAnswer && isCorrectAnswer && (
                                    <span className="text-green-400 text-sm font-medium">Correct ✓</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {questions[currentStep]?.question_type === 'yes_no' && (
                    <div className="flex items-center space-x-4">
                      {['Oui', 'Non'].map((value) => {
                        const isUserAnswer = answers[questions[currentStep].id] === value;
                        const isCorrectAnswer = correctAnswers[questions[currentStep].id] === value;
                        const showCorrectAnswer = type === 'final' && readOnly;
                        const isEvaluation = type === 'initial' || type === 'final';
                        
                        return (
                          <button
                            key={value}
                            type="button"
                            disabled={readOnly}
                            onClick={() => handleAnswer(questions[currentStep].id, value)}
                            className={`px-6 py-3 rounded-lg font-medium ${
                              isEvaluation ? (
                                isUserAnswer && isCorrectAnswer
                                  ? 'bg-green-500 text-white'
                                  : isUserAnswer && !isCorrectAnswer
                                  ? 'bg-red-500 text-white'
                                  : showCorrectAnswer && isCorrectAnswer
                                  ? 'bg-green-500/50 text-white'
                                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                              ) : (
                                isUserAnswer
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                              )
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span>{value}</span>
                              
                              {showCorrectAnswer && (
                                <span className="text-xs mt-1">
                                  {isCorrectAnswer && !isUserAnswer && "Bonne réponse"}
                                  {isUserAnswer && !isCorrectAnswer && "Incorrect"}
                                  {isUserAnswer && isCorrectAnswer && "Correct ✓"}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {questions[currentStep]?.question_type === 'rating' && (
                    <div className="flex justify-between items-center">
                      {[1, 2, 3, 4, 5].map((value) => {
                        const isEvaluation = type === 'initial' || type === 'final';
                        return (
                          <button
                            key={value}
                            onClick={() => handleAnswer(questions[currentStep].id, value)}
                            disabled={readOnly}
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium ${
                              answers[questions[currentStep].id] === value
                                ? isEvaluation ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {questions[currentStep]?.question_type === 'short_answer' && (
                    <textarea
                      value={answers[questions[currentStep].id] || ''}
                      onChange={(e) => handleAnswer(questions[currentStep].id, e.target.value)}
                      disabled={readOnly}
                      className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-4 text-white resize-none focus:outline-none focus:border-blue-500"
                      placeholder="Votre réponse..."
                    />
                  )}
                </div>

                {(type === 'initial' || type === 'final') && readOnly && score !== null && currentStep === questions.length - 1 && (
                  <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white">Score final</h3>
                      <p className="text-blue-400">Vous avez obtenu {score}% de bonnes réponses</p>
                    </div>
                    <Trophy className="w-12 h-12 text-blue-500" />
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-gray-800 flex justify-between">
          <button
            onClick={() => setCurrentStep((prev) => prev - 1)}
            disabled={currentStep === 0}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Précédent</span>
          </button>

          {currentStep === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || readOnly}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
            >
              {isSubmitting ? (
                <LoadingSpinner size="small" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              <span>Terminer</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              disabled={!canProceed()}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
            >
              <span>Suivant</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};