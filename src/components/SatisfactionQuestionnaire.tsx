import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SatisfactionQuestionnaireProps {
  onClose: () => void;
  readOnly?: boolean;
  onSubmitSuccess?: () => void;
  userId?: string;
  adminResponseData?: any;
}

const questions = [
  {
    id: 'overall_satisfaction',
    text: 'Quelle est votre satisfaction globale concernant la formation ?',
    type: 'rating',
    max: 5
  },
  {
    id: 'content_quality',
    text: 'Comment évaluez-vous la qualité du contenu de la formation ?',
    type: 'rating',
    max: 5
  },
  {
    id: 'trainer_quality',
    text: 'Comment évaluez-vous la qualité du formateur ?',
    type: 'rating',
    max: 5
  },
  {
    id: 'pace_appropriateness',
    text: 'Le rythme de la formation était-il adapté ?',
    type: 'rating',
    max: 5
  },
  {
    id: 'practical_exercises',
    text: 'Les exercices pratiques étaient-ils pertinents ?',
    type: 'rating',
    max: 5
  },
  {
    id: 'objectives_met',
    text: 'Dans quelle mesure les objectifs de la formation ont-ils été atteints ?',
    type: 'rating',
    max: 5
  },
  {
    id: 'skills_improvement',
    text: 'Comment évaluez-vous l\'amélioration de vos compétences ?',
    type: 'rating',
    max: 5
  },
  {
    id: 'strengths',
    text: 'Quels sont les points forts de la formation ?',
    type: 'text'
  },
  {
    id: 'improvements',
    text: 'Quels aspects pourraient être améliorés ?',
    type: 'text'
  },
  {
    id: 'recommend',
    text: 'Recommanderiez-vous cette formation ?',
    type: 'rating',
    max: 5
  },
  {
    id: 'additional_comments',
    text: 'Avez-vous des commentaires supplémentaires ?',
    type: 'text'
  }
];

