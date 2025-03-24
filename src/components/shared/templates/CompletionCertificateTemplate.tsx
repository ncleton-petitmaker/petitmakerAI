import React from 'react';
import { 
  Training, 
  Participant, 
  OrganizationSettings,
  formatDate,
  getCurrentDate,
  getObjectives,
  getEvaluationMethods,
  getTrackingMethods,
  getPedagogicalMethods,
  getMaterialElements,
  getTrainingDates 
} from '../DocumentUtils';

interface CompletionCertificateTemplateProps {
  training: Training;
  participant: Participant;
  organizationSettings?: OrganizationSettings;
  // Signatures selon le contexte (CRM ou apprenant)
  trainerSignature?: string | null;
  viewContext?: 'crm' | 'student';
}

/**
 * Template partagé pour l'attestation de fin de formation
 * 
 * IMPORTANT: Ce composant est utilisé à la fois par l'interface CRM et l'interface apprenant
 * pour garantir une cohérence parfaite entre les documents.
 * 
 * - Dans l'interface CRM (viewContext='crm'), le formateur peut signer le document
 * - Dans l'interface apprenant (viewContext='student'), l'apprenant peut visualiser le document
 *   mais ne peut pas le signer (la signature du formateur est déjà présente si celui-ci a signé)
 */
export const CompletionCertificateTemplate: React.FC<CompletionCertificateTemplateProps> = ({
  training,
  participant,
  organizationSettings,
  trainerSignature,
  viewContext
}) => {
  // Utiliser les fonctions utilitaires partagées
  const formattedDates = getTrainingDates(training.start_date, training.end_date);
  const objectives = getObjectives(training.objectives);
  const evaluationMethods = getEvaluationMethods(training.evaluation_methods);
  const trackingMethods = getTrackingMethods(training.tracking_methods);
  const pedagogicalMethods = getPedagogicalMethods(training.pedagogical_methods);
  const materialElements = getMaterialElements(training.material_elements);
  
  // Formatage de la localisation
  const getFormattedLocation = (location: string | { name: string, city?: string }): string => {
    if (typeof location === 'string') {
      return location;
    }
    return location.city ? `${location.name}, ${location.city}` : location.name;
  };

  // Information sur le participant
  const getParticipantInfo = (): JSX.Element => {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-bold">Identité du participant</h3>
        <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
          <p><strong>Nom:</strong> {participant.last_name}</p>
          <p><strong>Prénom:</strong> {participant.first_name}</p>
          {participant.job_position && (
            <p><strong>Poste:</strong> {participant.job_position}</p>
          )}
          {participant.company && (
            <p><strong>Entreprise:</strong> {participant.company}</p>
          )}
        </div>
      </div>
    );
  };

  // En-tête du document
  const renderHeader = (): JSX.Element => {
    return (
      <div className="flex justify-between items-start">
        {/* Logo et coordonnées de l'organisme */}
        <div className="w-1/2">
          <h2 className="text-xl font-bold">{organizationSettings?.organization_name || 'Petit Maker AI'}</h2>
          <p className="text-sm text-gray-600">
            {organizationSettings?.address}, {organizationSettings?.postal_code} {organizationSettings?.city}
          </p>
          <p className="text-sm text-gray-600">SIRET: {organizationSettings?.siret || 'En cours d\'attribution'}</p>
          <p className="text-sm text-gray-600">Déclaration d'activité: {organizationSettings?.activity_declaration_number || 'En cours d\'attribution'}</p>
        </div>
        
        {/* Informations sur le bénéficiaire */}
        <div className="w-1/2 text-right">
          <h3 className="font-bold">{participant.first_name} {participant.last_name}</h3>
          {participant.company && (
            <p className="text-sm text-gray-600">{participant.company}</p>
          )}
          <p className="text-sm text-gray-600">{getCurrentDate()}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-8 shadow-sm border border-gray-200 mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">ATTESTATION DE FIN DE FORMATION</h1>
        <p className="text-sm text-gray-600">(Article L.6353-1 du Code du travail)</p>
      </div>
      
      <div className="mb-6">
        {renderHeader()}
        
        <p className="font-semibold text-center">
          {organizationSettings?.representative_name && (
            <span>Je soussigné(e), {organizationSettings.representative_name}, {organizationSettings.representative_title || 'Directeur'} de l'organisme de formation </span>
          )}
          {!organizationSettings?.representative_name && (
            <span>L'organisme de formation </span>
          )}
          <span className="font-bold">{organizationSettings?.organization_name || 'Petit Maker AI'}</span>, atteste que :
        </p>
        
        <div className="my-6 text-center">
          <p className="text-xl font-bold">{participant.first_name} {participant.last_name}</p>
          {participant.job_position && <p className="italic">{participant.job_position}</p>}
          {participant.company && <p className="italic">{participant.company}</p>}
        </div>
        
        <p className="text-center">A suivi la formation intitulée :</p>
        
        <div className="my-6 text-center">
          <p className="font-bold text-xl my-2">{training.title}</p>
          <p>{formattedDates}</p>
          <p>Durée : {training.duration}</p>
          <p>Lieu : {getFormattedLocation(training.location)}</p>
        </div>
      </div>
      
      <div className="mb-8 text-left">
        <p className="font-bold">• Objectifs de la formation :</p>
        <ul className="list-none pl-6">
          {objectives.map((objective, index) => (
            <li key={index} className="mb-1">➢ {objective}</li>
          ))}
        </ul>
      </div>
      
      <div className="mb-8 text-left">
        <p className="font-bold">• Méthodes d'évaluation :</p>
        <ul className="list-none pl-6">
          {evaluationMethods.map((method, index) => (
            <li key={index} className="mb-1">➢ {method}</li>
          ))}
        </ul>
      </div>
      
      <div className="mb-8 text-left">
        <p className="font-bold">• Méthodes de suivi :</p>
        <ul className="list-none pl-6">
          {trackingMethods.map((method, index) => (
            <li key={index} className="mb-1">➢ {method}</li>
          ))}
        </ul>
      </div>
      
      <div className="mb-8 text-left">
        <p className="font-bold">• Méthodes pédagogiques :</p>
        <ul className="list-none pl-6">
          {pedagogicalMethods.map((method, index) => (
            <li key={index} className="mb-1">➢ {method}</li>
          ))}
        </ul>
      </div>
      
      <div className="mb-8 text-left">
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
      
      <div className="flex justify-between mt-12">
        <div className="text-left">
          <p>Fait à <strong>{organizationSettings?.city || 'Paris'}</strong>, le {getCurrentDate()}</p>
        </div>
        
        <div className="text-right">
          <p className="font-bold mb-2">Le formateur</p>
          <p>{training.trainer_name}</p>
          {trainerSignature && (
            <div className="mt-2 flex justify-end">
              <img 
                src={trainerSignature} 
                alt="Signature du formateur" 
                className="max-h-24"
              />
            </div>
          )}
          {viewContext === 'crm' && !trainerSignature && (
            <p className="text-sm text-gray-500 mt-1">(Signature du formateur requise)</p>
          )}
          {viewContext === 'student' && !trainerSignature && (
            <p className="text-sm text-gray-500 mt-1">(Document non signé par le formateur)</p>
          )}
        </div>
      </div>
      
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500">PetitMaker - SIRET : 123 456 789 00010 - Déclaration d'activité enregistrée sous le numéro 11 75 12345 67</p>
        <p className="text-sm text-gray-500">Cet enregistrement ne vaut pas agrément de l'État</p>
      </div>
    </div>
  );
}; 