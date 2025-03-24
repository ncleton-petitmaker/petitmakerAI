import React from 'react';
import { 
  Training, 
  Participant, 
  OrganizationSettings,
  formatDate,
  getCurrentDate,
  getTrainingDates,
  formatLocation
} from '../DocumentUtils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SignedCell {
  date: string;
  period: 'morning' | 'afternoon';
}

interface AttendanceSheetTemplateProps {
  training: {
    id: string;
    title: string;
    duration: string;
    trainer_name?: string;
    location: string | { name: string; city?: string };
    start_date: string | null;
    end_date: string | null;
  };
  participant: {
    id: string;
    first_name: string;
    last_name: string;
    job_position?: string;
  };
  organizationSettings?: OrganizationSettings;
  // Support des deux formats de signature pour une transition en douceur
  participantSignature?: string | null;
  trainerSignature?: string | null;
  participantSignatures?: { [key: string]: string };
  trainerSignatures?: { [key: string]: string };
  viewContext: 'crm' | 'student';
  signedCells?: Array<{ date: string; period: 'morning' | 'afternoon' }>;
  onCellClick?: (date: string, period: 'morning' | 'afternoon') => void;
  isSigningEnabled?: boolean;
  signedDates?: string[];
}

/**
 * Template partagé pour la feuille d'émargement
 * 
 * IMPORTANT: Ce composant est utilisé à la fois par l'interface CRM et l'interface apprenant
 * pour garantir une cohérence parfaite entre les documents.
 * 
 * - Dans l'interface CRM (viewContext='crm'), le formateur peut consulter et signer le document
 * - Dans l'interface apprenant (viewContext='student'), l'apprenant peut signer le document
 */
export const AttendanceSheetTemplate: React.FC<AttendanceSheetTemplateProps> = ({
  training,
  participant,
  organizationSettings,
  participantSignature = null,
  trainerSignature = null,
  participantSignatures = {},
  trainerSignatures = {},
  viewContext,
  signedCells = [],
  onCellClick,
  isSigningEnabled = false,
  signedDates = []
}) => {
  const dates = getTrainingDates(training.start_date, training.end_date);
  const location = formatLocation(training.location);

  console.log('🔍 [DEBUG] AttendanceSheetTemplate - signatures reçues:', { 
    participantSignature, 
    trainerSignature,
    participantSignatures,
    trainerSignatures,
    viewContext
  });

  const isCellSigned = (date: string, period: 'morning' | 'afternoon') => {
    return signedCells.some(cell => cell.date === date && cell.period === period);
  };

  const renderSignatureCell = (date: string, period: 'morning' | 'afternoon') => {
    const signed = isCellSigned(date, period);
    const canSign = viewContext === 'student' && isSigningEnabled && !signed;

    return (
      <td 
        className={`border border-gray-300 p-2 h-16 ${canSign ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={() => canSign && onCellClick && onCellClick(date, period)}
      >
        {signed && participantSignatures && participantSignatures[date] && (
          <div className="flex flex-col justify-center items-center h-full">
            <div className="text-xs text-center mb-1 font-semibold">
              {participant.first_name} {participant.last_name}
            </div>
            <img src={participantSignatures[date]} alt="Signature stagiaire" className="max-h-12 max-w-full" />
          </div>
        )}
        {canSign && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Cliquer pour signer
          </div>
        )}
      </td>
    );
  };

  // Fonction pour obtenir la signature finale du participant (priorité au nouveau format)
  const getParticipantSignature = (): string | null | undefined => {
    const signature = participantSignatures && participantSignatures.all 
      ? participantSignatures.all 
      : participantSignature;
    
    console.log('🔍 [DEBUG] Signature participant finale:', signature);
    return signature;
  };

  // Fonction pour obtenir la signature finale du formateur (priorité au nouveau format)
  const getTrainerSignature = (): string | null | undefined => {
    const signature = trainerSignatures && trainerSignatures.all
      ? trainerSignatures.all
      : trainerSignature;
    
    console.log('🔍 [DEBUG] Signature formateur finale:', signature);
    return signature;
  };

  return (
    <div className="bg-white p-8 shadow-sm border border-gray-200 mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">FEUILLE D'ÉMARGEMENT</h1>
      </div>
      
      <div className="mb-6">
        {organizationSettings?.organization_name && (
          <div className="text-center mb-4">
            <p className="font-semibold">{organizationSettings.organization_name}</p>
            {organizationSettings.address && <p>{organizationSettings.address}</p>}
            {organizationSettings.siret && <p>SIRET : {organizationSettings.siret}</p>}
          </div>
        )}
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Informations de la formation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong>Intitulé :</strong> {training.title}</p>
            <p><strong>Durée :</strong> {training.duration}</p>
            <p><strong>Formateur :</strong> {training.trainer_name}</p>
          </div>
          <div>
            <p><strong>Lieu :</strong> {location}</p>
            <p><strong>Date de début :</strong> {formatDate(training.start_date)}</p>
            <p><strong>Date de fin :</strong> {formatDate(training.end_date)}</p>
          </div>
        </div>
      </div>
      
      <div className="border border-gray-300 p-4 mb-8">
        <h2 className="text-lg font-bold mb-4">Participant</h2>
        <p><strong>Nom et prénom :</strong> {participant.first_name} {participant.last_name}</p>
        {participant.job_position && (
          <p><strong>Fonction :</strong> {participant.job_position}</p>
        )}
      </div>
      
      <div className="border border-gray-300 p-4 mb-8">
        <h2 className="text-lg font-bold mb-4">ÉMARGEMENT</h2>
        <p className="mb-4">Je soussigné(e) {participant.first_name} {participant.last_name}, atteste avoir participé à la formation "{training.title}" {dates}.</p>
        
        <div className="mt-8 grid grid-cols-2 gap-6">
          <div className="border p-4">
            <h4 className="font-bold mb-2">Signature du formateur</h4>
            <p>{training.trainer_name}</p>
            {getTrainerSignature() ? (
              <img 
                src={getTrainerSignature() || ''} 
                alt="Signature du formateur" 
                className="max-h-20 mt-2" 
              />
            ) : (
              <div className="h-20 flex items-center justify-center border-t mt-2 text-gray-400">
                {viewContext === 'crm' ? 'Votre signature ici' : 'En attente de signature'}
              </div>
            )}
          </div>
          
          <div className="border p-4">
            <h4 className="font-bold mb-2">Signature du stagiaire</h4>
            <p>{participant.first_name} {participant.last_name}</p>
            {getParticipantSignature() ? (
              <img 
                src={getParticipantSignature() || ''} 
                alt="Signature du stagiaire" 
                className="max-h-20 mt-2" 
              />
            ) : (
              <div className="h-20 flex items-center justify-center border-t mt-2 text-gray-400">
                {viewContext === 'student' ? 'Votre signature ici' : 'En attente de signature'}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-right">
        <p>Document généré le {getCurrentDate()}</p>
      </div>
      
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500">PetitMaker - SIRET : 123 456 789 00010 - Déclaration d'activité enregistrée sous le numéro 11 75 12345 67</p>
        <p className="text-sm text-gray-500">Cet enregistrement ne vaut pas agrément de l'État</p>
      </div>
    </div>
  );
}; 