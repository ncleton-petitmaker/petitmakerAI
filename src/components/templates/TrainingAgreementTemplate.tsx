import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TrainingAgreementTemplateProps {
  training: {
    id: string;
    title: string;
    duration: string;
    trainer_name: string;
    location: string;
    start_date: string | null;
    end_date: string | null;
    objectives?: string[];
    content?: string;
    evaluation_methods?: {
      profile_evaluation?: boolean;
      skills_evaluation?: boolean;
      knowledge_evaluation?: boolean;
      satisfaction_survey?: boolean;
    };
    tracking_methods?: {
      attendance_sheet?: boolean;
      completion_certificate?: boolean;
    };
    pedagogical_methods?: {
      needs_evaluation?: boolean;
      theoretical_content?: boolean;
      practical_exercises?: boolean;
      case_studies?: boolean;
      experience_sharing?: boolean;
      digital_support?: boolean;
    };
    material_elements?: {
      computer_provided?: boolean;
      pedagogical_material?: boolean;
      digital_support_provided?: boolean;
    };
  };
  participant: {
    id: string;
    first_name: string;
    last_name: string;
    job_position?: string;
    company?: string;
  };
  company?: {
    name: string;
    address?: string;
    postal_code?: string;
    city?: string;
    country?: string;
    siret?: string;
    contact_name?: string;
  };
  organizationSettings: {
    organization_name?: string;
    siret?: string;
    address?: string;
    representative_name?: string;
    activity_declaration_number?: string;
  };
  participantSignature?: string | null;
}

