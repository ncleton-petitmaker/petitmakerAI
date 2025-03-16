import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  formatDate, 
  getCurrentDate, 
  getTrainingDates, 
  formatLocation, 
  getObjectives,
  getEvaluationMethods,
  getTrackingMethods,
  getPedagogicalMethods,
  getMaterialElements
} from '../DocumentUtils';
import SafeImage from '../SafeImage';

interface TrainingAgreementTemplateProps {
  training: {
    id: string;
    title: string;
    duration: string;
    trainer_name: string;
    trainer_details?: string;
    location: string | { name: string; city?: string };
    start_date: string | null;
    end_date: string | null;
    objectives?: string[];
    price?: number;
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
      computer?: boolean;
      projector?: boolean;
      whiteboard?: boolean;
      documentation?: boolean;
      computer_provided?: boolean;
      pedagogical_material?: boolean;
      digital_support_provided?: boolean;
    };
  };
  participant: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    status?: string;
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
  organizationSettings?: {
    organization_name: string;
    address?: string;
    postal_code?: string;
    city?: string;
    country?: string;
    siret?: string;
    activity_declaration_number?: string;
    representative_name?: string;
    representative_title?: string;
  };
  participantSignature?: string | null;
  representativeSignature?: string | null;
  viewContext: 'crm' | 'student';
}

/**
 * Template partagé pour la convention de formation
 * 
 * IMPORTANT: Ce composant est utilisé à la fois par l'interface CRM et l'interface apprenant
 * pour garantir une cohérence parfaite entre les documents.
 * 
 * - Dans l'interface CRM (viewContext='crm'), le représentant de l'organisme peut signer le document
 * - Dans l'interface apprenant (viewContext='student'), l'apprenant peut signer le document
 */
