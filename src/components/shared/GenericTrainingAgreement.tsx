import React, { useState, useEffect } from 'react';
import { DocumentWithSignatures } from './DocumentWithSignatures';
import { UnifiedTrainingAgreementTemplate } from './templates/unified/TrainingAgreementTemplate';
import { DocumentType } from './DocumentSignatureManager';
import { supabase } from '../../lib/supabase';
import { Training, Participant, OrganizationSettings } from './DocumentUtils';

interface GenericTrainingAgreementProps {
  training: Training;
  participant: Participant;
  participants?: Participant[];
  onCancel: () => void;
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
  viewContext: 'crm' | 'student';
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
  participants = [],
  onCancel,
  onDocumentOpen,
  onDocumentClose,
  viewContext
}) => {
  const [organizationSettings, setOrganizationSettings] = useState<OrganizationSettings | null>(null);
  const [company, setCompany] = useState<any>(null);

  // Utilisez le tableau de participants s'il est fourni, sinon utilisez uniquement le participant individuel
  const allParticipants = participants.length > 0 ? participants : [participant];

  // Charger les paramètres de l'organisation
  useEffect(() => {
    const fetchOrganizationSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .single();

        if (error) {
          console.error('Erreur lors de la récupération des paramètres:', error);
          return;
        }

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
      } catch (error) {
        console.error('Exception lors de la récupération des paramètres:', error);
      }
    };

    // Si le participant a une entreprise associée, charger ses informations
    const fetchCompanyData = async () => {
      console.log('🔍 [DEBUG] GenericTrainingAgreement - fetchCompanyData - Participant:', participant);
      console.log('🔍 [DEBUG] GenericTrainingAgreement - fetchCompanyData - Company name:', participant.company);
      
      if (!participant.company) {
        console.log('⚠️ [WARNING] GenericTrainingAgreement - Pas d\'entreprise associée au participant');
        return;
      }

      try {
        console.log('🔍 [DEBUG] GenericTrainingAgreement - Recherche de l\'entreprise:', participant.company);
        
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('name', participant.company)
          .maybeSingle();

        if (error) {
          console.error('❌ [ERROR] GenericTrainingAgreement - Erreur lors de la récupération de l\'entreprise:', error);
          return;
        }

        if (data) {
          console.log('✅ [SUCCESS] GenericTrainingAgreement - Entreprise trouvée:', data);
          setCompany(data);
        } else {
          console.log('⚠️ [WARNING] GenericTrainingAgreement - Entreprise non trouvée dans la base, création d\'une structure minimale');
          // Créer une structure minimale
          const minimalCompany = {
            name: participant.company,
            address: '',
            postal_code: '',
            city: '',
            country: 'France'
          };
          console.log('🔍 [DEBUG] GenericTrainingAgreement - Structure minimale créée:', minimalCompany);
          setCompany(minimalCompany);
        }
      } catch (error) {
        console.error('❌ [ERROR] GenericTrainingAgreement - Exception lors de la récupération de l\'entreprise:', error);
      }
    };

    fetchOrganizationSettings();
    fetchCompanyData();
  }, [participant.company]);

  // Nom complet du participant
  const participantName = `${participant.first_name} ${participant.last_name}`;

  // Fonction de rendu du template
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
    console.log('🔍 [DEBUG] GenericTrainingAgreement - renderTemplate avec signatures et tampons:', {
      participantSignature,
      representativeSignature,
      trainerSignature,
      companySeal,
      organizationSeal,
      viewContext
    });
    
    // Convertir la propriété "location" en chaîne si c'est un objet
    const formattedTraining = {
      ...training,
      location: typeof training.location === 'string' 
        ? training.location 
        : training.location?.name || ''
    };
    
    return (
      <UnifiedTrainingAgreementTemplate
        training={formattedTraining}
        participant={participant}
        participants={allParticipants}
        company={company}
        organizationSettings={organizationSettings || {
          organization_name: 'PETITMAKER'
        }}
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
      participantName={participantName}
      viewContext={viewContext}
      onCancel={onCancel}
      onDocumentOpen={onDocumentOpen}
      onDocumentClose={onDocumentClose}
      renderTemplate={renderTemplate}
      documentTitle="Convention de formation"
      allowCompanySeal={true}
      allowOrganizationSeal={true}
    />
  );
}; 