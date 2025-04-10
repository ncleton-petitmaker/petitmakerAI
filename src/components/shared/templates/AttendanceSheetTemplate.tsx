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
  onSignAll?: (type: 'participant' | 'trainer') => void;
  isSaving?: boolean;
  isPdfGeneration?: boolean;
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
  signedDates = [],
  onSignAll,
  isSaving = false,
  isPdfGeneration = false
}) => {
  // Get training dates 
  const rawDates = getTrainingDates(training.start_date, training.end_date);
  
  // Process and validate dates to ensure they're all proper dates, not dots
  const dates = rawDates
    .map(date => {
      // If it's a valid date format, use it
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
        return date;
      }
      
      // If it contains dots, it's likely an issue - use a placeholder
      if (date.includes('.')) {
        console.warn('🚨 [DATE_ISSUE] Found problematic date with dots:', date);
        return 'Date invalide';
      }
      
      return date;
    })
    .filter(date => date && date.trim() !== '');
  
  console.log('🗓️ [DEBUG] Dates finales pour affichage:', dates);
  
  const location = formatLocation(training.location);
  const [hasDefaultSignature, setHasDefaultSignature] = useState<boolean>(
    participantSignature !== null || (participantSignatures && !!participantSignatures.all)
  );

  // Fonction pour convertir le format de date du template (JJ/MM/YYYY) vers celui des signatures (YYYY-MM-DD)
  const convertDateFormat = (displayDate: string): string => {
    try {
      const parts = displayDate.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } catch (e) {
      // Silently fail and return original
    }
    return displayDate;
  };

  useEffect(() => {
    // Vérifier si nous avons déjà une signature par défaut
    setHasDefaultSignature(
      participantSignature !== null || (participantSignatures && !!participantSignatures.all)
    );
  }, [participantSignature, participantSignatures]);

  const isCellSigned = (date: string, period: 'morning' | 'afternoon', isTrainer = false) => {
    const signatureKey = `${date}_${period}`;
    const isoDate = convertDateFormat(date);
    const isoSignatureKey = `${isoDate}_${period}`;
    
    if (isTrainer) {
      return trainerSignatures && (!!trainerSignatures[signatureKey] || !!trainerSignatures[isoSignatureKey]);
    } else {
      const inSignedCells = signedCells.some(cell => 
        (cell.date === date && cell.period === period) || 
        (cell.date === isoDate && cell.period === period)
      );
      const inParticipantSignatures = participantSignatures && 
        (!!participantSignatures[signatureKey] || !!participantSignatures[isoSignatureKey]);
      
      return inSignedCells || inParticipantSignatures;
    }
  };

  const getSignatureUrl = (date: string, period: 'morning' | 'afternoon', isTrainer: boolean): string | null => {
    const signatureKey = `${date}_${period}`;
    const isoDate = convertDateFormat(date);
    const isoSignatureKey = `${isoDate}_${period}`;
    
    if (isTrainer) {
      if (trainerSignatures) {
        return trainerSignatures[signatureKey] || trainerSignatures[isoSignatureKey] || null;
      }
    } else {
      if (participantSignatures) {
        return participantSignatures[signatureKey] || 
               participantSignatures[isoSignatureKey] || 
               participantSignatures[date] || 
               participantSignature;
      }
    }
    return null;
  };

  const renderSignatureCell = (date: string, period: 'morning' | 'afternoon', isTrainer = false) => {
    const signed = isCellSigned(date, period, isTrainer);
    const canSign = !isPdfGeneration && viewContext === 'student' && !isTrainer && isSigningEnabled && !signed;
    const canTrainerSign = !isPdfGeneration && viewContext === 'crm' && isTrainer && isSigningEnabled;
    const signatureUrl = signed ? getSignatureUrl(date, period, isTrainer) : null;

    // Classes CSS optimisées pour le rendu PDF
    const signatureCellClass = isPdfGeneration 
      ? 'border border-gray-300 p-2 h-16 align-middle pdf-signature-cell' 
      : `border border-gray-300 p-2 h-16 align-middle ${
          (viewContext === 'student' && !isTrainer && isSigningEnabled) || (viewContext === 'crm' && isTrainer && isSigningEnabled)
            ? 'cursor-pointer hover:bg-gray-50' 
            : ''
        }`;

    return (
      <td 
        className={signatureCellClass}
        onClick={!isPdfGeneration ? () => {
          const studentCanClick = viewContext === 'student' && !isTrainer && isSigningEnabled;
          const trainerCanClick = viewContext === 'crm' && isTrainer && isSigningEnabled;
          
          if ((studentCanClick || trainerCanClick) && onCellClick) {
            onCellClick(date, period);
          }
        } : undefined}
        data-signature-cell="true"
        data-signature-type={isTrainer ? "trainer" : "participant"}
        data-signature-date={date}
        data-signature-period={period}
        data-is-signed={signed ? "true" : "false"}
      >
        {signatureUrl ? (
          <div className="flex flex-col justify-center items-center h-full">
            <img 
              src={signatureUrl} 
              alt={isTrainer ? "Signature formateur" : "Signature stagiaire"} 
              className={isPdfGeneration ? "max-h-12 max-w-full signature-image-for-pdf" : "max-h-12 max-w-full"}
              data-pdf-signature="true"
              data-signature-owner={isTrainer ? "trainer" : "participant"}
              data-signature-key={`${date}_${period}`}
              loading="eager"
            />
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
    <div className="bg-white p-8 border border-gray-200 mx-auto relative"
      data-document-type="attendance_sheet">
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
        {/* Table avec style fixe pour éviter les problèmes de mise en page lors de l'export PDF */}
        <table className="w-full border-collapse border border-gray-400" cellSpacing="0" cellPadding="0">
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
            {dates.map((date, index) => {
              // Format the date correctly for display - prevent dots from appearing
              const formattedDate = (date === 'Date invalide' || !date) ? 
                'Date invalide' : 
                date.toString().replace(/\./g, '/');
              
              return (
                <React.Fragment key={`date-group-${index}`}>
                  {/* Morning */}
                  <tr 
                    className={index % 2 === 0 ? 'bg-gray-50' : ''} 
                    data-date-row={date} 
                    data-period="morning"
                  >
                    <td 
                      rowSpan={2} 
                      className="border border-gray-300 p-3 text-center align-middle text-black"
                      data-date={date}
                      style={{ 
                        verticalAlign: 'middle',
                        fontWeight: formattedDate === 'Date invalide' ? 'normal' : 'bold',
                        color: formattedDate === 'Date invalide' ? '#666' : 'black'
                      }}
                    >
                      {formattedDate}
                    </td>
                    <td className="border border-gray-300 p-3 text-center">
                      De 9h à 12h30
                    </td>
                    {renderSignatureCell(date, 'morning')}
                    {renderSignatureCell(date, 'morning', true)}
                  </tr>
                  
                  {/* Afternoon */}
                  <tr 
                    className={index % 2 === 0 ? 'bg-gray-50' : ''}
                    data-date-row={date} 
                    data-period="afternoon"
                  >
                    <td className="border border-gray-300 p-3 text-center">
                      De 13h30 à 17h
                    </td>
                    {renderSignatureCell(date, 'afternoon')}
                    {renderSignatureCell(date, 'afternoon', true)}
                  </tr>
                  
                  {/* Small spacing between days except the last one */}
                  {index < dates.length - 1 && (
                    <tr className="h-2" data-separator="true">
                      <td colSpan={4} className="border-0 p-0 bg-gray-100"></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          {!isPdfGeneration && (
            <tfoot>
              <tr className="bg-gray-100">
                <td colSpan={2} className="border border-gray-300 p-2"></td>
                <td className="border border-gray-300 p-2 text-center">
                  {viewContext === 'student' && onSignAll && (
                    <button
                      onClick={() => onSignAll('participant')}
                      disabled={!isSigningEnabled || isSaving}
                      className={`px-3 py-1 text-sm font-medium rounded-md shadow-sm text-white
                        ${(!isSigningEnabled || isSaving) 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-indigo-600 hover:bg-indigo-700'
                        }
                      `}
                    >
                      {isSaving ? 'En cours...' : 'Tout signer'}
                    </button>
                  )}
                </td>
                <td className="border border-gray-300 p-2 text-center">
                  {viewContext === 'crm' && onSignAll && (
                    <button
                      onClick={() => onSignAll('trainer')}
                      disabled={!isSigningEnabled || isSaving}
                      className={`px-3 py-1 text-sm font-medium rounded-md shadow-sm text-white
                        ${(!isSigningEnabled || isSaving) 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700'
                        }
                      `}
                    >
                      {isSaving ? 'En cours...' : 'Tout signer'}
                    </button>
                  )}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {isPdfGeneration && (
        <div className="mt-8 pt-4 border-t border-gray-300 text-sm text-gray-500 text-center">
          <p>Document généré le {getCurrentDate()}</p>
          {organizationSettings?.organization_name && (
            <p>{organizationSettings.organization_name} - {organizationSettings.siret || ''}</p>
          )}
        </div>
      )}
    </div>
  );
}; 