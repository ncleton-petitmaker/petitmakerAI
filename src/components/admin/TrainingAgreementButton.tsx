import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DocumentWithSignatures } from '../shared/DocumentWithSignatures';
import { DocumentType, SignatureType } from '../shared/DocumentSignatureManager';
import { UnifiedTrainingAgreementTemplate } from '../shared/templates/unified/TrainingAgreementTemplate';
import { Training, Participant, OrganizationSettings } from '../shared/DocumentUtils';

interface TrainingAgreementButtonProps {
  training: any;
  participants: any[];
  buttonText?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

/**
 * Bouton pour générer une convention de formation dans l'interface CRM
 * 
 * Cette version utilise le composant TrainingAgreementTemplate avec focus
 * sur la signature du formateur.
 */
export const TrainingAgreementButton: React.FC<TrainingAgreementButtonProps> = ({
  training,
  participants,
  buttonText = "Convention de formation",
  className = "",
  variant = 'primary'
}) => {
  const [showAgreement, setShowAgreement] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [formattedTraining, setFormattedTraining] = useState<Training | null>(null);
  const [formattedParticipants, setFormattedParticipants] = useState<Participant[]>([]);
  const [organizationSettings, setOrganizationSettings] = useState<OrganizationSettings | null>(null);
  const [company, setCompany] = useState<any>({ name: '', address: 'À compléter', siret: 'À compléter' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredParticipants, setFilteredParticipants] = useState<any[]>([]);
  
  // Use effect pour filtrer les participants en fonction du terme de recherche
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredParticipants(participants);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = participants.filter(participant => 
      (participant.first_name && participant.first_name.toLowerCase().includes(term)) || 
      (participant.last_name && participant.last_name.toLowerCase().includes(term)) ||
      (participant.email && participant.email.toLowerCase().includes(term)) ||
      (participant.job_position && participant.job_position.toLowerCase().includes(term))
    );
    
    setFilteredParticipants(filtered);
  }, [searchTerm, participants]);
  
  // Avec le modèle unifié, nous chargeons les données de tous les participants
  // par défaut pour la convention commune
  useEffect(() => {
    if (participants.length > 0) {
      loadAllParticipantsData();
    }
  }, [participants]);

  // Charger les données formatées lorsqu'un participant est sélectionné
  useEffect(() => {
    if (selectedParticipant) {
      loadParticipantData(selectedParticipant);
    }
  }, [selectedParticipant]);

  // Nouvelle fonction pour charger les données de tous les participants
  const loadAllParticipantsData = async (): Promise<void> => {
    console.log('🔍 [DEBUG] TrainingAgreementButton - Chargement des données pour tous les participants:', participants.length);
    setIsLoading(true);
    setHasError(false);

    try {
      // Formater tous les participants
      const allFormattedParticipants = participants.map(p => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email || '',
        job_position: p.job_position || '',
        status: p.status || '',
        company: p.company || p.company_name || ''
      }));

      setFormattedParticipants(allFormattedParticipants);
      console.log('🔍 [DEBUG] TrainingAgreementButton - Participants formatés:', allFormattedParticipants);

      // Exécuter ces opérations en parallèle pour un chargement plus rapide
      await Promise.all([
        // Récupérer l'entreprise associée à la formation
        loadCompanyData(),
        
        // Charger les données de formation
        loadTrainingData(),
        
        // Charger les paramètres de l'organisation
        loadOrganizationSettings()
      ]);
      