export const TrainingAgreementTemplate: React.FC<TrainingAgreementTemplateProps> = ({
  training,
  participant,
  company,
  organizationSettings,
  participantSignature
}) => {
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
    } else {
      return 'Dates à définir';
    }
  };

  const getObjectives = () => {
    if (Array.isArray(training.objectives) && training.objectives.length > 0) {
      return training.objectives;
    }
    return ['Objectifs à définir'];
  };

  const getEvaluationMethods = () => {
    const methods = [];
    
    if (training.evaluation_methods?.profile_evaluation) methods.push("Évaluation du profil avant formation");
    if (training.evaluation_methods?.skills_evaluation) methods.push("Évaluation des compétences acquises");
    if (training.evaluation_methods?.knowledge_evaluation) methods.push("Évaluation des connaissances");
    if (training.evaluation_methods?.satisfaction_survey) methods.push("Questionnaire de satisfaction");
    
    return methods.length > 0 ? methods : ["Évaluation à définir"];
  };

  const getPedagogicalMethods = () => {
    const methods = [];
    
    if (training.pedagogical_methods?.needs_evaluation) methods.push("Évaluation des besoins");
    if (training.pedagogical_methods?.theoretical_content) methods.push("Apports théoriques");
    if (training.pedagogical_methods?.practical_exercises) methods.push("Exercices pratiques");
    if (training.pedagogical_methods?.case_studies) methods.push("Études de cas");
    if (training.pedagogical_methods?.experience_sharing) methods.push("Partage d'expérience");
    if (training.pedagogical_methods?.digital_support) methods.push("Support numérique");
    
    return methods.length > 0 ? methods : ["Méthodes pédagogiques à définir"];
  };

  const getMaterialElements = () => {
    const elements = [];
    
    if (training.material_elements?.computer_provided) elements.push("Ordinateur fourni");
    if (training.material_elements?.pedagogical_material) elements.push("Matériel pédagogique");
    if (training.material_elements?.digital_support_provided) elements.push("Support numérique fourni");
    
    return elements.length > 0 ? elements : ["Éléments matériels à définir"];
  };

  const objectives = getObjectives();
  const evaluationMethods = getEvaluationMethods();
  const pedagogicalMethods = getPedagogicalMethods();
  const materialElements = getMaterialElements();

  return (
    <div className="bg-white p-8 shadow-sm border border-gray-200 mx-auto" style={{ maxWidth: '800px' }}>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">CONVENTION DE FORMATION PROFESSIONNELLE</h1>
        <p className="text-sm text-gray-600">(Articles L.6353-1 du Code du travail)</p>
      </div>
      
      <div className="mb-6">
        <p><strong>Entre</strong></p>
        <p>L'organisme de formation : <span className="bg-yellow-100">{organizationSettings.organization_name || 'PETITMAKER'}</span></p>
        <p>Numéro de déclaration d'activité de formation : <span className="bg-yellow-100">{organizationSettings.activity_declaration_number || 'N/A'}</span></p>
        <p>Numéro SIRET de l'organisme de formation : <span className="bg-yellow-100">{organizationSettings.siret || 'N/A'}</span></p>
        <p>Adresse de l'organisme de formation : <span className="bg-yellow-100">{organizationSettings.address || 'N/A'}</span></p>
      </div>
      
      <div className="mb-6">
        <p><strong>Et</strong></p>
        <p>L'entreprise : <span className="bg-yellow-100">{company?.name || participant.company || 'Entreprise du stagiaire'}</span></p>
        <p>Adresse de l'entreprise : <span className="bg-yellow-100">{company?.address || 'N/A'}</span></p>
        <p>SIRET de l'entreprise : <span className="bg-yellow-100">{company?.siret || 'N/A'}</span></p>
      </div>
      
      <div className="mb-6">
        <p>Pour le(s) bénéficiaire(s) : (ci-après dénommé(s) le(s) stagiaire(s))</p>
        <table className="w-full border mt-2">
          <tr>
            <th className="border p-2 text-center">Stagiaire</th>
            <th className="border p-2 text-center">Fonction</th>
          </tr>
          <tr>
            <td className="border p-2 text-center bg-yellow-100">{participant.first_name} {participant.last_name}</td>
            <td className="border p-2 text-center bg-yellow-100">{participant.job_position || 'N/A'}</td>
          </tr>
        </table>
      </div>
      
      <div className="mt-8">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">I - OBJET</h2>
        <p>L'action de formation entre dans la catégorie : « Les actions de formation » prévue à l'article L.6313-1 du Code du travail.</p>
        <p className="mt-2">En exécution de la présente convention, l'organisme de formation s'engage à organiser l'action de formation professionnelle intitulée : <span className="bg-yellow-100">{training.title}</span></p>
      </div>
      
      <div className="mt-8">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">II - NATURE ET CARACTÉRISTIQUES DE L'ACTION DE FORMATION</h2>
        <p>Permettre au stagiaire de :</p>
        <ul className="list-disc pl-8 mt-2">
          {objectives.map((objective, index) => (
            <li key={index} className="mb-1 bg-yellow-100">{objective}</li>
          ))}
        </ul>
        
        <p className="mt-4">La durée de la formation est fixée à <span className="bg-yellow-100">{training.duration}</span></p>
        <p className="mt-1">Horaires de Stage : <span className="bg-yellow-100">de 9h00 à 12h30 et de 13h30 à 17h00</span></p>
        
        <p className="mt-4">Le programme détaillé de l'action de formation figure en annexe de la présente convention.</p>
      </div>
      
      <div className="mt-8">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">III - NIVEAU DE CONNAISSANCES PRÉALABLES NÉCESSAIRE</h2>
        <p>Aucun prérequis n'est nécessaire.</p>
      </div>
      
      <div className="mt-8">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">IV - ORGANISATION DE L'ACTION DE FORMATION</h2>
        <p>L'action de formation aura lieu (dates ou période) : <span className="bg-yellow-100">{getTrainingDates()}</span></p>
        <p>Lieu de formation : <span className="bg-yellow-100">{training.location}</span></p>
        
        <p className="mt-4 italic">Dans le cas où la formation a lieu au sein de l'entreprise bénéficiaire, l'entreprise s'engage à assurer la sécurité des participants. L'environnement de la formation doit se dérouler dans des conditions techniques et sanitaires appropriées.</p>
        
        <p className="mt-4">Les conditions générales dans lesquelles la formation est dispensée, notamment les moyens pédagogiques et techniques, sont les suivantes :</p>
        <ul className="list-disc pl-8 mt-2">
          <li>Réflexions et travaux sur des cas pratiques</li>
          {pedagogicalMethods.map((method, index) => (
            <li key={index} className="mb-1">{method}</li>
          ))}
        </ul>
      </div>
      
      <div className="flex justify-between mt-12">
        <div className="w-1/2">
          <p><strong>Pour l'organisme de formation</strong></p>
          <p className="mt-2">Nom et qualité du signataire</p>
          <div className="mt-16">Signature et cachet</div>
        </div>
        <div className="w-1/2">
          <p><strong>Pour l'entreprise</strong></p>
          <p className="mt-2">Nom et qualité du signataire</p>
          <div className="mt-16">Signature et cachet</div>
        </div>
      </div>
      
      {participantSignature && (
        <div className="mt-8 border-t pt-6">
          <p><strong>Signature du stagiaire</strong></p>
          <div className="mt-2 border p-2">
            <img 
              src={participantSignature} 
              alt="Signature du stagiaire" 
              className="max-h-20 my-2" 
            />
          </div>
        </div>
      )}
    </div>
  );
}; 