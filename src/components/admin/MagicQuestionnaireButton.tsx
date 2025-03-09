import React, { useState, useRef, useEffect } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import OpenAI from 'openai';

interface MagicQuestionnaireButtonProps {
  onQuestionsGenerated: (questions: any[]) => void;
  type: 'positioning' | 'initial_final_evaluation' | 'satisfaction';
  training?: {
    title: string;
    content?: string;
    objectives?: string[];
  };
}

interface Question {
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'rating' | 'yes_no';
  options?: string[];
  correct_answer?: string | null;
  is_required: boolean;
  order_index: number;
}

export const MagicQuestionnaireButton: React.FC<MagicQuestionnaireButtonProps> = ({
  onQuestionsGenerated,
  type,
  training
}) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [loadingDots, setLoadingDots] = useState('');
  const [loadingStage, setLoadingStage] = useState(0);
  
  // Étapes du processus de génération
  const loadingStages = [
    "Analyse de la formation",
    "Exigences Qualiopi",
    "Rédaction des questions",
    "Vérification finale"
  ];

  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });

  // Effet pour animer les points de chargement
  useEffect(() => {
    if (loading) {
      const dotsInterval = setInterval(() => {
        setLoadingDots(prev => {
          if (prev.length >= 3) return '';
          return prev + '.';
        });
      }, 500);
      
      // Effet pour changer les étapes de chargement
      const stageInterval = setInterval(() => {
        setLoadingStage(prev => (prev + 1) % loadingStages.length);
      }, 3000);
      
      return () => {
        clearInterval(dotsInterval);
        clearInterval(stageInterval);
      };
    } else {
      setLoadingStage(0);
    }
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔍 [DEBUG] MagicQuestionnaireButton - Starting question generation');
      console.log('🔍 [DEBUG] Training data:', training);
      console.log('🔍 [DEBUG] Questionnaire type:', type);
      console.log('🔍 [DEBUG] Number of questions:', numQuestions);

      if (!training) {
        throw new Error('Les données de formation sont requises');
      }

      // Format training data for the prompt
      const objectives = Array.isArray(training.objectives) 
        ? training.objectives 
        : typeof training.objectives === 'string'
          ? JSON.parse(training.objectives)
          : [];

      console.log('🔍 [DEBUG] Parsed objectives:', objectives);

      // Déterminer le type de questionnaire en français
      const questionnaireTypeInFrench = type === 'positioning' 
        ? 'positionnement' 
        : type === 'initial_final_evaluation' 
          ? 'évaluation' 
          : 'satisfaction';

      // Build the prompt
      const prompt = `
<programme_formation>
${training.content || 'Non spécifié'}
</programme_formation>

<titre_formation>
${training.title}
</titre_formation>

<objectifs_formation>
${objectives.map((obj: string) => `- ${obj}`).join('\n')}
</objectifs_formation>

<type_questionnaire>
${questionnaireTypeInFrench}
</type_questionnaire>

<nombre_questions>
${numQuestions}
</nombre_questions>

<description_types_questionnaires>
Questionnaire de positionnement:
- Évaluation initiale des connaissances théoriques et compétences pratiques des apprenants.
- Identification des attentes spécifiques des participants vis-à-vis de la formation.

Questionnaire d'évaluation des acquis:
- Mesure du niveau d'atteinte des objectifs pédagogiques fixés pour la formation suivie.
- Évaluation précise des compétences acquises par les apprenants à l'issue de la formation.

Questionnaire de satisfaction:
- Recueil du ressenti des apprenants sur la qualité globale de la formation (contenu, organisation, méthodes pédagogiques, formateurs).
- Identification claire des points forts et axes d'amélioration.
</description_types_questionnaires>

Vous êtes un expert en création de questionnaires d'évaluation de formation, spécialisé dans les exigences de la certification Qualiopi en France. Votre mission est de générer un questionnaire basé sur les informations fournies concernant la formation.

Instructions :

1. Analysez attentivement les informations fournies sur la formation.
2. Planifiez la création du questionnaire à l'intérieur des balises <conception_questionnaire> dans votre bloc de réflexion. Dans cette section :
   a. Listez les sujets clés et compétences abordés dans la formation.
   b. Décomposez les objectifs en résultats d'apprentissage mesurables.
   c. Créez un plan de distribution des questions basé sur les sujets et les objectifs.
   d. Rédigez des exemples de questions pour chaque sujet/objectif.
   e. Révisez et affinez les questions pour assurer leur alignement avec les normes Qualiopi.
   f. Identifiez le type de questionnaire et ses exigences spécifiques.
   g. Résumez les points essentiels du programme et ses objectifs.
   h. Élaborez une stratégie pour créer des questions pertinentes et mesurables.
   i. Vérifiez que toutes les questions seront rédigées en français.

3. Générez exactement ${numQuestions} questions.

4. Assurez-vous que toutes les questions sont directement liées au contenu et aux objectifs de la formation.

5. Pour les questionnaires d'évaluation (initial ou final) :
   - Rédigez des questions claires permettant de mesurer la progression.
   - Garantissez que toutes les réponses sont quantifiables.
   - Utilisez un mélange équilibré de questions à choix multiple avec 4 options ET de questions oui/non.
   - IMPORTANT : Incluez au moins 30% de questions de type oui/non.
   - Chaque question DOIT avoir une réponse correcte.
   - Concentrez-vous sur la mesure du niveau d'atteinte des objectifs pédagogiques.

6. Pour les questionnaires de satisfaction :
   - Concentrez-vous sur l'expérience des participants et la qualité globale de la formation.
   - Privilégiez les questions avec notation sur 5.
   - Incluez des questions à réponse libre pour les commentaires.
   - Couvrez les aspects liés au contenu, à l'organisation, aux méthodes pédagogiques et aux formateurs.
   - Incluez des questions permettant d'identifier les points forts et axes d'amélioration.

7. Pour les questionnaires de positionnement :
   - Mélangez les types de questions.
   - Utilisez des questions à réponse courte pour évaluer les attentes spécifiques.
   - Utilisez des notes sur 5 pour évaluer le niveau initial des connaissances et compétences.
   - Incluez des questions permettant d'identifier les besoins spécifiques des participants.
   - Évaluez les connaissances théoriques et compétences pratiques initiales.

8. Respectez strictement le format JSON suivant pour chaque question :

{
  "question": "Texte de la question",
  "type": "multiple_choice" | "short_answer" | "rating" | "yes_no",
  "options": ["Option A", "Option B", "Option C", "Option D"], // Pour multiple_choice uniquement
  "correct_answer": "Option A", // Pour multiple_choice et yes_no en évaluation uniquement
  "is_required": true
}

Exemple de question oui/non pour un questionnaire d'évaluation :
{
  "question": "L'IA générative peut-elle créer du contenu original sans données d'entraînement ?",
  "type": "yes_no",
  "options": ["Oui", "Non"],
  "correct_answer": "Non",
  "is_required": true
}

9. Avant de finaliser le questionnaire, effectuez une révision dans les balises <revision_questionnaire> à l'intérieur de votre bloc de réflexion. Dans cette section :
   - Vérifiez que chaque question est directement liée au contenu et aux objectifs de la formation.
   - Assurez-vous que le nombre de questions correspond exactement à celui spécifié.
   - Confirmez que chaque question à choix multiple respecte le format requis.
   - Pour les évaluations, vérifiez que la réponse correcte est toujours indiquée.
   - Assurez-vous que toutes les questions sont en français et clairement formulées.
   - VÉRIFIEZ que vous avez bien inclus au moins 30% de questions oui/non pour les questionnaires d'évaluation.
   - Vérifiez que les questions correspondent bien aux objectifs spécifiques du type de questionnaire sélectionné.

10. Après la révision, générez le questionnaire final sous forme d'un tableau JSON contenant toutes les questions.

Retournez uniquement un tableau JSON de questions, sans autre texte ni explications.`;

      console.log('🔍 [DEBUG] Prompt:', prompt);

      const response = await openai.chat.completions.create({
        model: "o3-mini",
        messages: [
          {
            role: "system",
            content: "Vous êtes un expert en création de questionnaires d'évaluation de formation, spécialisé dans les exigences de la certification Qualiopi en France. Vous générez uniquement des questions en français, au format JSON demandé."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });

      const jsonResponse = response.choices[0].message.content;
      if (!jsonResponse) throw new Error('No response from OpenAI');

      console.log('🔍 [DEBUG] OpenAI response:', jsonResponse);

      // Parse the JSON response
      const parsedResponse = JSON.parse(jsonResponse);
      
      // Extraire les questions du format de réponse
      // Le modèle peut renvoyer soit un tableau directement, soit un objet avec une clé "questionnaire" ou "questions"
      let questions;
      if (Array.isArray(parsedResponse)) {
        questions = parsedResponse;
      } else if (parsedResponse.questionnaire) {
        questions = parsedResponse.questionnaire;
      } else if (parsedResponse.questions) {
        questions = parsedResponse.questions;
      } else {
        // Chercher une clé qui contient un tableau
        const possibleArrayKeys = Object.keys(parsedResponse).filter(key => 
          Array.isArray(parsedResponse[key]) && parsedResponse[key].length > 0
        );
        
        if (possibleArrayKeys.length > 0) {
          questions = parsedResponse[possibleArrayKeys[0]];
        } else {
          throw new Error('Format de réponse non reconnu');
        }
      }

      // Transform questions to match our format
      const formattedQuestions = questions.map((q: any, index: number): Question => ({
        question_text: q.question,
        question_type: q.type,
        options: q.options,
        correct_answer: q.correct_answer,
        is_required: q.is_required ?? true,
        order_index: index
      }));

      console.log('🔍 [DEBUG] Formatted questions:', formattedQuestions);

      // Validate questions
      const validQuestions = validateQuestions(formattedQuestions);
      
      if (validQuestions.length === 0) {
        throw new Error('Aucune question valide n\'a été générée');
      }

      console.log('🔍 [DEBUG] Valid questions:', validQuestions);

      onQuestionsGenerated(validQuestions);
      setShowModal(false);
    } catch (error) {
      console.error('🔍 [DEBUG] Error generating questions:', error);
      alert('Une erreur est survenue lors de la génération des questions');
    } finally {
      setLoading(false);
    }
  };

  const validateQuestions = (questions: Question[]): Question[] => {
    return questions.filter(q => {
      // Ensure required fields are present
      if (!q.question_text || !q.question_type) {
        console.log('🔍 [DEBUG] Invalid question - missing required fields:', q);
        return false;
      }

      // For evaluation questionnaires, only allow multiple choice and yes/no questions
      if (type === 'initial_final_evaluation') {
        if (q.question_type !== 'multiple_choice' && q.question_type !== 'yes_no') {
          console.log('🔍 [DEBUG] Invalid question type for evaluation:', q.question_type);
          return false;
        }
        
        if (q.question_type === 'multiple_choice') {
          // Ensure multiple choice questions have exactly 4 options
          if (!Array.isArray(q.options) || q.options.length !== 4) {
            console.log('🔍 [DEBUG] Multiple choice question must have exactly 4 options:', q);
            return false;
          }

          // Ensure correct answer is present and matches one of the options
          if (!q.correct_answer || !q.options.includes(q.correct_answer)) {
            console.log('🔍 [DEBUG] Multiple choice question missing valid correct answer:', q);
            return false;
          }
        } else if (q.question_type === 'yes_no') {
          // Ensure yes/no questions have correct format
          if (!Array.isArray(q.options) || q.options.length !== 2) {
            q.options = ['Oui', 'Non'];
          } else {
            // Normalize options to ensure they are exactly ['Oui', 'Non']
            const hasOui = q.options.some(opt => opt.toLowerCase() === 'oui');
            const hasNon = q.options.some(opt => opt.toLowerCase() === 'non');
            
            if (!hasOui || !hasNon) {
              q.options = ['Oui', 'Non'];
            }
          }
          
          if (!q.correct_answer || !['Oui', 'Non'].includes(q.correct_answer)) {
            console.log('🔍 [DEBUG] Yes/no question missing valid correct answer:', q);
            return false;
          }
        }
      } else {
        // For other questionnaire types, validate based on question type
        const validTypes = ['multiple_choice', 'short_answer', 'rating', 'yes_no'];
        if (!validTypes.includes(q.question_type)) {
          console.log('🔍 [DEBUG] Invalid question type:', q.question_type);
          return false;
        }

        // Validate options for multiple choice
        if (q.question_type === 'multiple_choice') {
          if (!Array.isArray(q.options) || q.options.length === 0) {
            console.log('🔍 [DEBUG] Multiple choice question missing options:', q);
            return false;
          }
        }

        // Ensure yes/no questions have correct options
        if (q.question_type === 'yes_no') {
          if (!Array.isArray(q.options) || q.options.length !== 2) {
            q.options = ['Oui', 'Non'];
          } else {
            // Normalize options to ensure they are exactly ['Oui', 'Non']
            const hasOui = q.options.some(opt => opt.toLowerCase() === 'oui');
            const hasNon = q.options.some(opt => opt.toLowerCase() === 'non');
            
            if (!hasOui || !hasNon) {
              q.options = ['Oui', 'Non'];
            }
          }
        }
      }

      return true;
    });
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
      >
        <Wand2 className="h-5 w-5 mr-2" />
        Générer avec l'IA
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Générer des questions avec l'IA
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre de questions
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                  required
                />
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !training}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="mr-3 relative">
                        {/* Robot animation */}
                        <div className="relative w-8 h-8">
                          {/* Robot head */}
                          <div className="absolute top-0 left-1 w-6 h-5 bg-gray-300 rounded-md">
                            {/* Robot eyes */}
                            <div className="absolute top-1 left-1 w-1 h-1 bg-blue-500 rounded-full"></div>
                            <div className="absolute top-1 right-1 w-1 h-1 bg-blue-500 rounded-full"></div>
                            {/* Robot antenna */}
                            <div className="absolute -top-1.5 left-2.5 w-0.5 h-1.5 bg-gray-400"></div>
                            <div className="absolute -top-2 left-2.5 w-1 h-0.5 bg-red-500 rounded-full animate-pulse"></div>
                          </div>
                          {/* Robot arms - using CSS animations via Tailwind */}
                          <div className="absolute top-2.5 left-0 w-1.5 h-0.5 bg-gray-400 origin-right animate-[spin_2s_linear_infinite]"></div>
                          <div className="absolute top-2.5 right-0 w-1.5 h-0.5 bg-gray-400 origin-left animate-[spin_2s_linear_infinite]"></div>
                          {/* Robot legs */}
                          <div className="absolute top-5 left-1.5 w-1 h-1.5 bg-gray-400 animate-bounce"></div>
                          <div className="absolute top-5 right-1.5 w-1 h-1.5 bg-gray-400 animate-bounce delay-150"></div>
                          {/* Work surface with sparkles */}
                          <div className="absolute top-7 left-1 w-6 h-0.5 bg-gray-200">
                            <div className="absolute -top-1 left-0 w-0.5 h-0.5 bg-yellow-300 animate-ping"></div>
                            <div className="absolute -top-1 left-3 w-0.5 h-0.5 bg-yellow-300 animate-ping delay-300"></div>
                            <div className="absolute -top-1 left-5 w-0.5 h-0.5 bg-yellow-300 animate-ping delay-700"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-purple-400 font-medium">Étape {loadingStage + 1}/4</span>
                        <span className="animate-pulse">
                          {loadingStages[loadingStage]}{loadingDots}<span className="invisible">...</span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-5 w-5 mr-2" />
                      Générer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};