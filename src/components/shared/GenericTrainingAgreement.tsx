import React, { useState, useEffect } from 'react';
import { DocumentWithSignatures } from './DocumentWithSignatures';
import { DocumentType } from '../../types/SignatureTypes';
import { UnifiedTrainingAgreementTemplate, OrganizationSettings as TemplateOrganizationSettings } from './templates/unified/TrainingAgreementTemplate';
import { supabase } from '../../lib/supabase';
import { Training, Participant, OrganizationSettings } from './DocumentUtils';

interface GenericTrainingAgreementProps {
  training: Training;
  participant: Participant;
  participants: Participant[];
  companyData?: {
    id?: string;
    name: string;
    address?: string;
    postal_code?: string;
    city?: string;
    country?: string;
    siret?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    isIndependent?: boolean;
  };
  onCancel: () => void;
  viewContext?: 'crm' | 'student';
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
}

/**
 * Version générique de la convention de formation utilisant le système unifié
 * 
 * Cette version utilise le système de gestion de documents commun pour assurer
 * une cohérence entre tous les documents.
 * 
 * Mise à jour: Ce composant peut désormais afficher tous les participants d'une formation
 * sur une seule convention.
 */
export const GenericTrainingAgreement: React.FC<GenericTrainingAgreementProps> = ({
  training,
  participant,
  participants,
  companyData = { name: 'Entreprise à compléter' },
  onCancel,
  viewContext = 'crm',
  onDocumentOpen,
  onDocumentClose
}) => {
  const [organizationSettings, setOrganizationSettings] = useState<OrganizationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Chargement des paramètres de l'organisme de formation
  useEffect(() => {
    const loadOrganizationSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .single();

        if (error) {
          console.error('Erreur lors du chargement des paramètres:', error);
          return;
        }

        if (data) {
          // Vérifier et formater les données reçues selon l'interface attendue
          const formattedSettings: OrganizationSettings = {
            organization_name: data.organization_name || 'PetitMaker',
            address: data.organization_address || '',
            postal_code: data.organization_postal_code || '',
            city: data.organization_city || '',
            country: data.organization_country || 'France',
            siret: data.organization_siret || '',
            activity_declaration_number: data.organization_declaration_number || '',
            representative_name: data.organization_representative_name || '',
            representative_title: data.organization_representative_title || '',
            organization_seal_url: data.organization_seal_url || ''
          };
          
          setOrganizationSettings(formattedSettings);
        }
      } catch (error) {
        console.error('Erreur inattendue lors du chargement des paramètres:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrganizationSettings();
  }, []);

  // Fonction pour formater et rendre le document
  const renderTemplate = ({ 
    participantSignature, 
    representativeSignature, 
    trainerSignature,
    companySeal,
    organizationSeal 
  }: { 
    participantSignature: string | null; 
    representativeSignature: string | null; 
    trainerSignature: string | null;
    companySeal: string | null;
    organizationSeal: string | null;
  }) => {
    // Formater les données de l'entreprise pour correspondre au format attendu
    const company = {
      name: companyData.name || 'À compléter',
      address: companyData.address || 'À compléter',
      postal_code: companyData.postal_code || '',
      city: companyData.city || '',
      country: companyData.country || 'France',
      siret: companyData.siret || 'À compléter',
      contact_name: companyData.contact_name,
      contact_email: companyData.contact_email,
      contact_phone: companyData.contact_phone,
      isIndependent: companyData.isIndependent
    };

    // Créer les données minimales requises pour le template
    const settings: TemplateOrganizationSettings = {
      organization_name: organizationSettings?.organization_name || 'PetitMaker',
      address: organizationSettings?.address || 'Adresse à compléter',
      siret: organizationSettings?.siret || 'SIRET à compléter',
      activity_declaration_number: organizationSettings?.activity_declaration_number || 'Numéro à compléter',
      representative_name: organizationSettings?.representative_name || 'Représentant à compléter',
      representative_title: organizationSettings?.representative_title || 'Titre à compléter',
      city: organizationSettings?.city || 'Villeneuve d\'Ascq',
      postal_code: organizationSettings?.postal_code || '59650',
      country: organizationSettings?.country || 'France'
    };

    // Utiliser la liste complète des participants
    const participantsArray = participants;

    return (
      <UnifiedTrainingAgreementTemplate
        participants={participantsArray}
        participant={participant}
        training={training}
        company={company}
        organizationSettings={settings}
        participantSignature={participantSignature}
        representativeSignature={representativeSignature}
        trainerSignature={trainerSignature}
        companySeal={companySeal}
        organizationSeal={organizationSeal}
        viewContext={viewContext}
      />
    );
  };

  return (
    <DocumentWithSignatures
      documentType={DocumentType.CONVENTION}
      trainingId={training.id}
      participantId={participant.id}
      participantName={`${participant.first_name} ${participant.last_name}`}
      viewContext={viewContext}
      onCancel={onCancel}
      onDocumentOpen={onDocumentOpen}
      onDocumentClose={onDocumentClose}
      renderTemplate={renderTemplate}
      documentTitle="Convention de formation"
    />
  );
}; 