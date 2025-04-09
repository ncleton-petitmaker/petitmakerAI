import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Training, Participant, OrganizationSettings } from './shared/DocumentUtils';
import { DocumentWithSignatures } from './shared/DocumentWithSignatures';
import { UnifiedTrainingAgreementTemplate, OrganizationSettings as TemplateOrganizationSettings } from './shared/templates/unified/TrainingAgreementTemplate';
import { DocumentType } from '../types/SignatureTypes';

interface StudentGenericTrainingAgreementButtonProps {
  trainingId: string;
  userId: string;
  buttonText?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
}

/**
 * Bouton permettant d'afficher la convention de formation pour l'apprenant
 * utilisant le nouveau système de gestion des signatures.
 * 
 * Cette version utilise le système unifié de gestion des documents pour assurer
 * une cohérence dans la gestion des signatures à travers toute l'application.
 * 
 * Modification: Maintenant, cette convention affiche tous les participants de la formation
 * dans une seule convention.
 */
export const StudentGenericTrainingAgreementButton: React.FC<StudentGenericTrainingAgreementButtonProps> = ({
  trainingId,
  userId,
  buttonText = 'Convention de formation',
  className = '',
  variant = 'default',
  onDocumentOpen,
  onDocumentClose
}) => {
  const [showAgreement, setShowAgreement] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [formattedTraining, setFormattedTraining] = useState<Training | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [organizationSettings, setOrganizationSettings] = useState<OrganizationSettings | null>(null);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    if (showAgreement && !formattedTraining) {
      loadDataAndShow();
    }
  }, [showAgreement, formattedTraining]);

  const loadDataAndShow = async () => {
    setIsLoading(true);
    setHasError(false);
    setShowAgreement(true);
    if (onDocumentOpen) onDocumentOpen();

    try {
      const { data: trainingData, error: trainingError } = await supabase
        .from('trainings')
        .select('*')
        .eq('id', trainingId)
        .single();

      if (trainingError) throw trainingError;

      const { data: participantsData, error: participantsError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, job_position, company_name')
        .eq('training_id', trainingId);
        
      if (participantsError) throw participantsError;
      
      const mappedParticipants = participantsData?.map((p: any) => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        job_position: p.job_position || undefined,
        company: p.company_name || undefined,
        email: p.email || undefined
      })) || [];
      setAllParticipants(mappedParticipants);
      
      const currentParticipant = mappedParticipants.find(p => p.id === userId);
      setParticipant(currentParticipant || null);

      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .single();
        
      if (settingsError) throw settingsError;
      setOrganizationSettings(settingsData);

      const companyName = currentParticipant?.company;
      if (companyName) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('name', companyName)
          .single();
        setCompany(companyError ? { name: companyName } : companyData);
      } else {
        setCompany(null);
      }

      let pedagogicalMethods = trainingData.pedagogical_methods;
      let materialElements = trainingData.material_elements;

      if (typeof pedagogicalMethods === 'string') {
        try {
          pedagogicalMethods = JSON.parse(pedagogicalMethods);
        } catch (e) {
          console.error('Erreur lors du parsing des méthodes pédagogiques:', e);
          pedagogicalMethods = {};
        }
      }

      if (typeof materialElements === 'string') {
        try {
          materialElements = JSON.parse(materialElements);
        } catch (e) {
          console.error('Erreur lors du parsing des éléments matériels:', e);
          materialElements = {};
        }
      }

      const formattedTrainingObj: Training = {
        id: trainingData.id,
        title: trainingData.title,
        duration: trainingData.duration,
        trainer_name: trainingData.trainer_name || '',
        trainer_details: trainingData.trainer_details || '',
        location: trainingData.location,
        start_date: trainingData.start_date,
        end_date: trainingData.end_date,
        objectives: Array.isArray(trainingData.objectives) ? trainingData.objectives :
                  typeof trainingData.objectives === 'string' ? [trainingData.objectives] :
                  ['Objectifs à définir'],
        price: trainingData.price,
        evaluation_methods: trainingData.evaluation_methods,
        tracking_methods: trainingData.tracking_methods,
        pedagogical_methods: pedagogicalMethods,
        material_elements: materialElements
      };
      setFormattedTraining(formattedTrainingObj);

    } catch (error) {
      console.error('Erreur lors du chargement des données pour la convention:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDocument = () => {
    setShowAgreement(false);
    setFormattedTraining(null);
    setParticipant(null);
    setAllParticipants([]);
    setOrganizationSettings(null);
    setCompany(null);
    setIsLoading(false);
    setHasError(false);
    if (onDocumentClose) onDocumentClose();
  };

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
    if (!formattedTraining || !participant || !organizationSettings) {
      return <div className="p-4 text-center">Chargement des données du template...</div>;
    }

    const templateCompany = company ? {
      name: company.name || 'À compléter',
      address: company.address || 'À compléter',
      postal_code: company.postal_code || '',
      city: company.city || '',
      country: company.country || 'France',
      siret: company.siret || 'À compléter',
      contact_name: company.contact_name,
      contact_email: company.contact_email,
      contact_phone: company.contact_phone,
      isIndependent: company.isIndependent
    } : { name: 'À compléter' };

    const templateSettings: TemplateOrganizationSettings = {
      organization_name: organizationSettings.organization_name || 'PetitMaker',
      address: organizationSettings.address || 'Adresse à compléter',
      siret: organizationSettings.siret || 'SIRET à compléter',
      activity_declaration_number: organizationSettings.activity_declaration_number || 'Numéro à compléter',
      representative_name: organizationSettings.representative_name || 'Représentant à compléter',
      representative_title: organizationSettings.representative_title || 'Titre à compléter',
      city: organizationSettings.city || 'Ville à compléter',
      postal_code: organizationSettings.postal_code || 'Code Postal',
      country: organizationSettings.country || 'Pays'
    };

    return (
      <UnifiedTrainingAgreementTemplate
        participants={allParticipants}
        participant={participant}
        training={formattedTraining}
        company={templateCompany}
        organizationSettings={templateSettings}
        participantSignature={participantSignature}
        representativeSignature={representativeSignature}
        trainerSignature={trainerSignature}
        companySeal={companySeal}
        organizationSeal={organizationSeal}
        viewContext="student"
      />
    );
  };

  const getButtonClass = () => {
    if (className) return className;
    let baseClass = "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium ";
    switch (variant) {
      case 'default': return baseClass + "bg-blue-600 text-white hover:bg-blue-700";
      case 'outline': return baseClass + "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50";
      case 'ghost': return baseClass + "text-gray-700 hover:bg-gray-100";
      default: return baseClass + "bg-blue-600 text-white hover:bg-blue-700";
    }
  };

  return (
    <>
      <button
        onClick={loadDataAndShow}
        className={getButtonClass()}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-1"></div>
            Chargement...
          </div>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            {buttonText}
          </>
        )}
      </button>

      {showAgreement && participant && (
        <DocumentWithSignatures
          documentType={DocumentType.CONVENTION}
          trainingId={trainingId}
          participantId={userId}
          participantName={`${participant.first_name} ${participant.last_name}`}
          viewContext="student"
          onCancel={handleCloseDocument}
          onDocumentOpen={onDocumentOpen}
          onDocumentClose={onDocumentClose}
          renderTemplate={renderTemplate}
          documentTitle="Convention de formation"
        />
      )}

      {showAgreement && hasError && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-red-600">Erreur</h3>
              <p className="mb-4">
                Une erreur est survenue lors du chargement de la convention de formation. 
                Veuillez réessayer ultérieurement ou contacter votre formateur.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={handleCloseDocument}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 