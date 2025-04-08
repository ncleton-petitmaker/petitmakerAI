import React, { useState, useEffect } from 'react';
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
  const [hasDefaultSignature, setHasDefaultSignature] = useState<boolean>(
    participantSignature !== null || (participantSignatures && !!participantSignatures.all)
  );

  useEffect(() => {
    // Vérifier si nous avons déjà une signature par défaut
    setHasDefaultSignature(
      participantSignature !== null || (participantSignatures && !!participantSignatures.all)
    );
  }, [participantSignature, participantSignatures]);

  const isCellSigned = (date: string, period: 'morning' | 'afternoon', isTrainer = false) => {
    // Ne vérifier que les cellules signées dans le contexte approprié
    // isTrainer indique si on vérifie une cellule formateur
    if (isTrainer) {
      // Pour le formateur, vérifier si le formateur a signé cette cellule
      const signatureKey = `${date}_${period}`;
      return trainerSignatures && !!trainerSignatures[signatureKey];
    } else {
      // Pour l'apprenant, vérifier si l'apprenant a signé cette cellule
      return signedCells.some(cell => cell.date === date && cell.period === period);
    }
  };

  const renderSignatureCell = (date: string, period: 'morning' | 'afternoon', isTrainer = false) => {
    // Vérifier si cette cellule spécifique (date + période) est signée par la personne appropriée
    const signed = isCellSigned(date, period, isTrainer);
    const canSign = viewContext === 'student' && !isTrainer && isSigningEnabled && !signed;
    const canTrainerSign = viewContext === 'crm' && isTrainer && isSigningEnabled;

    // Déterminer quelle signature afficher - UNIQUEMENT pour cette cellule spécifique
    let signatureUrl = null;
    
    if (!isTrainer) {
      // Pour l'apprenant - vérifier si la cellule spécifique (date + période) a une signature
      if (signed) {
        // Si la cellule est signée, chercher d'abord une signature spécifique à cette date et période
        const signatureKey = `${date}_${period}`;
        if (participantSignatures && participantSignatures[signatureKey]) {
          signatureUrl = participantSignatures[signatureKey];
        } else if (participantSignatures && participantSignatures[date]) {
          // Pour compatibilité avec d'anciens formats
          signatureUrl = participantSignatures[date];
        } else if (participantSignature) {
          // Utiliser la signature par défaut si nécessaire
          signatureUrl = participantSignature;
        }
      }
    } else {
      // Pour le formateur - vérifier uniquement les signatures du formateur
      const signatureKey = `${date}_${period}`;
      if (trainerSignatures && trainerSignatures[signatureKey]) {
        signatureUrl = trainerSignatures[signatureKey];
      } else if (trainerSignatures && trainerSignatures[date]) {
        signatureUrl = trainerSignatures[date];
      } else if (trainerSignature) {
        // On n'affiche pas automatiquement la signature formateur
        signatureUrl = null;
      }
    }

    console.log(`Cellule ${date} ${period} ${isTrainer ? 'formateur' : 'stagiaire'}: signée=${signed}, URL=${signatureUrl?.substring(0, 20)}...`);

    return (
      <td 
        className={`border border-gray-300 p-2 h-16 align-middle ${canSign || (canTrainerSign && isTrainer) ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={() => {
          if ((canSign && onCellClick) || (canTrainerSign && onCellClick)) {
            onCellClick(date, period);
          }
        }}
      >
        {signatureUrl ? (
          <div className="flex flex-col justify-center items-center h-full">
            <img src={signatureUrl} alt={isTrainer ? "Signature formateur" : "Signature stagiaire"} className="max-h-12 max-w-full" />
          </div>
        ) : canSign || canTrainerSign ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            <div className="text-center">
              <svg className="w-5 h-5 mx-auto mb-1 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
              </svg>
              Signer
            </div>
          </div>
        ) : null}
      </td>
    );
  };

  // Formatage de la durée de la formation pour l'affichage
  const formattedDuration = () => {
    if (!training.duration) return "";
    // Détection si la durée contient des informations en heures
    if (training.duration.includes('h') || /\d+\/\d+/.test(training.duration)) {
      return training.duration;
    }
    // Sinon on essaie de formatter en jours avec une estimation en heures
    const days = parseInt(training.duration);
    if (!isNaN(days)) {
      return `${days} jour${days > 1 ? 's' : ''} (soit ${days * 7} heures)`;
    }
    return training.duration;
  };

  return (
    <div className="bg-white p-8 border border-gray-200 mx-auto relative">
      <div className="text-center mb-6 border border-blue-900">
        <h1 className="text-xl font-bold py-2">FEUILLE D'ÉMARGEMENT</h1>
      </div>
      
      <div className="mb-6">
        <div className="mb-4">
          <p><strong>Stagiaire :</strong> {participant.first_name} {participant.last_name}</p>
          <p><strong>Formation :</strong> {training.title}</p>
          <p><strong>Durée :</strong> {formattedDuration()}</p>
          <p><strong>Formateur :</strong> {training.trainer_name}</p>
          <p><strong>Lieu de la formation :</strong> {location}</p>
        </div>
      </div>
      
      <div className="mb-6">
        <table className="w-full border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-3 w-1/4 text-center">Dates</th>
              <th className="border border-gray-400 p-3 w-1/4 text-center">Horaires</th>
              <th className="border border-gray-400 p-3 w-1/4 text-center">
                Signature<br />du stagiaire
              </th>
              <th className="border border-gray-400 p-3 w-1/4 text-center">
                Signature<br />du formateur
              </th>
            </tr>
          </thead>
          <tbody>
            {dates.map((date, index) => (
              <React.Fragment key={date}>
                {/* Matin */}
                <tr className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td rowSpan={2} className="border border-gray-300 p-3 text-center align-middle font-medium">
                    {date.replace(/\//g, '/')}
                  </td>
                  <td className="border border-gray-300 p-3 text-center">
                    De 9h à 12h30
                  </td>
                  {renderSignatureCell(date, 'morning')}
                  {renderSignatureCell(date, 'morning', true)}
                </tr>
                {/* Après-midi */}
                <tr className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="border border-gray-300 p-3 text-center">
                    De 13h30 à 17h
                  </td>
                  {renderSignatureCell(date, 'afternoon')}
                  {renderSignatureCell(date, 'afternoon', true)}
                </tr>
                {/* Ajouter une légère séparation entre les jours */}
                {index < dates.length - 1 && (
                  <tr className="h-1 bg-white">
                    <td colSpan={4} className="p-0"></td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 