import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Save,
  Wand2,
  GraduationCap,
  AlertCircle,
  Loader2,
  ChevronLeft
} from 'lucide-react';
import { LoadingSpinner } from '../LoadingSpinner';
import { MagicQuestionnaireButton } from './MagicQuestionnaireButton';
import OpenAI from 'openai';
import { useNavigate } from 'react-router-dom';

interface Training {
  id: string;
  title: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  content?: string;
  objectives?: string[];
  questionnaires?: QuestionnaireTemplate[];
}

interface QuestionnaireTemplate {
  id: string;
  title: string | null;
  description: string | null;
  type: 'positioning' | 'initial_final_evaluation' | 'satisfaction';
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Question {
  id: string;
  template_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'rating' | 'yes_no';
  options?: string[];
  correct_answer?: string | null;
  order_index: number;
  is_required: boolean;
}

const DEFAULT_QUESTIONNAIRES = [
  {
    type: 'positioning',
    title: 'Questionnaire de positionnement',
    description: 'Évaluation des besoins et objectifs'
  },
  {
    type: 'initial_final_evaluation',
    title: 'Questionnaire d\'évaluation',
    description: 'Évaluation des connaissances initiales et finales'
  },
  {
    type: 'satisfaction',
    title: 'Questionnaire de satisfaction',
    description: 'Évaluation de la satisfaction post-formation'
  }
];

// Fonction pour trier les questionnaires dans l'ordre souhaité
const sortQuestionnaires = (templates: QuestionnaireTemplate[]): QuestionnaireTemplate[] => {
  const typeOrder: Record<string, number> = {
    'positioning': 1,
    'initial_final_evaluation': 2,
    'satisfaction': 3
  };
  
  return [...templates].sort((a, b) => {
    return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
  });
};

export const QuestionnairesView = () => {
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [templates, setTemplates] = useState<QuestionnaireTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<QuestionnaireTemplate | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [generatingQuestionnaires, setGeneratingQuestionnaires] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [loadingDots, setLoadingDots] = useState('');
  const [generationSubStep, setGenerationSubStep] = useState(0);
  // Étapes détaillées du processus de génération
  const generationSteps = [
    { // Étape 0: Questionnaire de positionnement
      title: "Création du questionnaire de positionnement",
      subSteps: [
        "Analyse du contenu de la formation",
        "Croisement avec les exigences Qualiopi",
        "Identification des connaissances préalables à évaluer",
        "Rédaction des questions de positionnement",
        "Finalisation du questionnaire de positionnement"
      ]
    },
    { // Étape 1: Questionnaire d'évaluation
      title: "Création du questionnaire d'évaluation",
      subSteps: [
        "Analyse des objectifs pédagogiques",
        "Croisement avec les exigences Qualiopi",
        "Identification des compétences à évaluer",
        "Rédaction des questions d'évaluation",
        "Élaboration des réponses et corrections",
        "Finalisation du questionnaire d'évaluation"
      ]
    },
    { // Étape 2: Questionnaire de satisfaction
      title: "Création du questionnaire de satisfaction",
      subSteps: [
        "Analyse des aspects qualitatifs de la formation",
        "Croisement avec les exigences Qualiopi",
        "Identification des critères de satisfaction",
        "Rédaction des questions de satisfaction",
        "Finalisation du questionnaire de satisfaction"
      ]
    },
    { // Étape 3: Finalisation
      title: "Finalisation des questionnaires",
      subSteps: [
        "Vérification de la cohérence des questionnaires",
        "Validation des formats de questions",
        "Enregistrement dans la base de données",
        "Préparation de l'affichage"
      ]
    }
  ];
  // État pour stocker les modifications temporaires des questions
  const [pendingQuestionUpdates, setPendingQuestionUpdates] = useState<Record<string, Question>>({});
  // Référence pour les timers de debounce
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    fetchTrainings();
  }, []);

  useEffect(() => {
    if (selectedTraining) {
      fetchTemplatesForTraining(selectedTraining.id);
    }
  }, [selectedTraining]);

  useEffect(() => {
    if (selectedTemplate) {
      fetchQuestions(selectedTemplate.id);
    }
  }, [selectedTemplate]);

  // Effet pour animer les points de chargement
  useEffect(() => {
    if (generatingQuestionnaires) {
      const dotsInterval = setInterval(() => {
        setLoadingDots(prev => {
          if (prev.length >= 3) return '';
          return prev + '.';
        });
      }, 500);
      
      // Effet pour changer les sous-étapes
      const subStepInterval = setInterval(() => {
        const currentStepSubSteps = generationSteps[generationStep].subSteps;
        setGenerationSubStep(prev => {
          if (prev >= currentStepSubSteps.length - 1) return prev;
          return prev + 1;
        });
      }, 2000);
      
      return () => {
        clearInterval(dotsInterval);
        clearInterval(subStepInterval);
      };
    } else {
      setGenerationSubStep(0);
    }
  }, [loading, generatingQuestionnaires, generationStep]);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trainings')
        .select(`
          *,
          questionnaires:questionnaire_templates(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrainings(data || []);
    } catch (error) {
      console.error('Error fetching trainings:', error);
      setError('Une erreur est survenue lors du chargement des formations');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplatesForTraining = async (trainingId: string) => {
    try {
      const { data, error } = await supabase
        .from('questionnaire_templates')
        .select('*')
        .eq('training_id', trainingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        // If no templates exist, start generating them
        setGeneratingQuestionnaires(true);
        await generateDefaultQuestionnaires(trainingId);
      } else {
        // Trier les questionnaires dans l'ordre souhaité
        setTemplates(sortQuestionnaires(data));
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Une erreur est survenue lors du chargement des questionnaires');
    }
  };

  const generateDefaultQuestionnaires = async (trainingId: string) => {
    try {
      console.log('Generating default questionnaires for training:', trainingId);
      
      setGeneratingQuestionnaires(true);
      const newTemplates = [];
      
      // Créer les trois templates de questionnaires
      for (const template of DEFAULT_QUESTIONNAIRES) {
        const { data, error } = await supabase
          .from('questionnaire_templates')
          .insert({
            title: template.title,
            description: template.description,
            type: template.type,
            training_id: trainingId,
            version: 1,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;
        if (data) newTemplates.push(data);
      }
      
      // Trier les questionnaires dans l'ordre souhaité
      const sortedTemplates = sortQuestionnaires(newTemplates);
      setTemplates(sortedTemplates);
      setSelectedTemplate(sortedTemplates[0]);
      
      // Générer les questions pour chaque template séquentiellement avec des étapes visuelles
      for (let i = 0; i < sortedTemplates.length; i++) {
        const template = sortedTemplates[i];
        setGenerationStep(i);
        
        // Générer les questions pour ce template
        await generateQuestionsForTemplate(template);
        
        // Mettre à jour la progression
        setGenerationProgress(Math.round(((i + 1) / sortedTemplates.length) * 100));
      }
      
      setGenerationStep(sortedTemplates.length); // Étape finale
      
      // Attendre un peu pour que l'utilisateur voie l'étape finale
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setGeneratingQuestionnaires(false);
    } catch (error) {
      console.error('Error generating default questionnaires:', error);
      setError('Une erreur est survenue lors de la génération des questionnaires');
      setGeneratingQuestionnaires(false);
    }
  };

  const generateQuestionsForTemplate = async (template: QuestionnaireTemplate) => {
    if (!selectedTraining) return;
    
    try {
      // Utiliser directement la logique de génération de questions
      const numQuestions = 10; // Nombre de questions par défaut
      
      console.log('🔍 [DEBUG] Starting question generation for template:', template.type);
      console.log('🔍 [DEBUG] Training data:', selectedTraining);
      
      // Format training data for the prompt
      const objectives = Array.isArray(selectedTraining.objectives) 
        ? selectedTraining.objectives 
        : typeof selectedTraining.objectives === 'string'
          ? JSON.parse(selectedTraining.objectives)
          : [];
          
      // Déterminer le type de questionnaire en français
      const questionnaireTypeInFrench = template.type === 'positioning' 
        ? 'positionnement' 
        : template.type === 'initial_final_evaluation' 
          ? 'évaluation' 
          : 'satisfaction';
      
      // Instructions spécifiques selon le type de questionnaire
      let specificInstructions = '';
      let specificFocus = '';
      
      if (template.type === 'positioning') {
        specificInstructions = `
Pour ce questionnaire de positionnement, concentrez-vous particulièrement sur :
- L'évaluation initiale des connaissances théoriques et compétences pratiques des apprenants
- L'identification des attentes spécifiques des participants vis-à-vis de la formation
- La détection des besoins d'apprentissage individuels
- L'adaptation du contenu de la formation aux niveaux des participants

Vos questions doivent permettre de :
1. Évaluer le niveau de connaissance préalable sur les sujets qui seront abordés
2. Identifier les attentes et objectifs personnels des participants
3. Détecter les points forts et les lacunes des apprenants
4. Recueillir des informations sur l'expérience antérieure pertinente

IMPORTANT : Pour ce questionnaire de positionnement, vous pouvez utiliser les types de questions suivants :
- Questions à choix multiple (multiple_choice)
- Questions à réponse courte (short_answer)
- Questions avec notation sur 5 (rating)
- Questions oui/non (yes_no)

REMARQUE : Les questionnaires de positionnement n'ont PAS besoin de spécifier une réponse correcte.`;
        
        specificFocus = `
FOCUS PARTICULIER POUR CE QUESTIONNAIRE DE POSITIONNEMENT :
Ce questionnaire servira à adapter le contenu de la formation aux besoins réels des participants.
Assurez-vous que les questions permettent d'évaluer précisément le niveau initial et les attentes spécifiques.`;
      } 
      else if (template.type === 'initial_final_evaluation') {
        specificInstructions = `
Pour ce questionnaire d'évaluation des acquis, concentrez-vous particulièrement sur :
- La mesure du niveau d'atteinte des objectifs pédagogiques fixés pour la formation
- L'évaluation précise des compétences acquises par les apprenants à l'issue de la formation
- La vérification de la compréhension des concepts clés enseignés
- L'application pratique des connaissances transmises

Vos questions doivent permettre de :
1. Mesurer objectivement les connaissances acquises
2. Vérifier la compréhension des concepts fondamentaux
3. Évaluer la capacité à appliquer les compétences dans des situations concrètes
4. Comparer le niveau final au niveau initial (si applicable)

IMPORTANT : Pour ce questionnaire d'évaluation, vous devez UNIQUEMENT utiliser les types de questions suivants :
- Questions à choix multiple (multiple_choice) avec EXACTEMENT 4 options
- Questions oui/non (yes_no)

REMARQUE CRUCIALE : Chaque question d'évaluation DOIT avoir une réponse correcte spécifiée.`;
        
        specificFocus = `
FOCUS PARTICULIER POUR CE QUESTIONNAIRE D'ÉVALUATION :
Ce questionnaire servira à valider l'acquisition des compétences visées par la formation.
Assurez-vous que chaque question est directement liée à un objectif pédagogique spécifique.
RAPPEL : Incluez au moins 30% de questions oui/non et assurez-vous que chaque question a une réponse correcte clairement identifiée.`;
      } 
      else { // satisfaction
        specificInstructions = `
Pour ce questionnaire de satisfaction, concentrez-vous particulièrement sur :
- Le recueil du ressenti des apprenants sur la qualité globale de la formation
- L'évaluation de la pertinence du contenu, de l'organisation, des méthodes pédagogiques et des formateurs
- L'identification claire des points forts et des axes d'amélioration
- La collecte de suggestions pour améliorer les futures sessions

Vos questions doivent permettre d'évaluer :
1. La satisfaction globale vis-à-vis de la formation
2. La qualité perçue du contenu et sa pertinence par rapport aux attentes
3. L'efficacité des méthodes pédagogiques utilisées
4. La compétence et la pédagogie du formateur
5. L'organisation logistique et matérielle
6. Les améliorations possibles pour les futures sessions

IMPORTANT : Pour ce questionnaire de satisfaction, vous pouvez utiliser les types de questions suivants :
- Questions à choix multiple (multiple_choice)
- Questions à réponse courte (short_answer)
- Questions avec notation sur 5 (rating) - PRIVILÉGIEZ CE TYPE
- Questions oui/non (yes_no)

REMARQUE : Les questionnaires de satisfaction n'ont PAS besoin de spécifier une réponse correcte.`;
        
        specificFocus = `
FOCUS PARTICULIER POUR CE QUESTIONNAIRE DE SATISFACTION :
Ce questionnaire servira à améliorer la qualité des formations futures.
Privilégiez les questions avec notation sur 5 pour les aspects quantitatifs et incluez des questions à réponse libre pour recueillir des commentaires qualitatifs.`;
      }
      
      // Build the prompt
      const prompt = `
<programme_formation>
${selectedTraining.content || 'Non spécifié'}
</programme_formation>

<titre_formation>
${selectedTraining.title}
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

${specificInstructions}

Vous êtes un expert en création de questionnaires d'évaluation de formation, spécialisé dans les exigences de la certification Qualiopi en France. Votre mission est de générer un questionnaire basé sur les informations fournies concernant la formation.

${specificFocus}

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

${template.type === 'initial_final_evaluation' ? `
Exemple de question oui/non pour un questionnaire d'évaluation :
{
  "question": "L'IA générative peut-elle créer du contenu original sans données d'entraînement ?",
  "type": "yes_no",
  "options": ["Oui", "Non"],
  "correct_answer": "Non",
  "is_required": true
}
` : ''}

9. Avant de finaliser le questionnaire, effectuez une révision dans les balises <revision_questionnaire> à l'intérieur de votre bloc de réflexion. Dans cette section :
   - Vérifiez que chaque question est directement liée au contenu et aux objectifs de la formation.
   - Assurez-vous que le nombre de questions correspond exactement à celui spécifié.
   - Confirmez que chaque question à choix multiple respecte le format requis.
   - Pour les évaluations, vérifiez que la réponse correcte est toujours indiquée.
   - Assurez-vous que toutes les questions sont en français et clairement formulées.
   ${template.type === 'initial_final_evaluation' ? '- VÉRIFIEZ que vous avez bien inclus au moins 30% de questions oui/non pour les questionnaires d\'évaluation.' : ''}
   - Vérifiez que les questions correspondent bien aux objectifs spécifiques du type de questionnaire sélectionné.

10. Après la révision, générez le questionnaire final sous forme d'un tableau JSON contenant toutes les questions.

Retournez uniquement un tableau JSON de questions, sans autre texte ni explications.`;

      // Initialiser l'API OpenAI
      const openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      });
      
      // Appeler l'API OpenAI
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
      const formattedQuestions = questions.map((q: any, index: number) => ({
        question_text: q.question,
        question_type: q.type,
        options: q.options,
        correct_answer: q.correct_answer,
        is_required: q.is_required ?? true,
        order_index: index
      }));
      
      // Fonction de validation des questions
      const validateQuestions = (questions: any[]): any[] => {
        return questions.filter(q => {
          // Ensure required fields are present
          if (!q.question_text || !q.question_type) {
            console.log('🔍 [DEBUG] Invalid question - missing required fields:', q);
            return false;
          }
    
          // Validation spécifique selon le type de questionnaire
          if (template.type === 'initial_final_evaluation') {
            // Pour les questionnaires d'évaluation, n'autoriser que les questions à choix multiple et oui/non
            if (q.question_type !== 'multiple_choice' && q.question_type !== 'yes_no') {
              console.log('🔍 [DEBUG] Invalid question type for evaluation:', q.question_type);
              return false;
            }
            
            // Vérifier que chaque question a une réponse correcte
            if (!q.correct_answer) {
              console.log('🔍 [DEBUG] Evaluation question missing correct answer:', q);
              return false;
            }
            
            if (q.question_type === 'multiple_choice') {
              // Ensure multiple choice questions have exactly 4 options
              if (!Array.isArray(q.options) || q.options.length !== 4) {
                console.log('🔍 [DEBUG] Multiple choice question must have exactly 4 options:', q);
                return false;
              }
    
              // Ensure correct answer matches one of the options
              if (!q.options.includes(q.correct_answer)) {
                console.log('🔍 [DEBUG] Multiple choice question correct answer does not match options:', q);
                return false;
              }
            } else if (q.question_type === 'yes_no') {
              // Ensure yes/no questions have correct format
              if (!Array.isArray(q.options) || q.options.length !== 2) {
                q.options = ['Oui', 'Non'];
              } else {
                // Normalize options to ensure they are exactly ['Oui', 'Non']
                const hasOui = q.options.some((opt: string) => opt.toLowerCase() === 'oui');
                const hasNon = q.options.some((opt: string) => opt.toLowerCase() === 'non');
                
                if (!hasOui || !hasNon) {
                  q.options = ['Oui', 'Non'];
                }
              }
              
              // Ensure correct answer is either 'Oui' or 'Non'
              if (!['Oui', 'Non'].includes(q.correct_answer)) {
                console.log('🔍 [DEBUG] Yes/no question correct answer must be "Oui" or "Non":', q);
                return false;
              }
            }
          } else {
            // Pour les questionnaires de positionnement et de satisfaction
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
                const hasOui = q.options.some((opt: string) => opt.toLowerCase() === 'oui');
                const hasNon = q.options.some((opt: string) => opt.toLowerCase() === 'non');
                
                if (!hasOui || !hasNon) {
                  q.options = ['Oui', 'Non'];
                }
              }
            }
            
            // Supprimer la réponse correcte pour les questionnaires de positionnement et de satisfaction
            if (q.correct_answer) {
              console.log('🔍 [DEBUG] Removing correct answer for non-evaluation questionnaire:', q);
              q.correct_answer = null;
            }
          }
    
          return true;
        });
      };
      
      // Validate questions
      const validQuestions = validateQuestions(formattedQuestions);
      
      if (validQuestions.length === 0) {
        throw new Error('Aucune question valide n\'a été générée');
      }
      
      console.log('🔍 [DEBUG] Valid questions:', validQuestions);
      
      // Insérer les questions dans la base de données
      const questionsWithTemplate = validQuestions.map((q: Question, index: number) => ({
            ...q,
            template_id: template.id,
            order_index: index
          }));

          const { error } = await supabase
            .from('questionnaire_questions')
            .insert(questionsWithTemplate);

          if (error) throw error;

    } catch (error) {
      console.error('Error generating questions for template:', error);
    }
  };

  // Fonction pour générer automatiquement les questions pour tous les questionnaires
  const autoGenerateAllQuestionnaires = async () => {
    if (!selectedTraining || templates.length === 0) return;
    
    try {
      setGeneratingQuestionnaires(true);
      setGenerationProgress(0);
      setGenerationStep(0);
      setGenerationSubStep(0);
      
      // Trier les questionnaires dans l'ordre souhaité
      const sortedTemplates = sortQuestionnaires([...templates]);
      
      // Générer les questions pour chaque template séquentiellement
      for (let i = 0; i < sortedTemplates.length; i++) {
        const template = sortedTemplates[i];
        setGenerationStep(i);
        setGenerationSubStep(0);
        
        // Vérifier si le questionnaire a déjà des questions
        const { data, error } = await supabase
          .from('questionnaire_questions')
          .select('id')
          .eq('template_id', template.id);
          
        if (error) throw error;
        
        // Ne générer des questions que si le questionnaire n'en a pas déjà
        if (!data || data.length === 0) {
          // Générer les questions pour ce template
          await generateQuestionsForTemplate(template);
        }
        
        // Mettre à jour la progression
        setGenerationProgress(Math.round(((i + 1) / sortedTemplates.length) * 100));
        
        // Attendre un peu pour que l'utilisateur puisse voir la progression
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setGenerationStep(sortedTemplates.length); // Étape finale
      setGenerationSubStep(0);
      
      // Attendre un peu pour que l'utilisateur voie l'étape finale
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setGeneratingQuestionnaires(false);
      
      // Rafraîchir les questions pour le template sélectionné
      if (selectedTemplate) {
        fetchQuestions(selectedTemplate.id);
      }
    } catch (error) {
      console.error('Error auto-generating questionnaires:', error);
      setError('Une erreur est survenue lors de la génération automatique des questionnaires');
      setGeneratingQuestionnaires(false);
    }
  };

  const fetchQuestions = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('questionnaire_questions')
        .select('*')
        .eq('template_id', templateId)
        .order('order_index');

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('Une erreur est survenue lors du chargement des questions');
    }
  };

  const handleUpdateTemplate = async (template: QuestionnaireTemplate) => {
    try {
      const { error } = await supabase
        .from('questionnaire_templates')
        .update(template)
        .eq('id', template.id);

      if (error) throw error;

      setTemplates(templates.map(t => t.id === template.id ? template : t));
      setSelectedTemplate(template);
      setEditMode(false);
    } catch (error) {
      console.error('Error updating template:', error);
      setError('Une erreur est survenue lors de la mise à jour du questionnaire');
    }
  };

  // Fonction pour mettre à jour une question avec debounce
  const debouncedUpdateQuestion = (updatedQuestion: Question) => {
    // Annuler le timer précédent s'il existe
    if (debounceTimers.current[updatedQuestion.id]) {
      clearTimeout(debounceTimers.current[updatedQuestion.id]);
    }

    // Mettre à jour l'état local immédiatement pour une UI réactive
    setPendingQuestionUpdates(prev => ({
      ...prev,
      [updatedQuestion.id]: updatedQuestion
    }));

    // Mettre à jour l'état des questions pour l'affichage immédiat
    setQuestions(questions.map(q => q.id === updatedQuestion.id ? updatedQuestion : q));

    // Définir un timer pour envoyer la mise à jour à la base de données après un délai
    debounceTimers.current[updatedQuestion.id] = setTimeout(() => {
      handleUpdateQuestion(updatedQuestion);
      // Supprimer la question des mises à jour en attente
      setPendingQuestionUpdates(prev => {
        const newPending = { ...prev };
        delete newPending[updatedQuestion.id];
        return newPending;
      });
    }, 1000); // Délai de 1 seconde
  };

  const handleUpdateQuestion = async (updatedQuestion: Question) => {
    try {
      // Pour les questions oui/non, assurer le format correct
      if (updatedQuestion.question_type === 'yes_no') {
        updatedQuestion.options = ['Oui', 'Non'];
        if (updatedQuestion.correct_answer && !['Oui', 'Non'].includes(updatedQuestion.correct_answer)) {
          updatedQuestion.correct_answer = null;
        }
      }

      const { error } = await supabase
        .from('questionnaire_questions')
        .update(updatedQuestion)
        .eq('id', updatedQuestion.id);

      if (error) throw error;

      // Pas besoin de mettre à jour l'état ici car c'est déjà fait dans debouncedUpdateQuestion
    } catch (error) {
      console.error('Error updating question:', error);
      setError('Une erreur est survenue lors de la mise à jour de la question');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('questionnaire_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      setQuestions(questions.filter(q => q.id !== questionId));
    } catch (error) {
      console.error('Error deleting question:', error);
      setError('Une erreur est survenue lors de la suppression de la question');
    }
  };

  // Fonction pour supprimer toutes les questions d'un questionnaire
  const handleDeleteAllQuestions = async () => {
    if (!selectedTemplate || !window.confirm('Êtes-vous sûr de vouloir supprimer toutes les questions de ce questionnaire ?')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('questionnaire_questions')
        .delete()
        .eq('template_id', selectedTemplate.id);

      if (error) throw error;

      setQuestions([]);
      setError(null);
    } catch (error) {
      console.error('Error deleting all questions:', error);
      setError('Une erreur est survenue lors de la suppression des questions');
    } finally {
      setLoading(false);
    }
  };

  const handleReorderQuestions = async (startIndex: number, endIndex: number) => {
    const newQuestions = Array.from(questions);
    const [removed] = newQuestions.splice(startIndex, 1);
    newQuestions.splice(endIndex, 0, removed);

    // Update order_index for all affected questions
    const updatedQuestions = newQuestions.map((q, index) => ({
      ...q,
      order_index: index
    }));

    setQuestions(updatedQuestions);

    try {
      // Update all questions with new order_index
      const { error } = await supabase
        .from('questionnaire_questions')
        .upsert(updatedQuestions);

      if (error) throw error;
    } catch (error) {
      console.error('Error reordering questions:', error);
      setError('Une erreur est survenue lors de la réorganisation des questions');
      // Revert to original order if error
      fetchQuestions(selectedTemplate!.id);
    }
  };

  // Nettoyer les timers lors du démontage du composant
  useEffect(() => {
    return () => {
      // Annuler tous les timers en attente
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Effet pour vérifier si les questionnaires ont besoin d'être générés automatiquement
  useEffect(() => {
    if (selectedTraining && templates.length > 0) {
      // Vérifier si au moins un questionnaire n'a pas de questions
      const checkAndGenerateQuestionnaires = async () => {
        let needsGeneration = false;
        
        for (const template of templates) {
          const { data, error } = await supabase
            .from('questionnaire_questions')
            .select('id')
            .eq('template_id', template.id);
            
          if (error) {
            console.error('Error checking questions:', error);
            continue;
          }
          
          if (!data || data.length === 0) {
            needsGeneration = true;
            break;
          }
        }
        
        if (needsGeneration) {
          autoGenerateAllQuestionnaires();
        }
      };
      
      checkAndGenerateQuestionnaires();
    }
  }, [templates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner message="Chargement des formations..." />
      </div>
    );
  }

  if (trainings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="w-12 h-12 text-yellow-500" />
        <h2 className="text-xl font-semibold text-gray-900">Aucune formation disponible</h2>
        <p className="text-gray-600 text-center max-w-md">
          Vous devez d'abord créer une formation avant de pouvoir y associer des questionnaires.
        </p>
        <button
          onClick={() => navigate('/admin/trainings')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Créer une formation
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-purple-500" />
          Questionnaires
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Training Grid */}
      {!selectedTraining ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainings.map((training) => (
            <div
              key={training.id}
              onClick={() => setSelectedTraining(training)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{training.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{training.description}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {training.questionnaires?.length || 0} questionnaire(s)
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      training.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {training.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Training Header */}
          <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedTraining(null);
                  setSelectedTemplate(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedTraining.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{selectedTraining.description}</p>
              </div>
            </div>
          </div>

          {/* Loading State for Questionnaire Generation */}
          {generatingQuestionnaires && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 mb-4">
                  {/* Robot animation */}
                  <div className="relative w-16 h-16">
                    {/* Robot head */}
                    <div className="absolute top-0 left-3 w-10 h-8 bg-gray-300 rounded-md">
                      {/* Robot eyes */}
                      <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      {/* Robot antenna */}
                      <div className="absolute -top-2 left-4.5 w-1 h-2 bg-gray-400"></div>
                      <div className="absolute -top-3 left-4.5 w-1.5 h-1 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                    {/* Robot arms */}
                    <div className="absolute top-4 left-0 w-3 h-1 bg-gray-400 origin-right animate-[spin_2s_linear_infinite]"></div>
                    <div className="absolute top-4 right-0 w-3 h-1 bg-gray-400 origin-left animate-[spin_2s_linear_infinite]"></div>
                    {/* Robot legs */}
                    <div className="absolute top-8 left-4 w-2 h-3 bg-gray-400 animate-bounce"></div>
                    <div className="absolute top-8 right-4 w-2 h-3 bg-gray-400 animate-bounce delay-150"></div>
                    {/* Work surface with sparkles */}
                    <div className="absolute top-12 left-3 w-10 h-1 bg-gray-200">
                      <div className="absolute -top-1 left-1 w-1 h-1 bg-yellow-300 animate-ping"></div>
                      <div className="absolute -top-1 left-5 w-1 h-1 bg-yellow-300 animate-ping delay-300"></div>
                      <div className="absolute -top-1 left-9 w-1 h-1 bg-yellow-300 animate-ping delay-700"></div>
                    </div>
                  </div>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {generationStep < generationSteps.length 
                    ? generationSteps[generationStep].title 
                    : "Finalisation des questionnaires"}
                </h3>
                
                <p className="text-gray-500 mb-2 animate-pulse">
                  {generationStep < generationSteps.length - 1 
                    ? `Étape ${generationStep + 1}/${generationSteps.length - 1}${loadingDots}` 
                    : "Terminé !"}
                </p>
                
                <div className="text-sm text-purple-600 mb-4 text-center min-h-[1.5rem]">
                  {generationStep < generationSteps.length && generationSubStep < generationSteps[generationStep].subSteps.length
                    ? generationSteps[generationStep].subSteps[generationSubStep]
                    : ""}
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div 
                    className="bg-purple-600 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${generationProgress}%` }}
                  ></div>
                </div>
                
                <p className="text-sm text-gray-600">
                  Génération automatique des questionnaires avec l'IA en cours...
                </p>
              </div>
            </div>
          )}

          {/* Questionnaires Grid */}
          {!generatingQuestionnaires && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Templates List */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Questionnaires de la formation
                  </h3>
                </div>
                {templates.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">
                      Les questionnaires sont en cours de génération...
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {templates.map((template) => (
                      <li
                        key={template.id}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                          selectedTemplate?.id === template.id ? 'bg-purple-50' : ''
                        }`}
                      >
                        <div className="px-4 py-4 sm:px-6" onClick={() => setSelectedTemplate(template)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <FileText className="h-5 w-5 text-gray-400" />
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {template.title}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Template Editor */}
              {selectedTemplate && (
                <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      {editMode ? (
                        <input
                          type="text"
                          value={selectedTemplate.title || ''}
                          onChange={(e) => setSelectedTemplate({
                            ...selectedTemplate,
                            title: e.target.value
                          })}
                          className="text-lg font-medium text-gray-900 border-b border-gray-300 focus:border-purple-500 focus:outline-none"
                        />
                      ) : (
                        <h3 className="text-lg font-medium text-gray-900">
                          {selectedTemplate.title}
                        </h3>
                      )}
                      <div className="flex items-center space-x-2">
                        {editMode ? (
                          <>
                            <button
                              onClick={() => handleUpdateTemplate(selectedTemplate)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                            >
                              <Save className="h-4 w-4 mr-1.5" />
                              Enregistrer
                            </button>
                            <button
                              onClick={() => setEditMode(false)}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <AlertCircle className="h-4 w-4 mr-1.5" />
                              Annuler
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setEditMode(true)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Edit className="h-4 w-4 mr-1.5" />
                            Modifier
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-5 sm:px-6 space-y-6">
                    {/* Questions List */}
                    <div className="space-y-4">
                      {questions.map((question, index) => (
                        <div
                          key={question.id}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <input
                                  type="text"
                                  value={question.question_text}
                                  onChange={(e) => debouncedUpdateQuestion({
                                    ...question,
                                    question_text: e.target.value
                                  })}
                                  className="text-sm font-medium text-gray-900 border-b border-transparent focus:border-purple-500 focus:outline-none bg-transparent w-full"
                                />
                                <div className="flex items-center space-x-2">
                                  <select
                                    value={question.question_type}
                                    onChange={(e) => debouncedUpdateQuestion({
                                      ...question,
                                      question_type: e.target.value as Question['question_type'],
                                      // Reset options and correct answer when changing type
                                      options: e.target.value === 'multiple_choice' 
                                        ? ['Option 1', 'Option 2', 'Option 3', 'Option 4']
                                        : e.target.value === 'yes_no'
                                          ? ['Oui', 'Non']
                                          : undefined,
                                      correct_answer: null
                                    })}
                                    className="text-sm border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500"
                                  >
                                    {selectedTemplate.type === 'initial_final_evaluation' ? (
                                      <>
                                        <option value="multiple_choice">Choix multiple</option>
                                        <option value="yes_no">Oui/Non</option>
                                      </>
                                    ) : (
                                      <>
                                        <option value="multiple_choice">Choix multiple</option>
                                        <option value="short_answer">Réponse courte</option>
                                        <option value="rating">Note sur 5</option>
                                        <option value="yes_no">Oui/Non</option>
                                      </>
                                    )}
                                  </select>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => index > 0 && handleReorderQuestions(index, index - 1)}
                                      disabled={index === 0}
                                      className={`text-gray-600 hover:text-gray-900 ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      title="Déplacer vers le haut"
                                    >
                                      <ChevronUp className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => index < questions.length - 1 && handleReorderQuestions(index, index + 1)}
                                      disabled={index === questions.length - 1}
                                      className={`text-gray-600 hover:text-gray-900 ${index === questions.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      title="Déplacer vers le bas"
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteQuestion(question.id)}
                                    className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 transition-colors"
                                    title="Supprimer la question"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Question Options */}
                              {question.question_type === 'multiple_choice' && (
                                <div className="space-y-2 mt-4">
                                  {question.options?.map((option, optionIndex) => (
                                    <div key={optionIndex} className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => {
                                          const newOptions = [...(question.options || [])];
                                          newOptions[optionIndex] = e.target.value;
                                          debouncedUpdateQuestion({
                                            ...question,
                                            options: newOptions,
                                            // Reset correct answer if it was this option
                                            correct_answer: question.correct_answer === option 
                                              ? null 
                                              : question.correct_answer
                                          });
                                        }}
                                        className="text-sm text-gray-700 border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500 flex-1"
                                      />
                                      <button
                                        onClick={() => {
                                          const newOptions = question.options?.filter((_, i) => i !== optionIndex);
                                          debouncedUpdateQuestion({
                                            ...question,
                                            options: newOptions,
                                            // Reset correct answer if it was this option
                                            correct_answer: question.correct_answer === option 
                                              ? null 
                                              : question.correct_answer
                                          });
                                        }}
                                        className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 transition-colors"
                                        title="Supprimer cette option"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => {
                                      const newOptions = [...(question.options || []), 'Nouvelle option'];
                                      debouncedUpdateQuestion({
                                        ...question,
                                        options: newOptions
                                      });
                                    }}
                                    className="text-sm text-purple-600 hover:text-purple-700"
                                  >
                                    + Ajouter une option
                                  </button>
                                </div>
                              )}

                              {/* Correct Answer for Multiple Choice or Yes/No */}
                              {(question.question_type === 'multiple_choice' || question.question_type === 'yes_no') && 
                               selectedTemplate.type === 'initial_final_evaluation' && (
                                <div className="mt-4">
                                  <label className="block text-sm font-medium text-gray-700">
                                    Réponse correcte
                                  </label>
                                  <select
                                    value={question.correct_answer || ''}
                                    onChange={(e) => debouncedUpdateQuestion({
                                      ...question,
                                      correct_answer: e.target.value
                                    })}
                                    className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500"
                                  >
                                    <option value="">Sélectionner une réponse</option>
                                    {question.question_type === 'yes_no' ? (
                                      <>
                                        <option value="Oui">Oui</option>
                                        <option value="Non">Non</option>
                                      </>
                                    ) : (
                                      question.options?.map((option, index) => (
                                        <option key={index} value={option}>
                                          {option}
                                        </option>
                                      ))
                                    )}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Question Button */}
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => {
                          const newQuestion = {
                            template_id: selectedTemplate.id,
                            question_text: 'Nouvelle question',
                            question_type: selectedTemplate.type === 'initial_final_evaluation' 
                              ? 'multiple_choice' as const
                              : 'short_answer' as const,
                            options: selectedTemplate.type === 'initial_final_evaluation'
                              ? ['Option 1', 'Option 2', 'Option 3', 'Option 4']
                              : undefined,
                            correct_answer: null,
                            order_index: questions.length,
                            is_required: true
                          };

                          supabase
                            .from('questionnaire_questions')
                            .insert([newQuestion])
                            .select()
                            .single()
                            .then(({ data, error }) => {
                              if (error) {
                                console.error('Error adding question:', error);
                                return;
                              }
                              if (data) {
                                setQuestions([...questions, data]);
                              }
                            });
                        }}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        <Plus className="h-5 w-5 mr-2 text-gray-400" />
                        Ajouter une question
                      </button>
                      
                      <MagicQuestionnaireButton
                        type={selectedTemplate.type}
                        training={selectedTraining}
                        onQuestionsGenerated={(generatedQuestions) => {
                          const questionsWithTemplate = generatedQuestions.map((q, index) => ({
                            ...q,
                            template_id: selectedTemplate.id,
                            order_index: questions.length + index
                          }));
                          
                          supabase
                            .from('questionnaire_questions')
                            .insert(questionsWithTemplate)
                            .then(({ data, error }) => {
                              if (error) {
                                console.error('Error adding questions:', error);
                                return;
                              }
                              fetchQuestions(selectedTemplate.id);
                            });
                        }}
                      />
                      
                      {questions.length > 0 && (
                        <button
                          onClick={handleDeleteAllQuestions}
                          className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <Trash2 className="h-5 w-5 mr-2 text-red-500" />
                          Supprimer toutes les questions
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};