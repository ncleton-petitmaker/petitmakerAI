import React, { useState, useEffect } from 'react';
import { DocumentWithSignatures } from './DocumentWithSignatures';
import { Training, Participant, OrganizationSettings } from './DocumentUtils';
import { AttendanceSheetTemplate } from './templates/AttendanceSheetTemplate';
import { DocumentType } from './DocumentSignatureManager';
import { supabase } from '../../lib/supabase';

interface GenericAttendanceSheetProps {
  training: Training;
  participant: Participant;
  signedDates: string[];
  onCancel: () => void;
  viewContext?: 'crm' | 'student';
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
}

/**
 * Composant de feuille d'émargement générique utilisant le système unifié
 * de gestion des documents et signatures.
 * 
 * Ce composant peut être utilisé à la fois dans l'interface administrateur
 * et dans l'interface apprenant.
 */
export const GenericAttendanceSheet: React.FC<GenericAttendanceSheetProps> = ({
  training,
  participant,
  signedDates,
  onCancel,
  viewContext = 'crm',
  onDocumentOpen,
  onDocumentClose
}) => {
  const [organizationSettings, setOrganizationSettings] = useState<OrganizationSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [participantSignature, setParticipantSignature] = useState<string | null>(null);
  const [representativeSignature, setRepresentativeSignature] = useState<string | null>(null);
  const [trainerSignature, setTrainerSignature] = useState<string | null>(null);

  // Nom complet du participant pour l'affichage
  const participantName = `${participant.first_name} ${participant.last_name}`;

  useEffect(() => {
    async function loadOrganizationSettings() {
      setIsLoadingSettings(true);
      try {
        // Récupérer les paramètres de l'organisation depuis Supabase
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .single();

        if (error) {
          console.error('Erreur lors du chargement des paramètres de l\'organisation:', error);
        } else {
          // Transformer les données pour correspondre à l'interface OrganizationSettings
          setOrganizationSettings({
            organization_name: data.company_name || '',
            address: data.address || '',
            postal_code: data.postal_code || '',
            city: data.city || '',
            country: data.country || 'France',
            siret: data.siret || '',
            activity_declaration_number: data.training_number || '',
            representative_name: data.representative_name || '',
            representative_title: data.representative_title || 'Directeur'
          });
        }
      } catch (error) {
        console.error('Exception lors du chargement des paramètres:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    }

    loadOrganizationSettings();
  }, []);

  // Fonction qui construit le template du document
  const renderTemplate = ({ 
    participantSignature, 
    representativeSignature, 
    trainerSignature 
  }: { 
    participantSignature: string | null; 
    representativeSignature: string | null; 
    trainerSignature: string | null; 
  }) => {
    if (isLoadingSettings) {
      return <div className="p-8 text-center">Chargement des paramètres...</div>;
    }

    return (
      <AttendanceSheetTemplate
        training={training}
        participant={participant}
        signedDates={signedDates}
        organizationSettings={organizationSettings || undefined}
        participantSignature={participantSignature}
        trainerSignature={trainerSignature}
        viewContext={viewContext}
      />
    );
  };

  return (
    <DocumentWithSignatures
      documentType={DocumentType.EMARGEMENT}
      trainingId={training.id}
      participantId={participant.id}
      participantName={participantName}
      viewContext={viewContext}
      onCancel={onCancel}
      onDocumentOpen={onDocumentOpen}
      onDocumentClose={onDocumentClose}
      renderTemplate={renderTemplate}
      documentTitle="Feuille d'émargement"
    />
  );
}; 