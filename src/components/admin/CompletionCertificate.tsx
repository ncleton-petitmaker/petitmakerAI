import React, { useRef } from 'react';
import { X, Download } from 'lucide-react';
import { generateWordLikePDF } from './pdfGenerator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CompletionCertificateProps {
  training: {
    id: string;
    title: string;
    duration: string;
    trainer_name: string;
    location: string;
    start_date: string | null;
    end_date: string | null;
    objectives: string[];
    evaluation_methods?: {
      profile_evaluation: boolean;
      skills_evaluation: boolean;
      knowledge_evaluation: boolean;
      satisfaction_survey: boolean;
    };
    tracking_methods?: {
      attendance_sheet: boolean;
      completion_certificate: boolean;
    };
    pedagogical_methods?: {
      needs_evaluation: boolean;
      theoretical_content: boolean;
      practical_exercises: boolean;
      case_studies: boolean;
      experience_sharing: boolean;
      digital_support: boolean;
    };
    material_elements?: {
      computer_provided: boolean;
      pedagogical_material: boolean;
      digital_support_provided: boolean;
    };
  };
  participant: {
    id: string;
    first_name: string;
    last_name: string;
    job_position?: string;
  };
  onCancel: () => void;
}

export const CompletionCertificate: React.FC<CompletionCertificateProps> = ({
  training,
  participant,
  onCancel
}) => {
  const pdfContentRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!pdfContentRef.current) return;
    
    try {
      // Générer un nom de fichier basé sur le nom du participant et le titre de la formation
      const fileName = `Attestation_${participant.first_name}_${participant.last_name}_${training.title.replace(/\s+/g, '_')}.pdf`;
      
      // Utiliser la fonction pour générer un PDF
      await generateWordLikePDF(pdfContentRef.current, fileName);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: fr });
    } catch (e) {
      console.error('Erreur de formatage de date:', e);
      return dateString;
    }
  };

  const getCurrentDate = () => {
    return format(new Date(), 'dd MMMM yyyy', { locale: fr });
  };

  const getTrainingDates = () => {
    const startDate = formatDate(training.start_date);
    const endDate = formatDate(training.end_date);
    
    if (startDate && endDate && startDate !== endDate) {
      return `du ${startDate} au ${endDate}`;
    } else if (startDate) {
      return `le ${startDate}`;
    }
    return '';
  };

  // Fonction pour extraire le prénom du formateur
  const getTrainerFirstName = () => {
    if (!training.trainer_name) return '';
    const parts = training.trainer_name.split(' ');
    return parts[0] || '';
  };

  // Fonction pour traiter les objectifs
  const getObjectives = () => {
    console.log("CompletionCertificate - Données de formation complètes:", training);
    console.log("CompletionCertificate - Type des objectifs:", typeof training.objectives);
    console.log("CompletionCertificate - Valeur des objectifs:", training.objectives);
    
    // Si objectives est undefined ou null
    if (!training.objectives) {
      console.log("CompletionCertificate - Objectifs non définis, utilisation des valeurs par défaut");
      return ['[Objectif 1]', '[Objectif 2]', '[Objectif 3]'];
    }
    
    // Si objectives est déjà un tableau
    if (Array.isArray(training.objectives)) {
      console.log("CompletionCertificate - Objectifs sous forme de tableau:", training.objectives);
      return training.objectives.length > 0 
        ? training.objectives 
        : ['[Objectif 1]', '[Objectif 2]', '[Objectif 3]'];
    }
    
    // Si objectives est une chaîne de caractères
    if (typeof training.objectives === 'string') {
      const objectivesStr = training.objectives as string;
      console.log("CompletionCertificate - Objectifs sous forme de chaîne:", objectivesStr);
      
      // Si la chaîne est vide
      if (!objectivesStr.trim()) {
        return ['[Objectif 1]', '[Objectif 2]', '[Objectif 3]'];
      }
      
      // Essayer de parser comme JSON
      try {
        const parsed = JSON.parse(objectivesStr);
        console.log("CompletionCertificate - Parsing JSON réussi:", parsed);
        
        // Si c'est un tableau
        if (Array.isArray(parsed)) {
          return parsed.length > 0 
            ? parsed 
            : ['[Objectif 1]', '[Objectif 2]', '[Objectif 3]'];
        }
        
        // Si c'est un objet
        if (typeof parsed === 'object' && parsed !== null) {
          const values = Object.values(parsed);
          if (values.length > 0) {
            return values;
          }
        }
      } catch (e) {
        // Si ce n'est pas du JSON valide
        console.log("CompletionCertificate - Échec du parsing JSON, traitement comme texte");
      }
      
      // Vérifier si la chaîne contient des sauts de ligne ou des puces
      if (objectivesStr.includes('\n') || objectivesStr.includes('•')) {
        // Diviser par sauts de ligne et nettoyer les puces
        return objectivesStr
          .split('\n')
          .map((line: string) => line.trim().replace(/^•\s*/, ''))
          .filter((line: string) => line.length > 0);
      }
      
      // Sinon, utiliser comme un seul objectif
      return [objectivesStr];
    }
    
    // Pour tout autre type
    console.log("CompletionCertificate - Type non géré, conversion en chaîne");
    return [String(training.objectives)];
  };

  const objectives = getObjectives();

  // Fonction pour obtenir les méthodes d'évaluation activées
  const getEvaluationMethods = () => {
    const methods = [];
    if (training.evaluation_methods?.profile_evaluation) {
      methods.push("Évaluation individuelle du profil, des attentes et des besoins");
    }
    if (training.evaluation_methods?.skills_evaluation) {
      methods.push("Évaluation des compétences en début et fin de formation");
    }
    if (training.evaluation_methods?.knowledge_evaluation) {
      methods.push("Évaluation des connaissances à chaque étape");
    }
    if (training.evaluation_methods?.satisfaction_survey) {
      methods.push("Questionnaire d'évaluation de la satisfaction");
    }
    return methods.length > 0 ? methods : ["Évaluation non spécifiée"];
  };

  // Fonction pour obtenir les méthodes de suivi activées
  const getTrackingMethods = () => {
    const methods = [];
    if (training.tracking_methods?.attendance_sheet) {
      methods.push("Feuille d'émargement");
    }
    if (training.tracking_methods?.completion_certificate) {
      methods.push("Attestation de fin de formation");
    }
    return methods.length > 0 ? methods : ["Méthode de suivi non spécifiée"];
  };

  // Fonction pour obtenir les méthodes pédagogiques activées
  const getPedagogicalMethods = () => {
    const methods = [];
    if (training.pedagogical_methods?.needs_evaluation) {
      methods.push("Évaluation des besoins et du profil du participant");
    }
    if (training.pedagogical_methods?.theoretical_content) {
      methods.push("Apport théorique et méthodologique");
    }
    if (training.pedagogical_methods?.practical_exercises) {
      methods.push("Questionnaires et exercices pratiques");
    }
    if (training.pedagogical_methods?.case_studies) {
      methods.push("Études de cas");
    }
    if (training.pedagogical_methods?.experience_sharing) {
      methods.push("Retours d'expériences");
    }
    if (training.pedagogical_methods?.digital_support) {
      methods.push("Support de cours numérique");
    }
    return methods.length > 0 ? methods : ["Méthode pédagogique non spécifiée"];
  };

  // Fonction pour obtenir les éléments matériels activés
  const getMaterialElements = () => {
    const elements = [];
    if (training.material_elements?.computer_provided) {
      elements.push("Mise à disposition du matériel informatique");
    }
    if (training.material_elements?.pedagogical_material) {
      elements.push("Mise à disposition du matériel pédagogique");
    }
    if (training.material_elements?.digital_support_provided) {
      elements.push("Support de cours au format numérique");
    }
    return elements.length > 0 ? elements : ["Élément matériel non spécifié"];
  };

  const evaluationMethods = getEvaluationMethods();
  const trackingMethods = getTrackingMethods();
  const pedagogicalMethods = getPedagogicalMethods();
  const materialElements = getMaterialElements();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-[100] overflow-hidden p-0 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[100vh] sm:max-h-[90vh] overflow-hidden flex flex-col m-0 sm:m-4">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">
            Attestation de fin - {participant.first_name} {participant.last_name}
          </h3>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={generatePDF}
              className="text-blue-600 hover:text-blue-800 flex items-center"
              title="Générer un PDF"
            >
              <Download className="h-5 w-5 mr-1" />
              <span className="hidden sm:inline">Générer PDF</span>
            </button>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
              title="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div ref={pdfContentRef} className="bg-white p-6 mx-auto max-w-3xl">
            {/* Contenu de l'attestation */}
            <div className="border border-black text-center p-2 mb-6">
              <h2 className="text-xl font-bold">Attestation de fin de formation</h2>
            </div>
            
            <div className="text-right mb-6">
              À {training.location || 'Paris'}, le {getCurrentDate()}
            </div>
            
            <div className="mb-8 text-left">
              <p>
                Je soussigné, Monsieur {training.trainer_name || '[Nom du formateur]'}, Gérant de l'organisme de formation {getTrainerFirstName() || '[Nom de l\'organisme]'},
                atteste que Madame/Monsieur {participant.first_name} {participant.last_name} a bien suivi une action de formation {getTrainingDates()}
                concernant :
              </p>
            </div>
            
            <div className="mb-4 text-left">
              <p className="font-bold">• Intitulé de la formation : {training.title}</p>
            </div>
            
            <div className="mb-4 text-left">
              <p className="font-bold">• Nature de la formation : </p>
              <p>L'action de formation entre dans la catégorie « Action d'adaptation et de développement des compétences » prévue à l'article L.6313-1 du Code du Travail</p>
            </div>
            
            <div className="mb-4 text-left">
              <p className="font-bold">• Durée de la formation : {training.duration}</p>
            </div>
            
            <div className="mb-4 text-left">
              <p className="font-bold">• Objectifs de la formation :</p>
              <p>Permettre au stagiaire de :</p>
              <ul className="list-none pl-6">
                {objectives.map((objective, index) => (
                  <li key={index} className="mb-1">➢ {objective}</li>
                ))}
              </ul>
            </div>
            
            <div className="mb-4 text-left">
              <p className="font-bold">• Méthodes d'évaluation :</p>
              <ul className="list-none pl-6">
                {evaluationMethods.map((method, index) => (
                  <li key={index} className="mb-1">➢ {method}</li>
                ))}
              </ul>
            </div>
            
            <div className="mb-4 text-left">
              <p className="font-bold">• Méthodes de suivi :</p>
              <ul className="list-none pl-6">
                {trackingMethods.map((method, index) => (
                  <li key={index} className="mb-1">➢ {method}</li>
                ))}
              </ul>
            </div>
            
            <div className="mb-4 text-left">
              <p className="font-bold">• Moyens pédagogiques :</p>
              <ul className="list-none pl-6">
                {pedagogicalMethods.map((method, index) => (
                  <li key={index} className="mb-1">➢ {method}</li>
                ))}
              </ul>
            </div>
            
            <div className="mb-4 text-left">
              <p className="font-bold">• Éléments matériels :</p>
              <ul className="list-none pl-6">
                {materialElements.map((element, index) => (
                  <li key={index} className="mb-1">➢ {element}</li>
                ))}
              </ul>
            </div>
            
            <div className="mb-8 text-left">
              <p className="font-bold">• Résultat de l'évaluation des acquis de la formation :</p>
              <p>Le participant maîtrise les points et thématiques abordés durant la formation.</p>
            </div>
            
            <div className="mb-8 text-left">
              <p>Il n'y a pas d'absence</p>
              <p>Pour servir et valoir ce que de droit</p>
            </div>
            
            <div className="text-right mt-12">
              <p className="font-bold">M. {training.trainer_name || '[Nom du formateur]'}</p>
              <p>Le dirigeant</p>
              <div className="h-16 mt-2 border-b border-gray-300">
                {/* Espace pour la signature */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 