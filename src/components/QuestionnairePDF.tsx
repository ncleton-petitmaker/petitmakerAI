import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Question {
  id: string;
  text: string;
  type: 'radio' | 'checkbox' | 'text' | 'scale';
  options?: string[];
  max?: number;
}

interface QuestionnairePDFProps {
  type: 'positioning' | 'initial' | 'final' | 'satisfaction';
}

export const QuestionnairePDF: React.FC<QuestionnairePDFProps> = ({ type }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer l'utilisateur connecté
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Récupérer les données de l'utilisateur
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        setUserData(userData);

        // Récupérer les questions selon le type
        let questionsData: Question[] = [];
        
        if (type === 'positioning') {
          questionsData = getPositioningQuestions();
        } else if (type === 'initial' || type === 'final') {
          questionsData = getEvaluationQuestions();
          
          // Récupérer le score
          if (type === 'initial') {
            setScore(userData.initial_evaluation_score);
          } else {
            setScore(userData.final_evaluation_score);
          }
        } else if (type === 'satisfaction') {
          questionsData = getSatisfactionQuestions();
        }
        
        setQuestions(questionsData);

        // Récupérer les réponses
        let tableName = '';
        if (type === 'positioning') {
          tableName = 'positioning_questionnaire_responses';
        } else if (type === 'initial') {
          tableName = 'initial_evaluation_responses';
        } else if (type === 'final') {
          tableName = 'final_evaluation_responses';
        } else if (type === 'satisfaction') {
          tableName = 'satisfaction_questionnaire_responses';
        }

        const { data: responsesData, error: responsesError } = await supabase
          .from(tableName)
          .select('*')
          .eq('user_id', user.id);

        if (responsesError) throw responsesError;

        // Transformer les réponses en objet
        const answersObj: Record<string, any> = {};
        responsesData.forEach((response: any) => {
          answersObj[response.question_id] = response.answer;
        });

        setAnswers(answersObj);
      } catch (error) {
        console.error('Error fetching questionnaire data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type]);

  const getPositioningQuestions = (): Question[] => {
    return [
      {
        id: 'experience',
        text: 'Quelle est votre expérience avec l\'IA générative ?',
        type: 'radio',
        options: [
          'Aucune expérience',
          'Débutant - J\'ai entendu parler de ChatGPT',
          'Intermédiaire - J\'utilise occasionnellement des outils d\'IA',
          'Avancé - J\'utilise régulièrement des outils d\'IA dans mon travail'
        ]
      },
      {
        id: 'tools',
        text: 'Quels outils d\'IA générative avez-vous déjà utilisés ?',
        type: 'checkbox',
        options: [
          'ChatGPT',
          'Google Bard / Gemini',
          'DALL-E',
          'Midjourney',
          'Stable Diffusion',
          'GitHub Copilot',
          'Autre'
        ]
      },
      {
        id: 'expectations',
        text: 'Quelles sont vos attentes principales concernant cette formation ?',
        type: 'text'
      },
      {
        id: 'challenges',
        text: 'Quels défis spécifiques espérez-vous résoudre avec l\'IA générative ?',
        type: 'text'
      },
      {
        id: 'comfort',
        text: 'Quel est votre niveau de confort avec les nouvelles technologies en général ?',
        type: 'scale',
        max: 5
      }
    ];
  };

  const getEvaluationQuestions = (): Question[] => {
    return [
      {
        id: 'q1',
        text: 'Qu\'est-ce que l\'IA générative ?',
        type: 'radio',
        options: [
          'Un système qui génère des nombres aléatoires',
          'Un système qui crée du contenu nouveau à partir de données d\'apprentissage',
          'Un système qui analyse uniquement des données structurées',
          'Un système qui remplace entièrement l\'intelligence humaine'
        ]
      },
      {
        id: 'q2',
        text: 'Quels types de contenus peuvent être créés par l\'IA générative ?',
        type: 'checkbox',
        options: [
          'Texte',
          'Images',
          'Audio',
          'Vidéo',
          'Code informatique'
        ]
      },
      {
        id: 'q3',
        text: 'Qu\'est-ce qu\'un prompt efficace ?',
        type: 'radio',
        options: [
          'Une question très courte',
          'Une instruction claire et détaillée qui guide l\'IA vers le résultat souhaité',
          'Une série de mots-clés sans contexte',
          'Un texte très long avec beaucoup de répétitions'
        ]
      },
      {
        id: 'q4',
        text: 'Quels éléments peuvent améliorer un prompt pour obtenir de meilleurs résultats ?',
        type: 'checkbox',
        options: [
          'Contexte spécifique',
          'Format de sortie souhaité',
          'Exemples concrets',
          'Contraintes et limites',
          'Ton et style souhaités'
        ]
      },
      {
        id: 'q5',
        text: 'Quels sont les risques potentiels liés à l\'utilisation de l\'IA générative ?',
        type: 'checkbox',
        options: [
          'Biais dans les résultats',
          'Violation de la propriété intellectuelle',
          'Désinformation',
          'Dépendance excessive',
          'Questions de confidentialité'
        ]
      }
    ];
  };

  const getSatisfactionQuestions = (): Question[] => {
    return [
      {
        id: 'overall',
        text: 'Quelle est votre satisfaction globale concernant cette formation ?',
        type: 'scale',
        max: 5
      },
      {
        id: 'content',
        text: 'Le contenu de la formation a-t-il répondu à vos attentes ?',
        type: 'scale',
        max: 5
      },
      {
        id: 'trainer',
        text: 'Comment évaluez-vous la qualité de l\'animation par le formateur ?',
        type: 'scale',
        max: 5
      },
      {
        id: 'materials',
        text: 'Les supports de formation étaient-ils clairs et utiles ?',
        type: 'scale',
        max: 5
      },
      {
        id: 'pace',
        text: 'Le rythme de la formation était-il adapté ?',
        type: 'scale',
        max: 5
      },
      {
        id: 'practical',
        text: 'Les exercices pratiques étaient-ils pertinents ?',
        type: 'scale',
        max: 5
      },
      {
        id: 'strengths',
        text: 'Quels sont les points forts de cette formation ?',
        type: 'text'
      },
      {
        id: 'improvements',
        text: 'Quels aspects de la formation pourraient être améliorés ?',
        type: 'text'
      },
      {
        id: 'recommend',
        text: 'Recommanderiez-vous cette formation à un collègue ?',
        type: 'scale',
        max: 5
      }
    ];
  };

  const renderAnswer = (question: Question) => {
    const answer = answers[question.id];
    
    if (!answer) return <p className="text-gray-500">Pas de réponse</p>;
    
    switch (question.type) {
      case 'radio':
        return <p className="text-white">{answer}</p>;
      
      case 'checkbox':
        if (Array.isArray(answer)) {
          return (
            <ul className="list-disc pl-5">
              {answer.map((item, index) => (
                <li key={index} className="text-white">{item}</li>
              ))}
            </ul>
          );
        }
        return <p className="text-white">{answer}</p>;
      
      case 'text':
        return <p className="text-white whitespace-pre-wrap">{answer}</p>;
      
      case 'scale':
        return (
          <div className="flex items-center">
            {Array.from({ length: question.max || 5 }).map((_, index) => (
              <span 
                key={index}
                className={`w-6 h-6 mx-1 rounded-full flex items-center justify-center ${
                  index < Number(answer) ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'
                }`}
              >
                {index + 1}
              </span>
            ))}
          </div>
        );
      
      default:
        return <p className="text-white">{answer}</p>;
    }
  };

  const getQuestionnaireTitle = () => {
    switch (type) {
      case 'positioning':
        return 'Questionnaire de positionnement';
      case 'initial':
        return 'Évaluation initiale';
      case 'final':
        return 'Évaluation finale';
      case 'satisfaction':
        return 'Questionnaire de satisfaction';
      default:
        return 'Questionnaire';
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="bg-white text-black p-8 max-w-4xl mx-auto">
      <style>
        {`
          @media print {
            body {
              font-size: 12pt;
              line-height: 1.4;
              color: #000;
              background: #fff;
            }
            h1, h2, h3, h4 {
              color: #000;
              margin-top: 1em;
              margin-bottom: 0.5em;
            }
            p {
              margin-bottom: 0.5em;
            }
            .page-break {
              page-break-before: always;
            }
          }
        `}
      </style>
      
      <div className="mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold mb-2">{getQuestionnaireTitle()}</h1>
        
        {userData && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm font-semibold">Apprenant :</p>
              <p>{userData.first_name} {userData.last_name}</p>
              <p>{userData.email}</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Date :</p>
              <p>{format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>
              
              {score !== null && (
                <div className="mt-2">
                  <p className="text-sm font-semibold">Score :</p>
                  <p className="font-bold text-lg">{score}%</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        {questions.map((question, index) => (
          <div key={question.id} className="mb-6 pb-4 border-b">
            <div className="flex items-start">
              <span className="bg-gray-200 text-gray-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">
                {index + 1}
              </span>
              <h3 className="text-lg font-medium">{question.text}</h3>
            </div>
            
            <div className="mt-3 ml-8">
              {renderAnswer(question)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 