      console.log('🔍 [DEBUG] TrainingAgreementButton - Toutes les données chargées avec succès');
    } catch (error) {
      console.error('❌ [ERROR] Erreur lors du chargement des données:', error);
      setHasError(true);
      throw error; // Propager l'erreur pour permettre le catch dans handleOpenAgreement
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour charger les données de l'entreprise
  const loadCompanyData = async () => {
    console.log('🔍 [DEBUG] TrainingAgreementButton - Chargement des données d\'entreprise pour la training.company_id:', training.company_id);
    
    // PRIORITÉ 1: Récupérer l'entreprise à partir de la formation si disponible
    if (training.company_id) {
      console.log('🔍 [DEBUG] Priorité 1: Recherche de l\'entreprise par company_id de la formation:', training.company_id);
      
      try {
        const { data: trainingCompanyData, error: trainingCompanyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', training.company_id)
          .maybeSingle();

        console.log('🔍 [DEBUG] Requête Supabase pour entreprise de la formation - Résultat:', trainingCompanyData, 'Erreur:', trainingCompanyError);
        
        if (trainingCompanyError) {
          console.error('❌ [ERROR] Erreur lors de la récupération de l\'entreprise de la formation:', trainingCompanyError);
        } else if (trainingCompanyData) {
          console.log('✅ [DEBUG] Entreprise de la formation trouvée:', trainingCompanyData);
          setCompany(trainingCompanyData);
          return;
        } else {
          console.log('⚠️ [DEBUG] Aucune entreprise trouvée pour l\'ID de la formation, passage aux autres méthodes');
        }
      } catch (error) {
        console.error('❌ [ERROR] Exception pendant la recherche de l\'entreprise de la formation:', error);
      }
    } else if (training.company_name) {
      console.log('🔍 [DEBUG] Priorité 1 bis: Recherche par company_name de la formation:', training.company_name);
      
      try {
        const { data: trainingCompanyNameData, error: trainingCompanyNameError } = await supabase
          .from('companies')
          .select('*')
          .eq('name', training.company_name)
          .maybeSingle();

        if (!trainingCompanyNameError && trainingCompanyNameData) {
          console.log('✅ [DEBUG] Entreprise trouvée par nom de la formation:', trainingCompanyNameData);
          setCompany(trainingCompanyNameData);
          return;
        } else {
          console.log('⚠️ [DEBUG] Aucune entreprise trouvée par nom de la formation:', trainingCompanyNameError);
        }
      } catch (error) {
        console.error('❌ [ERROR] Exception pendant la recherche par nom de la formation:', error);
      }
    }
    
    // Si aucune entreprise n'est trouvée, utiliser une valeur par défaut
    setCompany({
      name: training.company_name || 'À compléter',
      address: 'À compléter',
      postal_code: '',
      city: '',
      siret: 'À compléter'
    });
  };

  // Fonction pour charger les données de formation
  const loadTrainingData = async () => {
    console.log('🔍 [DEBUG] TrainingAgreementButton - Chargement des données de formation:', training.id);
    
    try {
      // Analyse préliminaire des valeurs JSON si nécessaire
      let pedagogicalMethods = training.pedagogical_methods;
      let materialElements = training.material_elements;
      
      // Si les valeurs sont des chaînes JSON, essayer de les parser
      if (typeof pedagogicalMethods === 'string') {
        try {
          pedagogicalMethods = JSON.parse(pedagogicalMethods);
          console.log('📊 [DEBUG] TrainingAgreementButton - pedagogical_methods parsé depuis JSON:', pedagogicalMethods);
        } catch (e) {
          console.error('📊 [ERROR] TrainingAgreementButton - Erreur de parsing JSON pour pedagogical_methods:', e);
          pedagogicalMethods = {};
        }
      }
      
      if (typeof materialElements === 'string') {
        try {
          materialElements = JSON.parse(materialElements);
          console.log('📊 [DEBUG] TrainingAgreementButton - material_elements parsé depuis JSON:', materialElements);
        } catch (e) {
          console.error('📊 [ERROR] TrainingAgreementButton - Erreur de parsing JSON pour material_elements:', e);
          materialElements = {};
        }
      }
      
      const formattedTrainingData = {
        id: training.id,
        title: training.title,
        duration: training.duration,
        trainer_name: training.trainer_name || '',
        trainer_details: training.trainer_details || '',
        location: training.location,
        start_date: training.start_date,
        end_date: training.end_date,
        objectives: Array.isArray(training.objectives) ? training.objectives : 
                  typeof training.objectives === 'string' ? [training.objectives] : 
                  ['Objectifs à définir'],
        price: training.price,
        evaluation_methods: {
          profile_evaluation: training.evaluation_methods?.profile_evaluation || false,
          skills_evaluation: training.evaluation_methods?.skills_evaluation || false,
          knowledge_evaluation: training.evaluation_methods?.knowledge_evaluation || false,
          satisfaction_survey: training.evaluation_methods?.satisfaction_survey || false
        },
        tracking_methods: {
          attendance_sheet: training.tracking_methods?.attendance_sheet || false,
          completion_certificate: training.tracking_methods?.completion_certificate || false
        },
        pedagogical_methods: {
          needs_evaluation: pedagogicalMethods?.needs_evaluation || false,
          theoretical_content: pedagogicalMethods?.theoretical_content || false,
          practical_exercises: pedagogicalMethods?.practical_exercises || false,
          case_studies: pedagogicalMethods?.case_studies || false,
          experience_sharing: pedagogicalMethods?.experience_sharing || false,
          digital_support: pedagogicalMethods?.digital_support || false
        },
        material_elements: {
          computer_provided: materialElements?.computer_provided || false,
          pedagogical_material: materialElements?.pedagogical_material || false,
          digital_support_provided: materialElements?.digital_support_provided || false
        }
      };
      
      console.log('📊 [DEBUG] TrainingAgreementButton - Formation formatée:', formattedTrainingData);
      setFormattedTraining(formattedTrainingData);
    } catch (error) {
      console.error('❌ [ERROR] Erreur lors du formatage des données de formation:', error);
      throw error;
    }
  };

  // Nouvelle fonction pour charger le tampon de l'organisme
  const loadOrganizationSettings = async () => {
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .single();

      if (settingsError) {
        console.error('❌ [ERROR] Erreur lors de la récupération des paramètres:', settingsError);
      } else if (settingsData) {
        // Récupérer l'URL du tampon de l'organisme s'il existe
        let organizationSealUrl = null;
        if (settingsData.organization_seal_path) {
          try {
            const { data: sealData } = await supabase.storage
              .from('organization-seals')
              .getPublicUrl(settingsData.organization_seal_path);
            
            if (sealData && sealData.publicUrl) {
              organizationSealUrl = sealData.publicUrl;
              console.log('✅ [DEBUG] URL du tampon de l\'organisme récupérée:', organizationSealUrl);
            }
          } catch (sealError) {
            console.error('❌ [ERROR] Erreur lors de la récupération du tampon de l\'organisme:', sealError);
          }
        }

        setOrganizationSettings({
          organization_name: settingsData.company_name || '',
          address: settingsData.address || '',
          postal_code: settingsData.postal_code || '',
          city: settingsData.city || '',
          country: settingsData.country || 'France',
          siret: settingsData.siret || '',
          activity_declaration_number: settingsData.training_number || '',
          representative_name: settingsData.representative_name || '',
          representative_title: settingsData.representative_title || 'Directeur',
          organization_seal_url: organizationSealUrl as string | undefined
        });
      }
    } catch (error) {
      console.error('❌ [ERROR] Erreur lors du chargement des paramètres de l\'organisation:', error);
      throw error;
    }
  };

  const loadParticipantData = async (participantData: any) => {
    console.log('🔍 [DEBUG] TrainingAgreementButton - Chargement des données du participant sélectionné:', participantData);
    setIsLoading(true);
    setHasError(false);

    try {
      await loadCompanyData();
      await loadTrainingData();
      await loadOrganizationSettings();
      
      // Mapper les données du participant
      const formattedParticipantData = {
        id: participantData.id,
        first_name: participantData.first_name,
        last_name: participantData.last_name,
        email: participantData.email || '',
        job_position: participantData.job_position || '',
        status: participantData.status || '',
        company: participantData.company || participantData.company_name || ''
      };
      
      // Mettre à jour la liste des participants formatés avec un seul participant
      setFormattedParticipants([formattedParticipantData]);
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour ouvrir la modal de sélection de participant
  const handleOpenAgreement = () => {
    console.log('🔍 [DEBUG] TrainingAgreementButton - Ouverture de la convention');
    
    // Vérifier que des participants sont disponibles
    if (participants.length === 0) {
      alert("Aucun participant n'est inscrit à cette formation.");
      return;
    }
    
    // Réinitialiser les états pour éviter les problèmes de stale data
    setIsLoading(true);
    setHasError(false);
    setFormattedTraining(null);
    setFormattedParticipants([]);
    setOrganizationSettings(null);
    
    // Charger les données de tous les participants
    loadAllParticipantsData().then(() => {
      // Afficher la convention une fois les données chargées
      setShowAgreement(true);
    }).catch(error => {
      console.error('🔍 [ERROR] Erreur lors de l\'ouverture de la convention:', error);
      setHasError(true);
      setIsLoading(false);
      alert("Une erreur est survenue lors du chargement de la convention.");
    });
  };

  const handleCloseAgreement = () => {
    console.log('🔍 [DEBUG] TrainingAgreementButton - Fermeture de la convention');
    
    // Masquer d'abord la convention
    setShowAgreement(false);
    
    // Réinitialiser progressivement tous les états pour éviter les fuites de mémoire
    // et les problèmes de données obsolètes
    setTimeout(() => {
      setSelectedParticipant(null);
      setFormattedTraining(null);
      setFormattedParticipants([]);
      setOrganizationSettings(null);
      setCompany({ name: '', address: 'À compléter', siret: 'À compléter' });
      setIsLoading(false);
      setHasError(false);
      
      console.log('🔍 [DEBUG] TrainingAgreementButton - États réinitialisés après fermeture');
    }, 300);
  };

  // Cette fonction n'est plus nécessaire mais nous la gardons pour des raisons de compatibilité
  const handleSelectParticipant = (participantData: any) => {
    setSelectedParticipant(participantData);
  };

  // Nom complet des participants pour le titre
  const getParticipantsTitle = () => {
    if (formattedParticipants.length === 0) return 'Convention de formation';
    if (formattedParticipants.length === 1) {
      return `Convention de formation - ${formattedParticipants[0].first_name} ${formattedParticipants[0].last_name}`;
    }
    return `Convention de formation - ${formattedParticipants.length} participants`;
  };

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
    // Logs pour suivre les signatures
    console.log('🔍 [DEBUG] TrainingAgreementButton - renderTemplate avec signatures:', {
      participantSignature: participantSignature ? "PRÉSENTE" : "ABSENTE",
      representativeSignature: representativeSignature ? "PRÉSENTE" : "ABSENTE",
      trainerSignature: trainerSignature ? "PRÉSENTE" : "ABSENTE",
      companySeal: companySeal ? "PRÉSENT" : "ABSENT",
      organizationSeal: organizationSeal ? "PRÉSENT" : "ABSENT"
    });
    
    if (!formattedTraining || formattedParticipants.length === 0) {
      return <div className="p-4">Chargement des données...</div>;
    }
    
    // Adaptation des données pour correspondre au format attendu par UnifiedTrainingAgreementTemplate
    const adaptedTraining = {
      id: formattedTraining.id,
      title: formattedTraining.title,
      duration: formattedTraining.duration,
      trainer_name: formattedTraining.trainer_name,
      location: typeof formattedTraining.location === 'string' 
        ? formattedTraining.location 
        : (formattedTraining.location?.name || ''),
      start_date: formattedTraining.start_date,
      end_date: formattedTraining.end_date,
      objectives: formattedTraining.objectives,
      evaluation_methods: formattedTraining.evaluation_methods,
      tracking_methods: formattedTraining.tracking_methods,
      pedagogical_methods: formattedTraining.pedagogical_methods,
      material_elements: formattedTraining.material_elements,
      price: formattedTraining.price
    };
    
    // Log détaillé des propriétés de l'objet adaptedTraining
    console.log('📊 [DEBUG] TrainingAgreementButton - adaptedTraining transmis au template:', adaptedTraining);
    
    // Adaptation des paramètres d'organisation
    const adaptedOrgSettings = organizationSettings ? {
      organization_name: organizationSettings.organization_name,
      siret: organizationSettings.siret,
      address: organizationSettings.address,
      postal_code: organizationSettings.postal_code,
      city: organizationSettings.city,
      country: organizationSettings.country,
      representative_name: organizationSettings.representative_name,
      representative_title: organizationSettings.representative_title,
      activity_declaration_number: organizationSettings.activity_declaration_number
    } : {
      organization_name: 'PETITMAKER',
      siret: 'À compléter',
      address: 'À compléter',
      activity_declaration_number: 'À compléter'
    };
    
    // Log des participants qui seront affichés dans la convention
    console.log('📊 [DEBUG] TrainingAgreementButton - Participants transmis au template:', formattedParticipants);
    
    // Utilisez le template unifié qui accepte un tableau de participants
    return (
      <UnifiedTrainingAgreementTemplate
        // Passer le tableau complet de participants 
        participants={formattedParticipants}
        // Participant individuel n'est plus nécessaire mais gardé pour compatibilité
        participant={formattedParticipants.length > 0 ? formattedParticipants[0] : undefined}
        training={adaptedTraining}
        company={company}
        organizationSettings={adaptedOrgSettings}
        participantSignature={participantSignature}
        representativeSignature={representativeSignature}
        trainerSignature={trainerSignature}
        companySeal={companySeal}
        organizationSeal={organizationSeal}
        viewContext="crm"
        pdfMode={false}
      />
    );
  };

  // Classes du bouton selon la variante
  const getButtonClass = () => {
    if (className) return className;

    let baseClass = "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium ";
    
    switch (variant) {
      case 'primary':
        return baseClass + "bg-blue-600 text-white hover:bg-blue-700";
      case 'secondary':
        return baseClass + "bg-gray-100 text-gray-800 hover:bg-gray-200";
      case 'outline':
        return baseClass + "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50";
      default:
        return baseClass + "bg-blue-600 text-white hover:bg-blue-700";
    }
  };

  return (
    <>
      <button
        onClick={handleOpenAgreement}
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

      {showAgreement && formattedTraining && (
        <DocumentWithSignatures
          documentType={DocumentType.CONVENTION}
          trainingId={formattedTraining.id}
          // Nous utilisons le premier participant comme référence pour les signatures
          // bien que la convention affiche tous les participants
          participantId={formattedParticipants.length > 0 ? formattedParticipants[0].id : ''}
          participantName={getParticipantsTitle()}
          viewContext="crm"
          onCancel={handleCloseAgreement}
          renderTemplate={renderTemplate}
          documentTitle={getParticipantsTitle()}
          allowCompanySeal={true}
          allowOrganizationSeal={true}
        />
      )}
    </>
  );
}; 