import React, { useEffect, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Question {
  id: string;
  text: string;
  type: 'radio' | 'checkbox' | 'text' | 'scale';
  options?: string[];
}

interface QuestionnaireReportProps {
  onClose: () => void;
}

const questions: Question[] = [
  {
    id: 'heard_of_ai',
    text: 'As-tu déjà entendu parler de l\'IA générative ?',
    type: 'radio',
    options: ['Oui', 'Non']
  },
  {
    id: 'ai_example',
    text: 'Si oui, peux-tu citer un exemple d\'IA générative que tu connais ?',
    type: 'text'
  },
  {
    id: 'llm_knowledge',
    text: 'Comment évaluerais-tu ton niveau de connaissance des modèles de langage (LLM) ?',
    type: 'radio',
    options: [
      'Débutant(e) – Je ne sais pas du tout comment ça fonctionne',
      'Intermédiaire – J\'ai des notions, mais je ne connais pas les détails',
      'Avancé – Je comprends bien leur fonctionnement'
    ]
  },
  {
    id: 'ai_difference',
    text: 'Selon toi, quelle est la principale différence entre une IA générative et une IA traditionnelle ?',
    type: 'text'
  },
  {
    id: 'used_ai_tools',
    text: 'Dans ton activité professionnelle, as-tu déjà utilisé des outils d\'IA générative ?',
    type: 'radio',
    options: ['Oui', 'Non']
  },
  {
    id: 'ai_tools_usage',
    text: 'Si oui, lesquels et pour quels usages ?',
    type: 'text'
  },
  {
    id: 'ai_usefulness',
    text: 'Sur une échelle de 1 à 5, dans quelle mesure penses-tu que l\'IA générative pourrait être utile dans ton métier ?',
    type: 'scale'
  },
  {
    id: 'ai_barriers',
    text: 'Quels sont les principaux freins que tu identifies à l\'utilisation de l\'IA générative en entreprise ?',
    type: 'checkbox',
    options: [
      'Manque de compétences',
      'Coût et investissement',
      'Questions éthiques et légales',
      'Résistance au changement'
    ]
  },
  {
    id: 'ai_barriers_other',
    text: 'Autre frein :',
    type: 'text'
  },
  {
    id: 'previous_training',
    text: 'As-tu déjà suivi une formation ou lu des ressources sur l\'IA générative ?',
    type: 'radio',
    options: ['Oui', 'Non']
  },
  {
    id: 'previous_resources',
    text: 'Si oui, lesquelles ?',
    type: 'text'
  },
  {
    id: 'tech_watch',
    text: 'Es-tu à l\'aise avec la recherche d\'informations et la veille technologique sur des sujets liés à l\'IA ?',
    type: 'radio',
    options: [
      'Pas du tout',
      'Un peu',
      'Plutôt à l\'aise',
      'Très à l\'aise'
    ]
  },
  {
    id: 'training_objectives',
    text: 'Quels sont tes principaux objectifs en suivant cette formation ?',
    type: 'text'
  }
];

export const QuestionnaireReport: React.FC<QuestionnaireReportProps> = ({ onClose }) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnswers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        // Get all responses for this user
        const { data, error } = await supabase
          .from('questionnaire_responses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        // If we have responses, use the most recent one
        if (data && data.length > 0) {
          setAnswers(data[0].responses);
        } else {
          throw new Error('Aucune réponse trouvée');
        }
      } catch (error) {
        console.error('Error fetching answers:', error);
        setError('Aucune réponse au questionnaire n\'a été trouvée.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnswers();
  }, []);

  const renderAnswer = (question: Question) => {
    const answer = answers[question.id];

    switch (question.type) {
      case 'radio':
        return (
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-blue-400">{answer}</p>
          </div>
        );

      case 'checkbox':
        const selectedOptions = Array.isArray(answer) ? answer : [answer];
        return (
          <div className="space-y-2">
            {selectedOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-800 rounded-lg p-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                <p>{option}</p>
              </div>
            ))}
          </div>
        );

      case 'scale':
        return (
          <div className="flex gap-2 bg-gray-800 rounded-lg p-4">
            {[1, 2, 3, 4, 5].map((value) => (
              <div
                key={value}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  parseInt(answer) === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {value}
              </div>
            ))}
          </div>
        );

      case 'text':
      default:
        return answer ? (
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="whitespace-pre-wrap">{answer}</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-500 italic">Pas de réponse</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
        <div className="bg-gray-900 rounded-xl p-8 max-w-3xl w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
        <div className="bg-gray-900 rounded-xl p-8 max-w-3xl w-full mx-4">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center overflow-y-auto py-8">
      <div className="bg-gray-900 rounded-xl p-8 max-w-3xl w-full mx-4 relative">
        <div className="absolute top-4 right-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Fermer le rapport"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold">Vos réponses au questionnaire</h2>
          <p className="text-gray-400 mt-2">
            Récapitulatif de vos réponses au questionnaire de positionnement
          </p>
        </div>

        <div className="space-y-8">
          {questions.map((question, index) => (
            <div key={question.id} className="pb-8 border-b border-gray-800 last:border-0">
              <div className="flex items-baseline gap-4 mb-4">
                <span className="text-blue-400 font-medium">{index + 1}</span>
                <h3 className="text-lg font-medium">{question.text}</h3>
              </div>
              {renderAnswer(question)}
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};