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
  const dates = getTrainingDates(training.start_date, training.end_date);
  const location = formatLocation(training.location);
  const [hasDefaultSignature, setHasDefaultSignature] = useState<boolean>(
    participantSignature !== null || (participantSignatures && !!participantSignatures.all)
  );

  // Fonction pour convertir le format de date du template (JJ/MM/YYYY) vers celui des signatures (YYYY-MM-DD)
  const convertDateFormat = (displayDate: string): string => {
    console.log(`🗓️ [CONVERT_DATE] Tentative de conversion de ${displayDate}`);
    try {
      // Le format dans le template est JJ/MM/YYYY
      const parts = displayDate.split('/');
      console.log(`🗓️ [CONVERT_DATE] Parties après split:`, parts);
      
      if (parts.length === 3) {
        // Construire la date au format YYYY-MM-DD
        const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        console.log(`🗓️ [CONVERT_DATE] ${displayDate} converti en ${isoDate}`);
        return isoDate;
      }
    } catch (e) {
      console.error('❌ [CONVERT_DATE] Erreur lors de la conversion de date:', e);
    }
    console.log(`🗓️ [CONVERT_DATE] Échec de conversion, retour de la date d'origine: ${displayDate}`);
    return displayDate; // Retourner la date d'origine en cas d'échec
  };

  useEffect(() => {
    // Vérifier si nous avons déjà une signature par défaut
    setHasDefaultSignature(
      participantSignature !== null || (participantSignatures && !!participantSignatures.all)
    );
  }, [participantSignature, participantSignatures]);

  const isCellSigned = (date: string, period: 'morning' | 'afternoon', isTrainer = false) => {
    // Ne vérifier que les cellules signées dans le contexte approprié
    // isTrainer indique si on vérifie une cellule formateur
    
    // Ajouter un log spécifique pour la date du 25/04/2025
    if (date === '25/04/2025') {
      console.log(`🔍 [DEBUG_25_04] Vérification signature pour ${date}_${period}, isTrainer=${isTrainer}`);
      // LOG AJOUTÉ: Afficher l'état des signatures au moment de la vérification
      console.log(`🔍 [DEBUG_25_04_STATE] Participant Signatures:`, participantSignatures);
      console.log(`🔍 [DEBUG_25_04_STATE] Trainer Signatures:`, trainerSignatures);
      console.log(`🔍 [DEBUG_25_04_STATE] Signed Cells:`, signedCells);
    }
    
    if (isTrainer) {
      // Pour le formateur, vérifier si le formateur a signé cette cellule
      const signatureKey = `${date}_${period}`;
      // Essayer aussi avec le format ISO
      const isoDate = convertDateFormat(date);
      const isoSignatureKey = `${isoDate}_${period}`;
      
      // Log spécifique pour la date du 25/04/2025
      if (date === '25/04/2025') {
        console.log(`🔍 [DEBUG_25_04] Clés formateur: ${signatureKey}, ${isoSignatureKey}`);
        console.log(`🔍 [DEBUG_25_04] trainerSignatures:`, trainerSignatures);
        console.log(`🔍 [DEBUG_25_04] Résultat formateur:`, 
          trainerSignatures && (!!trainerSignatures[signatureKey] || !!trainerSignatures[isoSignatureKey]));
      }
      
      return trainerSignatures && (!!trainerSignatures[signatureKey] || !!trainerSignatures[isoSignatureKey]);
    } else {
      // Pour l'apprenant, vérifier si l'apprenant a signé cette cellule
      // MODIFICATION: Vérifier à la fois le tableau signedCells ET le dictionnaire participantSignatures
      const signatureKey = `${date}_${period}`;
      // Essayer aussi avec le format ISO
      const isoDate = convertDateFormat(date);
      const isoSignatureKey = `${isoDate}_${period}`;
      
      const inSignedCells = signedCells.some(cell => 
        (cell.date === date && cell.period === period) || 
        (cell.date === isoDate && cell.period === period)
      );
      const inParticipantSignatures = participantSignatures && 
        (!!participantSignatures[signatureKey] || !!participantSignatures[isoSignatureKey]);
      
      // Log spécifique pour la date du 25/04/2025
      if (date === '25/04/2025') {
        console.log(`🔍 [DEBUG_25_04] Clés participant: ${signatureKey}, ${isoSignatureKey}`);
        console.log(`🔍 [DEBUG_25_04] participantSignatures:`, participantSignatures);
        console.log(`🔍 [DEBUG_25_04] signedCells:`, signedCells);
        console.log(`🔍 [DEBUG_25_04] Dans signedCells: ${inSignedCells}`);
        console.log(`🔍 [DEBUG_25_04] Dans participantSignatures: ${inParticipantSignatures}`);
        console.log(`🔍 [DEBUG_25_04] Résultat final:`, inSignedCells || inParticipantSignatures);
      }
      
      // Ajouter un log de diagnostic
      console.log(`📋 [CHECK_SIGNED] ${signatureKey} (ou ${isoSignatureKey}) | Dans signedCells: ${inSignedCells} | Dans participantSignatures: ${inParticipantSignatures}`);
      
      if (date === '21/04/2025') {
        // Log détaillé pour une date spécifique pour aider le debug
        console.log(`📋 [CHECK_SIGNED_DETAIL] Contenu de participantSignatures:`, participantSignatures);
        console.log(`📋 [CHECK_SIGNED_DETAIL] Format des clés recherchées:`, signatureKey, isoSignatureKey);
        console.log(`📋 [CHECK_SIGNED_DETAIL] Clés disponibles:`, Object.keys(participantSignatures));
      }
      
      // Retourner true si la cellule est signée selon l'une ou l'autre des sources
      return inSignedCells || inParticipantSignatures;
    }
  };

  const renderSignatureCell = (date: string, period: 'morning' | 'afternoon', isTrainer = false) => {
    // Vérifier si cette cellule spécifique (date + période) est signée par la personne appropriée
    const signed = isCellSigned(date, period, isTrainer);
    
    // Log détaillé pour les cellules du 25/04/2025
    if (date === '25/04/2025') {
      console.log(`🖋️ [RENDER_25_04] Cellule ${date}_${period}, isTrainer=${isTrainer}, signed=${signed}, isPdfGeneration=${isPdfGeneration}`);
    }
    
    // Ces variables ne sont utiles que pour le rendu interactif, pas pour le PDF
    const canSign = !isPdfGeneration && viewContext === 'student' && !isTrainer && isSigningEnabled && !signed;
    const canTrainerSign = !isPdfGeneration && viewContext === 'crm' && isTrainer && isSigningEnabled;

    // Déterminer quelle signature afficher - UNIQUEMENT pour cette cellule spécifique
    let signatureUrl = null;
    const signatureKey = `${date}_${period}`;
    // Essayer aussi avec le format ISO
    const isoDate = convertDateFormat(date);
    const isoSignatureKey = `${isoDate}_${period}`;
    
    if (!isTrainer) {
      // Pour l'apprenant - récupérer l'URL de signature
      if (signed) {
        // Si la cellule est signée, chercher d'abord une signature spécifique à cette date et période
        if (participantSignatures && participantSignatures[signatureKey]) {
          signatureUrl = participantSignatures[signatureKey];
          if (!isPdfGeneration) { // Éviter les logs inutiles en mode PDF
            console.log(`      -> URL signature apprenant trouvée pour ${signatureKey}: ${signatureUrl?.substring(0,20)}...`);
          }
        } else if (participantSignatures && participantSignatures[isoSignatureKey]) {
          signatureUrl = participantSignatures[isoSignatureKey];
          if (!isPdfGeneration) {
            console.log(`      -> URL signature apprenant trouvée pour ${isoSignatureKey}: ${signatureUrl?.substring(0,20)}...`);
          }
        } else if (participantSignatures && participantSignatures[date]) {
          // Pour compatibilité avec d'anciens formats
          signatureUrl = participantSignatures[date];
          if (!isPdfGeneration) {
            console.log(`      -> URL signature apprenant (ancien format) trouvée pour ${date}`);
          }
        } else if (participantSignature) {
          // Utiliser la signature par défaut si nécessaire
          signatureUrl = participantSignature;
          if (!isPdfGeneration) {
            console.log(`      -> URL signature apprenant par défaut utilisée`);
          }
        } else if (!isPdfGeneration) {
          console.log(`      -> Aucune URL de signature trouvée pour ${signatureKey} ou ${isoSignatureKey} malgré signed=${signed}`);
        }
        
        // Log détaillé pour les cellules du 25/04/2025
        if (date === '25/04/2025' && !isPdfGeneration) {
          console.log(`🖋️ [RENDER_25_04] URL signature apprenant: ${signatureUrl?.substring(0,30)}...`);
        }
      }
    } else {
      // --- Logique Formateur ---
      // Vérifier si le formateur a signé CETTE cellule
      const trainerHasSignedThisCell = trainerSignatures && 
        (!!trainerSignatures[signatureKey] || !!trainerSignatures[isoSignatureKey]);
      
      // Vérifier si le stagiaire a signé CETTE cellule (pas nécessaire en mode PDF)
      if (!isPdfGeneration) {
        const participantHasSignedThisCell = participantSignatures && 
          (!!participantSignatures[signatureKey] || !!participantSignatures[isoSignatureKey]);

        console.log(`   [Render Cell Formateur ${signatureKey}] Formateur signé: ${!!trainerHasSignedThisCell}, Stagiaire signé: ${!!participantHasSignedThisCell}`);
      }

      // N'afficher la signature du formateur QUE SI elle existe pour cette cellule
      if (trainerHasSignedThisCell) {
        signatureUrl = trainerSignatures[signatureKey] || trainerSignatures[isoSignatureKey];
        if (!isPdfGeneration) {
          console.log(`      -> Affichage signature formateur pour ${signatureKey} ou ${isoSignatureKey}`);
        }
        
        // Log détaillé pour les cellules du 25/04/2025
        if (date === '25/04/2025' && !isPdfGeneration) {
          console.log(`🖋️ [RENDER_25_04] URL signature formateur: ${signatureUrl?.substring(0,30)}...`);
        }
      } else if (!isPdfGeneration) {
         console.log(`      -> Pas d'affichage signature formateur pour ${signatureKey} ou ${isoSignatureKey}`);
         signatureUrl = null; // Assurer qu'on n'affiche rien
      }
    }

    if (!isPdfGeneration) {
      console.log(`   [Render Cell ${date} ${period} ${isTrainer ? 'formateur' : 'stagiaire'}] Résultat: URL=${signatureUrl?.substring(0, 20)}...`);
    }

    // Classes CSS optimisées pour le rendu PDF
    const signatureCellClass = isPdfGeneration 
      ? 'border border-gray-300 p-2 h-16 align-middle' 
      : `border border-gray-300 p-2 h-16 align-middle ${
          // Ajouter le curseur si l'utilisateur peut interagir et qu'on n'est pas en mode PDF
          (viewContext === 'student' && !isTrainer && isSigningEnabled) || (viewContext === 'crm' && isTrainer && isSigningEnabled)
            ? 'cursor-pointer hover:bg-gray-50' 
            : ''
        }`;

    return (
      <td 
        className={signatureCellClass}
        onClick={!isPdfGeneration ? () => {
          // Qui a le droit de cliquer ICI ?
          const studentCanClick = viewContext === 'student' && !isTrainer && isSigningEnabled;
          const trainerCanClick = viewContext === 'crm' && isTrainer && isSigningEnabled;
          
          // Appeler onCellClick si l'utilisateur a le droit, PEU IMPORTE si c'est déjà signé
          if ((studentCanClick || trainerCanClick) && onCellClick) {
            onCellClick(date, period);
          }
        } : undefined}
      >
        {signatureUrl ? (
          <div className="flex flex-col justify-center items-center h-full">
            <img 
              src={signatureUrl} 
              alt={isTrainer ? "Signature formateur" : "Signature stagiaire"} 
              className={isPdfGeneration ? "max-h-12 max-w-full signature-image-for-pdf" : "max-h-12 max-w-full"}
              data-pdf-signature={isPdfGeneration ? "true" : undefined}
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
              // Utiliser un React.Fragment pour garder les lignes d'une même date ensemble
              <React.Fragment key={date}>
                {/* Wrapper div pour contrôler le saut de page en PDF */}
                <tr className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td 
                    rowSpan={2} 
                    className="border border-gray-300 p-3 text-center align-middle font-medium text-black"
                    style={isPdfGeneration ? { pageBreakInside: 'avoid' } : {}}
                    data-date={date} // Ajouter un attribut data pour faciliter la récupération de la date
                  >
                    {/* Formater la date pour s'assurer qu'elle est toujours visible */}
                    <span className="date-value">{date}</span>
                  </td>
                  <td className="border border-gray-300 p-3 text-center">
                    De 9h à 12h30
                  </td>
                  {renderSignatureCell(date, 'morning')}
                  {renderSignatureCell(date, 'morning', true)}
                </tr>
                <tr className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="border border-gray-300 p-3 text-center">
                    De 13h30 à 17h
                  </td>
                  {renderSignatureCell(date, 'afternoon')}
                  {renderSignatureCell(date, 'afternoon', true)}
                </tr>
                {/* Ajouter un séparateur entre les jours */}
                {index < dates.length - 1 && (
                  <tr className="h-2">
                    <td colSpan={4} className="border-0 p-0 bg-gray-100" 
                        style={isPdfGeneration ? { pageBreakAfter: 'auto' } : {}}></td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          {/* Ajout du pied de tableau pour les boutons "Tout signer" - Cacher en mode PDF */}
          {!isPdfGeneration && (
            <tfoot>
              <tr className="bg-gray-100">
                <td colSpan={2} className="border border-gray-300 p-2"></td>
                {/* Bouton "Tout signer" pour l'apprenant */}
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
                {/* Bouton "Tout signer" pour le formateur */}
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
      {/* Pied de page pour PDF uniquement */}
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