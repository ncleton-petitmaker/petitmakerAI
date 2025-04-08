import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, CheckCircle2, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../LoadingSpinner';

export interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'rating' | 'yes_no';
  options?: string[];
  correct_answer?: string;
  is_required: boolean;
  order_index: number;
}

export interface BaseQuestionnaireProps {
  onClose: () => void;
  readOnly?: boolean;
  type: 'positioning' | 'initial_final_evaluation' | 'satisfaction';
  sous_type?: 'initial' | 'final' | null;
  onSubmitSuccess?: () => void;
  adminResponseData?: any;
  userId?: string;
  trainingId?: string;
  companyStatus?: 'valid' | 'pending' | 'not_found';
}

export interface QuestionnaireState {
  currentStep: number;
  answers: Record<string, any>;
  isSubmitting: boolean;
  error: string | null;
  isLoading: boolean;
  score: number | null;
  questions: Question[];
  templateId: string | null;
  isAvailable: boolean;
  correctAnswers: Record<string, any>;
}

export const BaseQuestionnaire: React.FC<BaseQuestionnaireProps> = ({
  onClose,
  readOnly = false,
  type,
  sous_type = null,
  onSubmitSuccess,
  adminResponseData,
  userId,
  trainingId,
  companyStatus = 'valid'
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState<Record<string, any>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (companyStatus !== 'valid') {
          setIsLoading(false);
          return;
        }
        
        if (adminResponseData) {
          const { data: templateData, error: templateError } = await supabase
            .from('questionnaire_templates')
            .select('id')
            .eq('id', adminResponseData.template_id)
            .single();
            
          if (templateError) throw templateError;
          if (!templateData) throw new Error('No template found');

          const { data: questionData, error: questionsError } = await supabase
            .from('questionnaire_questions')
            .select('*')
            .eq('template_id', templateData.id)
            .order('order_index');

          if (questionsError) throw questionsError;
          if (!questionData || questionData.length === 0) {
            throw new Error('No questions found');
          }
          
          setQuestions(questionData);

          // Ne jamais récupérer les bonnes réponses pour le positionnement
          if (type === 'initial_final_evaluation') {
            const correctAnswersMap: Record<string, any> = {};
            questionData.forEach((question: any) => {
              if (question.correct_answer) {
                correctAnswersMap[question.id] = question.correct_answer;
              }
            });
            setCorrectAnswers(correctAnswersMap);
          } else {
            setCorrectAnswers({});
          }
          
          let userResponses = adminResponseData.responses;
          if (typeof userResponses === 'string') {
            try {
              userResponses = JSON.parse(userResponses);
            } catch (e) {
              userResponses = {};
            }
          }
          
          setAnswers(userResponses || {});
          if (adminResponseData.score !== undefined && type === 'initial_final_evaluation') {
            setScore(adminResponseData.score);
          } else {
            setScore(null);
          }

          setIsLoading(false);
          return;
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

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
        if (!profileData?.training?.id) {
          throw new Error('No training found');
        }

        const trainingIdToUse = profileData.training.id;
        
        const { data: templates, error: templateError } = await supabase
          .from('questionnaire_templates')
          .select('*')
          .eq('type', type)
          .eq('training_id', trainingIdToUse)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (templateError) throw templateError;
        if (!templates || templates.length === 0) {
          throw new Error(`No template found for type: ${type}`);
        }
        
        const template = templates[0];
        setTemplateId(template.id);
        
        const { data: questionData, error: questionsError } = await supabase
          .from('questionnaire_questions')
          .select('*')
          .eq('template_id', template.id)
          .order('order_index');

        if (questionsError) throw questionsError;
        if (!questionData || questionData.length === 0) {
          throw new Error('No questions found');
        }

        setQuestions(questionData);

        // Ne jamais récupérer les bonnes réponses pour le positionnement
        if (type === 'initial_final_evaluation') {
          const correctAnswersMap: Record<string, any> = {};
          questionData.forEach((question: any) => {
            if (question.correct_answer) {
              correctAnswersMap[question.id] = question.correct_answer;
            }
          });
          setCorrectAnswers(correctAnswersMap);
        } else {
          setCorrectAnswers({});
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error in fetchQuestions:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [type, sous_type, companyStatus, adminResponseData]);

  // Correction du compteur de questions
  const totalQuestions = questions.length;
  const currentQuestionNumber = Math.min(currentStep + 1, totalQuestions);
  const progressPercentage = totalQuestions > 1 
    ? Math.min(Math.round((currentStep / (totalQuestions - 1)) * 100), 100)
    : 0;

  const handleAnswer = (questionId: string, answer: any) => {
    // Vérification immédiate si readOnly ou déjà soumis
    if (readOnly || hasSubmitted) return;
    
    console.log('🔍 [DEBUG] Saving answer:', {
      questionId,
      answer,
      type: typeof answer,
      question_type: questions[currentStep]?.question_type
    });
    
    // Mise à jour des réponses de manière synchrone pour éviter les problèmes
    const newAnswers = {
      ...answers,
      [questionId]: answer === 0 ? 0 : answer || ''
    };
    
    // Mettre à jour l'état des réponses immédiatement
    setAnswers(newAnswers);
    
    // Les questions à champ libre n'ont pas de progression automatique
    const isShortAnswer = questions[currentStep]?.question_type === 'short_answer';
    
    // Pour tous les autres types de questions, on progresse automatiquement
    if (!isShortAnswer && currentStep < questions.length - 1) {
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 300);
    }
  };

  // Fonction simplifiée qui ne fait rien, car les réponses sont déjà sauvegardées
  const saveCurrentAnswer = () => {
    // Ne fait rien, les réponses sont déjà enregistrées dans le state via handleAnswer
  };

  const calculateScore = (responses: Record<string, any>) => {
    if (type === 'positioning' || type === 'satisfaction') return null;

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

    // On permet toujours d'avancer pour tous les types de questions
    // L'utilisateur peut revenir en arrière si besoin pour compléter les réponses
    // Le système vérifiera les réponses obligatoires avant la soumission finale
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSubmitted) return;

    try {
      setIsSubmitting(true);
      console.log('🚨 DÉBUT SOUMISSION QUESTIONNAIRE');
      
      // Vérifier d'abord que toutes les questions obligatoires ont été répondues
      const unansweredQuestions = questions
        .filter(q => q.is_required)
        .filter(q => {
          const answer = answers[q.id];
          const isUnanswered = answer === undefined || answer === null || 
            (typeof answer === 'string' && answer.trim() === '');
          
          if (isUnanswered) {
            console.log('❌ Question obligatoire non répondue:', {
              id: q.id,
              text: q.question_text,
              index: q.order_index
            });
          }
          return isUnanswered;
        });

      if (unansweredQuestions.length > 0) {
        // Si des questions obligatoires n'ont pas été répondues, on affiche un message
        // et on positionne l'utilisateur sur la première question sans réponse
        const firstUnansweredIndex = Math.min(...unansweredQuestions.map(q => q.order_index));
        const questionPosition = questions.findIndex(q => q.order_index === firstUnansweredIndex);
        
        if (questionPosition !== -1) {
          setCurrentStep(questionPosition);
        }
        
        const questionList = unansweredQuestions
          .map(q => q.question_text.substring(0, 50) + (q.question_text.length > 50 ? '...' : ''))
          .join('\n- ');
        
        setError(`Veuillez répondre à toutes les questions obligatoires avant de soumettre le questionnaire.\n- ${questionList}`);
        setIsSubmitting(false);
        return;
      }
      
      // 1. Vérifier l'authentification
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ Erreur: Utilisateur non authentifié');
        throw new Error('Vous devez être connecté pour soumettre le questionnaire');
      }
      console.log('✅ Utilisateur authentifié:', user.id);

      // 2. Vérifier le profil et la formation
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('training_id, is_admin')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        console.log('❌ Erreur: Profil non trouvé', profileError);
        throw new Error('Profil utilisateur non trouvé');
      }
      console.log('✅ Profil trouvé:', profileData);

      if (!profileData.training_id) {
        console.log('❌ Erreur: Pas de formation associée');
        throw new Error('Aucune formation associée à votre profil');
      }
      console.log('✅ Formation trouvée:', profileData.training_id);

      // 3. Vérifier le template
      const { data: templateData, error: templateError } = await supabase
        .from('questionnaire_templates')
        .select('training_id')
        .eq('id', templateId)
        .single();

      if (templateError || !templateData) {
        console.log('❌ Erreur: Template non trouvé', templateError);
        throw new Error('Template de questionnaire non trouvé');
      }
      console.log('✅ Template trouvé:', templateData);

      // 4. Vérifier que le template correspond à la formation
      if (templateData.training_id !== profileData.training_id && !profileData.is_admin) {
        console.log('❌ Erreur: Template ne correspond pas à la formation');
        throw new Error('Ce questionnaire ne correspond pas à votre formation');
      }
      console.log('✅ Template correspond à la formation');

      // 5. Vérifier les réponses
      if (Object.keys(answers).length === 0) {
        console.log('❌ Erreur: Aucune réponse trouvée');
        throw new Error('Aucune réponse n\'a été enregistrée');
      }
      console.log('✅ Réponses trouvées:', Object.keys(answers).length);

      // 6. Préparer et envoyer la réponse
      const response = {
        user_id: user.id,
        template_id: templateId,
        training_id: profileData.training_id,
        type: type || 'positioning',
        sous_type: sous_type || null,
        responses: answers,
        score: null
      };

      console.log('📤 Envoi de la réponse:', response);

      const { data: insertData, error: insertError } = await supabase
        .from('questionnaire_responses')
        .insert([response])
        .select();

      if (insertError) {
        console.log('❌ Erreur lors de l\'insertion:', insertError);
        throw insertError;
      }

      console.log('✅ Réponse enregistrée avec succès:', insertData);
      console.log('🚨 FIN SOUMISSION QUESTIONNAIRE');

      setHasSubmitted(true);
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      onClose();
    } catch (error: any) {
      console.log('❌ Erreur finale:', error);
      setError(error.message || 'Une erreur est survenue lors de la soumission');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
        <LoadingSpinner size="small" />
      </div>
    );
  }

  if (companyStatus !== 'valid' && !adminResponseData) {
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
            {type === 'initial_final_evaluation' && sous_type === 'initial' && "Évaluation initiale"}
            {type === 'initial_final_evaluation' && sous_type === 'final' && "Évaluation finale"}
            {type === 'positioning' && "Questionnaire de positionnement"}
            {type === 'satisfaction' && "Questionnaire de satisfaction"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {type === 'initial_final_evaluation' && score !== null && (
          <div className="mx-6 mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Score {sous_type === 'initial' ? 'initial' : 'final'}</h3>
              <p className="text-blue-400">{score}% de bonnes réponses</p>
            </div>
            <Trophy className="w-10 h-10 text-blue-500" />
          </div>
        )}

        <div className="mx-6 mt-4 mb-2">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>Question {currentQuestionNumber} sur {totalQuestions}</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500" 
              style={{ width: `${progressPercentage}%` }}
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
                  <p className="text-lg text-white">
                    {questions[currentStep]?.question_text}
                    {questions[currentStep]?.is_required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </p>

                  {questions[currentStep]?.question_type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {questions[currentStep].options?.map((option) => {
                        const isUserAnswer = answers[questions[currentStep].id] === option;
                        
                        // Pour les questionnaires de positionnement, on utilise un rendu simplifié
                        if (type === 'positioning') {
                          return (
                            <label
                              key={option}
                              className={`flex items-center space-x-3 p-4 rounded-lg border ${
                                isUserAnswer 
                                  ? 'bg-blue-500/20 border-blue-500/50'
                                  : 'border-gray-800 hover:border-gray-700'
                              } cursor-pointer transition-colors`}
                              onClick={() => handleAnswer(questions[currentStep].id, option)}
                            >
                              <input
                                type="radio"
                                name={`question-${questions[currentStep].id}`}
                                value={option}
                                checked={isUserAnswer}
                                onChange={() => handleAnswer(questions[currentStep].id, option)}
                                disabled={readOnly}
                                className="hidden"
                              />
                              <div
                                className={`w-4 h-4 rounded-full border ${
                                  isUserAnswer
                                    ? 'border-blue-500 bg-blue-500'
                                    : 'border-gray-600'
                                }`}
                              >
                                {isUserAnswer && (
                                  <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                                )}
                              </div>
                              <span className="text-white">{option}</span>
                            </label>
                          );
                        }

                        // Pour les autres types de questionnaires, on garde la logique existante
                        const isCorrectAnswer = correctAnswers[questions[currentStep].id] === option;
                        const showCorrectAnswer = readOnly;
                        
                        return (
                          <label
                            key={option}
                            className={`flex items-center space-x-3 p-4 rounded-lg border ${
                              isUserAnswer && isCorrectAnswer
                                ? 'bg-green-500/20 border-green-500/50'
                                : isUserAnswer && !isCorrectAnswer
                                ? 'bg-red-500/20 border-red-500/50'
                                : showCorrectAnswer && isCorrectAnswer
                                ? 'bg-green-500/10 border-green-500/50'
                                : 'border-gray-800 hover:border-gray-700'
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
                                isUserAnswer
                                  ? isCorrectAnswer
                                    ? 'border-green-500 bg-green-500'
                                    : 'border-red-500 bg-red-500'
                                  : showCorrectAnswer && isCorrectAnswer
                                  ? 'border-green-500 bg-green-500'
                                  : 'border-gray-600'
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
                        
                        // Pour les questionnaires de positionnement, on utilise un rendu simplifié
                        if (type === 'positioning') {
                          return (
                            <button
                              key={value}
                              type="button"
                              disabled={readOnly}
                              onClick={() => handleAnswer(questions[currentStep].id, value)}
                              className={`px-6 py-3 rounded-lg font-medium ${
                                isUserAnswer
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                              }`}
                            >
                              <span>{value}</span>
                            </button>
                          );
                        }

                        // Pour les autres types de questionnaires, on garde la logique existante
                        const isCorrectAnswer = correctAnswers[questions[currentStep].id] === value;
                        const showCorrectAnswer = readOnly;
                        
                        return (
                          <button
                            key={value}
                            type="button"
                            disabled={readOnly}
                            onClick={() => handleAnswer(questions[currentStep].id, value)}
                            className={`px-6 py-3 rounded-lg font-medium ${
                              isUserAnswer && isCorrectAnswer
                                ? 'bg-green-500 text-white'
                                : isUserAnswer && !isCorrectAnswer
                                ? 'bg-red-500 text-white'
                                : showCorrectAnswer && isCorrectAnswer
                                ? 'bg-green-500/50 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
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
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          onClick={() => handleAnswer(questions[currentStep].id, value)}
                          disabled={readOnly}
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium ${
                            answers[questions[currentStep].id] === value
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
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

                {type === 'initial_final_evaluation' && readOnly && score !== null && currentStep === questions.length - 1 && (
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
            onClick={() => {
              setCurrentStep((prev) => prev - 1);
            }}
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
              onClick={() => {
                setCurrentStep((prev) => prev + 1);
              }}
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