export const TrainingAgreementTemplate: React.FC<TrainingAgreementTemplateProps> = ({
  training,
  participant,
  company,
  organizationSettings,
  participantSignature,
  representativeSignature,
  viewContext = 'student'
}) => {
  const [repSignatureLoaded, setRepSignatureLoaded] = useState(false);
  const [partSignatureLoaded, setPartSignatureLoaded] = useState(false);

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

  const getLocationDisplay = () => {
    if (typeof training.location === 'string') {
      return training.location;
    } else if (training.location && typeof training.location === 'object') {
      return `${training.location.name}${training.location.city ? `, ${training.location.city}` : ''}`;
    }
    return 'Lieu à définir';
  };

  const getParticipantCompanyDisplay = () => {
    // Si un objet d'entreprise complet est fourni, l'utiliser en priorité
    if (company && company.name) {
      return company.name;
    }
    
    // Sinon, essayer d'obtenir le nom de l'entreprise à partir du participant
    if (participant.company) {
      if (typeof participant.company === 'string') {
        return participant.company;
      }
      
      // Vérification de sécurité pour le typage TypeScript
      if (typeof participant.company === 'object' && participant.company !== null) {
        // Utiliser une assertion de type pour éviter l'erreur TypeScript
        const companyObj = participant.company as { name?: string };
        if (companyObj.name) {
          return companyObj.name;
        }
      }
    }
    
    // Valeur par défaut
    return 'Entreprise du stagiaire';
  };

  // Fonction pour formater l'adresse complète de l'organisme de formation
  const getOrganizationAddress = () => {
    if (!organizationSettings) return 'N/A';
    
    const parts = [];
    if (organizationSettings.address) parts.push(organizationSettings.address);
    if (organizationSettings.postal_code) parts.push(organizationSettings.postal_code);
    if (organizationSettings.city) parts.push(organizationSettings.city);
    if (organizationSettings.country) parts.push(organizationSettings.country);
    
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  // Fonction pour formater l'adresse complète de l'entreprise
  const getCompanyAddress = () => {
    if (!company) return 'N/A';
    
    const parts = [];
    if (company.address) parts.push(company.address);
    if (company.postal_code) parts.push(company.postal_code);
    if (company.city) parts.push(company.city);
    if (company.country) parts.push(company.country);
    
    return parts.length > 0 ? parts.join(', ') : 'N/A';
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
      
      <div className="mb-6 text-left">
        <p className="mb-2"><strong>Entre</strong></p>
        <p className="mb-1">L'organisme de formation : {organizationSettings?.organization_name || 'PETITMAKER'}</p>
        <p className="mb-1">Numéro de déclaration d'activité de formation : {organizationSettings?.activity_declaration_number || 'N/A'}</p>
        <p className="mb-1">Numéro SIRET de l'organisme de formation : {organizationSettings?.siret || 'N/A'}</p>
        <p className="mb-1">Adresse de l'organisme de formation : {getOrganizationAddress()}</p>
        {organizationSettings?.representative_name && (
          <p className="mb-1">Représenté par : {organizationSettings.representative_name}</p>
        )}
      </div>
      
      <div className="mb-6 text-left">
        <p className="mb-2"><strong>Et</strong></p>
        <p className="mb-1">L'entreprise : {company?.name || getParticipantCompanyDisplay()}</p>
        <p className="mb-1">Adresse de l'entreprise : {getCompanyAddress()}</p>
        <p className="mb-1">SIRET de l'entreprise : {company?.siret || 'N/A'}</p>
        {company?.contact_name && <p className="mb-1">Représentant : {company.contact_name}</p>}
      </div>
      
      <div className="mb-6 text-left">
        <p className="mb-2">Pour le(s) bénéficiaire(s) : (ci-après dénommé(s) le(s) stagiaire(s))</p>
        <table className="w-full border mt-2">
          <tbody>
            <tr>
              <th className="border p-2 text-center">Stagiaire</th>
              <th className="border p-2 text-center">Fonction</th>
            </tr>
            <tr>
              <td className="border p-2 text-center">{participant.first_name} {participant.last_name}</td>
              <td className="border p-2 text-center">{participant.job_position || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="mt-8 text-left">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">I - OBJET</h2>
        <p className="mb-2">L'action de formation entre dans la catégorie : « Les actions de formation » prévue à l'article L.6313-1 du Code du travail.</p>
        <p className="mb-2">En exécution de la présente convention, l'organisme de formation s'engage à organiser l'action de formation professionnelle intitulée : {training.title}</p>
      </div>
      
      <div className="mt-8 text-left">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">II - NATURE ET CARACTÉRISTIQUES DE L'ACTION DE FORMATION</h2>
        <p className="mb-2">Permettre au stagiaire de :</p>
        <ul className="list-disc pl-8 mt-2 mb-4">
          {objectives.map((objective, index) => (
            <li key={index} className="mb-1">{objective}</li>
          ))}
        </ul>
        
        <p className="mb-2">La durée de la formation est fixée à {training.duration}</p>
        <p className="mb-2">Horaires de Stage : de 9h00 à 12h30 et de 13h30 à 17h00</p>
        
        <p className="mb-2">Le programme détaillé de l'action de formation figure en annexe de la présente convention.</p>
        
        {training.price && (
          <p className="mb-2">Prix de la formation : {typeof training.price === 'number' ? `${training.price} €` : training.price}</p>
        )}
      </div>
      
      <div className="mt-8 text-left">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">III - NIVEAU DE CONNAISSANCES PRÉALABLES NÉCESSAIRE</h2>
        <p className="mb-2">Aucun prérequis n'est nécessaire.</p>
      </div>
      
      <div className="mt-8 text-left">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">IV - ORGANISATION DE L'ACTION DE FORMATION</h2>
        <p className="mb-2">L'action de formation aura lieu (dates ou période) : {getTrainingDates()}</p>
        <p className="mb-2">Lieu de formation : {getLocationDisplay()}</p>
        
        <p className="mb-4 italic">Dans le cas où la formation a lieu au sein de l'entreprise bénéficiaire, l'entreprise s'engage à assurer la sécurité des participants. L'environnement de la formation doit se dérouler dans des conditions techniques et sanitaires appropriées.</p>
        
        <p className="mb-2">Les conditions générales dans lesquelles la formation est dispensée, notamment les moyens pédagogiques et techniques, sont les suivantes :</p>
        <ul className="list-disc pl-8 mt-2 mb-4">
          <li className="mb-1">Réflexions et travaux sur des cas pratiques</li>
          {pedagogicalMethods.map((method, index) => (
            <li key={index} className="mb-1">{method}</li>
          ))}
        </ul>
        
        {materialElements.length > 0 && (
          <>
            <p className="mb-2">Éléments matériels :</p>
            <ul className="list-disc pl-8 mt-2 mb-4">
              {materialElements.map((element, index) => (
                <li key={index} className="mb-1">{element}</li>
              ))}
            </ul>
          </>
        )}

        <p className="mb-2">Formateur : {training.trainer_name}</p>
      </div>
      
      {evaluationMethods.length > 0 && (
        <div className="mt-8 text-left">
          <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">V - MOYENS PERMETTANT D'APPRÉCIER LES RÉSULTATS DE L'ACTION</h2>
          <p className="mb-2">L'appréciation des résultats se fera à travers :</p>
          <ul className="list-disc pl-8 mt-2 mb-4">
            {evaluationMethods.map((method, index) => (
              <li key={index} className="mb-1">{method}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="flex justify-between mt-12">
        <div className="w-1/2 pr-4 text-left">
          <p className="mb-2"><strong>Pour l'organisme de formation</strong></p>
          <p className="mb-2">Nom et qualité du signataire : {organizationSettings?.representative_name || 'Représentant légal'}</p>
          <div className="mt-2 border border-gray-300 p-2 bg-white h-28 relative" id="representative-signature-container">
            {representativeSignature && typeof representativeSignature === 'string' && representativeSignature.startsWith('http') ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <SafeImage 
                  src={representativeSignature}
                  alt="Signature du représentant"
                  className={`max-h-20 max-w-[90%] object-contain transition-opacity duration-300 ${repSignatureLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => {
                    setTimeout(() => setRepSignatureLoaded(true), 100);
                  }}
                />
              </div>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-400 italic text-center">
                  {viewContext === 'crm' ? "Signature requise" : "En attente de signature du formateur"}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="w-1/2 pl-4 text-left">
          <p className="mb-2"><strong>Pour le stagiaire</strong></p>
          <p className="mb-2">Nom : {participant.first_name} {participant.last_name}</p>
          <div className="mt-2 border border-gray-300 p-2 bg-white h-28 relative" id="participant-signature-container">
            {participantSignature && typeof participantSignature === 'string' && participantSignature.startsWith('http') ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <SafeImage 
                  src={participantSignature}
                  alt="Signature du stagiaire"
                  className={`max-h-20 max-w-[90%] object-contain transition-opacity duration-300 ${partSignatureLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => {
                    setTimeout(() => setPartSignatureLoaded(true), 100);
                  }}
                />
              </div>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-400 italic text-center">
                  {viewContext === 'crm' ? "Signature requise" : "Signature requise"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 