export const SatisfactionQuestionnaire: React.FC<SatisfactionQuestionnaireProps> = ({ onClose, readOnly = false, onSubmitSuccess, userId, adminResponseData }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentQuestion = questions[currentStep];

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        
        // Si adminResponseData est fourni, l'utiliser directement
        if (readOnly && adminResponseData) {
          console.log("Using admin provided response data:", adminResponseData);
          
          try {
            // Récupérer les réponses
            let responseData = adminResponseData.responses || {};
            
            // Si responseData est une chaîne, essayer de la parser en JSON
            if (typeof responseData === 'string') {
              try {
                responseData = JSON.parse(responseData);
                console.log("Parsed satisfaction responses from string:", responseData);
              } catch (e) {
                console.error("Error parsing satisfaction responses:", e);
                responseData = {};
              }
            }
            
            console.log("Setting answers from admin satisfaction data:", responseData);
            console.log("Response data type:", typeof responseData);
            console.log("Response data keys:", Object.keys(responseData));
            
            // Formater les réponses
            const formattedAnswers: Record<string, any> = {};
            
            // Parcourir toutes les questions pour s'assurer que chaque question a une réponse
            questions.forEach(question => {
              if (responseData[question.id] !== undefined) {
                formattedAnswers[question.id] = responseData[question.id];
              } else {
                // Valeur par défaut si la réponse n'existe pas
                if (question.type === 'text') {
                  formattedAnswers[question.id] = 'Pas de réponse';
                } else if (question.type === 'rating') {
                  formattedAnswers[question.id] = 0;
                }
              }
            });
            
            console.log("Formatted satisfaction answers from admin data:", formattedAnswers);
            setAnswers(formattedAnswers);
          } catch (error) {
            console.error("Error processing admin response data:", error);
            // En cas d'erreur, initialiser avec des réponses vides
            const emptyAnswers: Record<string, any> = {};
            questions.forEach(question => {
              if (question.type === 'text') {
                emptyAnswers[question.id] = 'Pas de réponse';
              } else if (question.type === 'rating') {
                emptyAnswers[question.id] = 0;
              }
            });
            setAnswers(emptyAnswers);
          }
          
          setIsLoading(false);
          return;
        }
        
        // Si userId est fourni, l'utiliser (cas de l'admin visualisant les réponses d'un apprenant)
        // Sinon, récupérer l'utilisateur connecté (cas de l'apprenant visualisant ses propres réponses)
        let userIdToUse = userId;
        
        if (!userIdToUse) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.error("No user found");
            setError('Utilisateur non trouvé');
            setIsLoading(false);
            return;
          }
          userIdToUse = user.id;
        }

        console.log("Fetching satisfaction questionnaire data for user:", userIdToUse);

        // If in readOnly mode, fetch the user's answers
        if (readOnly) {
          // Vérifier si l'utilisateur a complété le questionnaire de satisfaction
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('satisfaction_completed')
            .eq('id', userIdToUse)
            .single();
            
          if (profileError) {
            console.error("Error fetching profile data:", profileError);
          } else {
            console.log("Profile data for satisfaction:", profileData);
          }
          
          // Récupérer les réponses du questionnaire de satisfaction
          console.log("Fetching satisfaction responses for user:", userIdToUse);
          const { data: responsesData, error: responsesError } = await supabase
            .from('satisfaction_responses')
            .select('*')
            .eq('user_id', userIdToUse);
            
          if (responsesError) {
            console.error("Error fetching satisfaction responses:", responsesError);
          }
          
          console.log("Satisfaction responses data:", responsesData);
          
          if (responsesData && responsesData.length > 0) {
            // Get the responses from the jsonb field
            const responseData = responsesData[0].responses || {};
            console.log("Setting answers from satisfaction responses:", responseData);
            
            // Vérifier que les réponses sont dans le bon format
            const formattedAnswers: Record<string, any> = {};
            
            // Parcourir toutes les questions pour s'assurer que chaque question a une réponse
            questions.forEach(question => {
              if (responseData[question.id] !== undefined) {
                formattedAnswers[question.id] = responseData[question.id];
              } else {
                // Valeur par défaut si la réponse n'existe pas
                if (question.type === 'text') {
                  formattedAnswers[question.id] = 'Pas de réponse';
                } else if (question.type === 'rating') {
                  formattedAnswers[question.id] = 0;
                }
              }
            });
            
            console.log("Formatted satisfaction answers:", formattedAnswers);
            setAnswers(formattedAnswers);
          } else {
            console.log("No satisfaction responses found, initializing with empty answers");
            // Initialize answers for readOnly mode with empty values
            const emptyAnswers: Record<string, any> = {};
            questions.forEach(question => {
              if (question.type === 'text') {
                emptyAnswers[question.id] = 'Pas de réponse';
              } else if (question.type === 'rating') {
                emptyAnswers[question.id] = 0;
              }
            });
            setAnswers(emptyAnswers);
          }
        } else {
          // Initialize answers for non-readOnly mode
          const initialAnswers: Record<string, any> = {};
          questions.forEach(question => {
            if (question.type === 'text') {
              initialAnswers[question.id] = '';
            } else if (question.type === 'rating') {
              initialAnswers[question.id] = 0;
            }
          });
          setAnswers(initialAnswers);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Une erreur est survenue lors du chargement des données.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [readOnly, userId, adminResponseData]);

  const handleAnswer = (questionId: string, answer: any) => {
    if (readOnly) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const canProceed = () => {
    if (readOnly) return true;
    
    if (currentStep === questions.length - 1) {
      return questions.every(question => {
        const answer = answers[question.id];
        if (question.type === 'text') {
          return true;
        } else if (question.type === 'rating') {
          return answer !== undefined && answer !== null;
        } else {
          return answer !== undefined && answer !== '';
        }
      });
    }
    
    const answer = answers[currentQuestion.id];
    
    if (currentQuestion.type === 'text') {
      return true;
    } else if (currentQuestion.type === 'rating') {
      return answer !== undefined && answer !== null;
    } else {
      return answer !== undefined && answer !== '';
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Check if there's an existing response
      const { data: existingData, error: checkError } = await supabase
        .from('satisfaction_responses')
        .select('id')
        .eq('user_id', user.id);
        
      if (checkError) {
        console.error("Error checking existing satisfaction responses:", checkError);
      }
      
      if (existingData && existingData.length > 0) {
        console.log("Found existing satisfaction questionnaire, updating...");
        // Update existing response
        const { error: updateError } = await supabase
          .from('satisfaction_responses')
          .update({
            responses: answers
          })
          .eq('id', existingData[0].id);
          
        if (updateError) {
          console.error("Error updating satisfaction response:", updateError);
          throw updateError;
        }
      } else {
        console.log("Creating new satisfaction questionnaire...");
        // Insert new response
        const { error: insertError } = await supabase
          .from('satisfaction_responses')
          .insert({
            user_id: user.id,
            responses: answers
          });

        if (insertError) {
          console.error("Error inserting satisfaction response:", insertError);
          throw insertError;
        }
      }

      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ 
          satisfaction_completed: true 
        })
        .eq('id', user.id);

      if (profileError) {
        console.error("Error updating user profile for satisfaction:", profileError);
        throw profileError;
      }

      // Appeler le callback onSubmitSuccess si fourni
      if (onSubmitSuccess) {
        console.log("Calling onSubmitSuccess callback after satisfaction questionnaire submission");
        // Ajouter un délai pour s'assurer que les données sont bien enregistrées
        setTimeout(() => {
          onSubmitSuccess();
        }, 500);
      }

      onClose();
    } catch (error) {
      console.error('Error submitting satisfaction questionnaire:', error);
      setError('Une erreur est survenue lors de l\'enregistrement de vos réponses.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (max: number, value: number, onChange: (value: number) => void) => {
    return (
      <div className="flex justify-center gap-1 sm:gap-2">
        {[...Array(max)].map((_, index) => (
          <button
            key={index}
            onClick={() => onChange(index + 1)}
            disabled={readOnly}
            className="p-0.5 sm:p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full disabled:cursor-default"
          >
            <Star
              className={`w-6 h-6 sm:w-8 sm:h-8 ${
                index < value
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const renderQuestion = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-medium text-white mb-4">{currentQuestion.text}</h3>
        
        {(() => {
          switch (currentQuestion.type) {
            case 'rating':
              return (
                <div className="space-y-3 sm:space-y-4">
                  <div className="text-center mb-4 sm:mb-6">
                    <p className="text-xs sm:text-sm text-white">
                      {answers[currentQuestion.id] ? `${answers[currentQuestion.id]} sur ${currentQuestion.max}` : 'Cliquez pour noter'}
                    </p>
                  </div>
                  {renderStars(
                    currentQuestion.max || 5,
                    answers[currentQuestion.id] ? Number(answers[currentQuestion.id]) : 0,
                    (value) => handleAnswer(currentQuestion.id, value)
                  )}
                </div>
              );

            case 'text':
            default:
              return readOnly ? (
                <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
                  <p className="whitespace-pre-wrap text-sm sm:text-base text-white">
                    {answers[currentQuestion.id] || <span className="text-gray-500 italic">Pas de réponse</span>}
                  </p>
                </div>
              ) : (
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                  placeholder="Votre réponse..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 sm:p-4 min-h-[120px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              );
          }
        })()}
      </div>
    );
  };

  const renderReadOnlyQuestion = (question: any, index: number) => {
    return (
      <div key={question.id} className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
            {index + 1}
          </div>
          <h3 className="text-lg font-medium text-white">{question.text}</h3>
        </div>
        
        <div className="ml-11">
          {(() => {
            const answer = answers[question.id];
            
            if (!answer && answer !== 0) {
              return <p className="text-gray-400">Pas de réponse</p>;
            }
            
            switch (question.type) {
              case 'rating':
                return (
                  <div className="flex items-center">
                    {Array.from({ length: question.max }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-8 h-8 ${
                          i < Number(answer) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-white">{answer}/{question.max}</span>
                  </div>
                );
              
              case 'text':
                return (
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <p className="text-white whitespace-pre-wrap">{answer}</p>
                  </div>
                );
              
              default:
                return <p className="text-white">{answer}</p>;
            }
          })()}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            {readOnly ? "Questionnaire de satisfaction - Vos réponses" : "Questionnaire de satisfaction"}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Réessayer
              </button>
            </div>
          ) : readOnly ? (
            <div className="space-y-6">
              {questions.map((question, index) => renderReadOnlyQuestion(question, index))}
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 pb-4 mb-4 pr-1 -mr-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-3 sm:space-y-4"
                >
                  {renderQuestion()}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
        
        {/* Footer - Only show for non-readOnly mode */}
        {!readOnly && (
          <div className="p-4 sm:p-6 border-t border-gray-800 flex justify-between">
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0 || isSubmitting}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors text-white"
            >
              <ChevronLeft className="w-5 h-5" />
              Précédent
            </button>
            
            {currentStep < questions.length - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={isSubmitting || !canProceed()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors text-white"
              >
                Suivant
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !canProceed()}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors text-white"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Envoi...
                  </>
                ) : (
                  <>
                    Terminer
                    <CheckCircle2 className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};