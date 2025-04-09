import React, { useRef, useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import SafeImage from '../../../shared/SafeImage';
import { supabase } from '../../../../lib/supabase';

/**
 * Template unifié pour les conventions de formation
 */
export interface UnifiedTrainingAgreementTemplateProps {
  // Données du stagiaire - Modifié pour accepter un tableau de participants
  participants: Array<{
    id: string;
    first_name: string;
    last_name: string;
    job_position?: string;
    company?: string;
    email?: string;
    phone?: string;
    status?: string;
  }>;
  
  // Participant principal (pour rétrocompatibilité)
  participant?: {
    id: string;
    first_name: string;
    last_name: string;
    job_position?: string;
    company?: string;
    email?: string;
    phone?: string;
    status?: string;
  };
  
  // Données de la formation
  training: {
    id: string;
    title: string;
    duration: string;
    trainer_name: string;
    trainer_details?: string;
    location: string | { name: string; city?: string };
    start_date: string | null;
    end_date: string | null;
    objectives?: string[];
    content?: string;
    price?: number | null;
    evaluation_methods?: {
      profile_evaluation?: boolean;
      skills_evaluation?: boolean;
      knowledge_evaluation?: boolean;
      satisfaction_survey?: boolean;
    };
    tracking_methods?: {
      attendance_sheet?: boolean;
      completion_certificate?: boolean;
    };
    pedagogical_methods?: {
      needs_evaluation?: boolean;
      theoretical_content?: boolean;
      practical_exercises?: boolean;
      case_studies?: boolean;
      experience_sharing?: boolean;
      digital_support?: boolean;
    };
    material_elements?: {
      computer_provided?: boolean;
      pedagogical_material?: boolean;
      digital_support_provided?: boolean;
    };
    type?: string; // Added type field
  };
  
  // Données de l'entreprise (optionnelles)
  company?: {
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
  
  // Paramètres de l'organisme de formation
  organizationSettings: OrganizationSettings;
  
  // Données de signatures
  participantSignature?: string | null;
  representativeSignature?: string | null;
  trainerSignature?: string | null;
  companySeal?: string | null; // Tampon d'entreprise
  organizationSeal?: string | null; // Tampon de l'organisme de formation
  
  // Options d'affichage
  viewContext?: 'crm' | 'student' | 'admin' | 'generic';
  pdfMode?: boolean;
  
  // ID optionnel du formateur pour récupération de signature
  trainerId?: string;
  
  // Callbacks
  onRenderComplete?: () => void;
}

// Définition des paramètres par défaut pour l'organisation
export interface OrganizationSettings {
  organization_name: string;
  address: string;
  siret: string;
  activity_declaration_number: string;
  representative_name: string;
  representative_title: string;
  city: string;
  postal_code: string;
  country: string;
}

const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  organization_name: 'PETITMAKER',
  address: '2 rue Héraclès',
  siret: '928 386 044 00012',
  activity_declaration_number: '32 59 10753 59',
  representative_name: 'Nicolas Cleton',
  representative_title: 'Président',
  city: 'Villeneuve-d\'Ascq',
  postal_code: '59650',
  country: 'France'
};

/**
 * Template unifié pour les conventions de formation - version simplifiée
 */
export const UnifiedTrainingAgreementTemplate: React.FC<UnifiedTrainingAgreementTemplateProps> = React.memo(({
  participant,
  participants = [],
  training,
  company = { name: '' },
  organizationSettings = DEFAULT_ORGANIZATION_SETTINGS,
  participantSignature,
  representativeSignature,
  trainerSignature,
  companySeal,
  organizationSeal,
  viewContext = 'crm',
  pdfMode = false,
  trainerId,
  onRenderComplete
}) => {
  // S'assurer que nous avons toujours un tableau de participants
  const allParticipants = participants.length > 0 ? participants : (participant ? [participant] : []);
  
  const documentRef = useRef<HTMLDivElement>(null);
  const [signaturesInitialized, setSignaturesInitialized] = useState(false);

  // État pour suivre les signatures et tampons déjà chargés avec succès
  const [loadedSignatures, setLoadedSignatures] = useState({
    participantSig: false,
    representativeSig: false,
    trainerSig: false,
    companySeal: false,
    organizationSeal: false
  });

  // Fonction pour marquer une signature comme chargée
  const markSignatureAsLoaded = (type: 'participantSig' | 'representativeSig' | 'trainerSig' | 'companySeal' | 'organizationSeal') => {
    setLoadedSignatures(prev => ({
      ...prev,
      [type]: true
    }));
  };

  // Formatage des dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: fr });
    } catch (e) {
      return dateString;
    }
  };

  // Obtenir les dates de formation
  const getTrainingDates = () => {
    const startDate = training.start_date ? format(new Date(training.start_date), 'dd MMMM yyyy', { locale: fr }) : null;
    const endDate = training.end_date ? format(new Date(training.end_date), 'dd MMMM yyyy', { locale: fr }) : null;
    
    if (startDate && endDate) {
      if (startDate === endDate) {
        return `le ${startDate}`;
      } else {
        return `du ${startDate} au ${endDate}`;
      }
    } else if (startDate) {
      return `à partir du ${startDate}`;
    } else if (endDate) {
      return `jusqu'au ${endDate}`;
    } else {
      // Vérifier que duration existe et n'est pas vide
      const validDuration = training.duration && 
                           typeof training.duration === 'string' && 
                           training.duration.trim() !== '' && 
                           training.duration !== 'À compléter' && 
                           training.duration !== 'À définir';
      
      return validDuration ? 
        `Calendrier à confirmer (durée : ${training.duration})` : 
        'Dates à définir';
    }
  };
  
  // Obtenir les objectifs de formation
  const getObjectives = () => {
    // Considérer plusieurs formats possibles pour les objectifs
    if (Array.isArray(training.objectives) && training.objectives.length > 0) {
      return training.objectives.filter(obj => obj && obj.trim() !== '');
    }
    
    if (typeof training.objectives === 'string') {
      try {
        // Essayer de parser la chaîne JSON
        const parsed = JSON.parse(training.objectives);
        if (Array.isArray(parsed)) {
          return parsed.filter(obj => obj && typeof obj === 'string' && obj.trim() !== '');
        }
      } catch (e) {
        // Si ce n'est pas du JSON valide, traiter comme une chaîne unique
        return [training.objectives];
      }
    }
    
    // Si aucun format reconnu ou pas d'objectifs définis
    return ['Objectifs à définir'];
  };

  // Méthodes d'évaluation
  const getEvaluationMethods = () => {
    const methods = [];
    
    // Vérifier si evaluation_methods existe et est déjà un objet
    const evalMethods = typeof training.evaluation_methods === 'object' 
      ? training.evaluation_methods 
      : typeof training.evaluation_methods === 'string' 
        ? (() => {
            try { return JSON.parse(training.evaluation_methods); } 
            catch(e) { return {}; }
          })() 
        : {};
    
    if (evalMethods?.profile_evaluation) methods.push("Évaluation du profil avant formation");
    if (evalMethods?.skills_evaluation) methods.push("Évaluation des compétences acquises");
    if (evalMethods?.knowledge_evaluation) methods.push("Évaluation des connaissances");
    if (evalMethods?.satisfaction_survey) methods.push("Questionnaire de satisfaction");
    
    // Parcourir toutes les propriétés pour voir s'il y a des valeurs non booléennes
    if (evalMethods && methods.length === 0) {
      Object.entries(evalMethods).forEach(([key, value]) => {
        // Vérifier si la valeur est une chaîne non vide
        if (value && typeof value === 'string' && value !== '') {
          methods.push(value);
        }
      });
    }
    
    return methods.length > 0 ? methods : ["Évaluation à définir"];
  };

  // Méthodes pédagogiques
  const getPedagogicalMethods = () => {
    const methods = [];
    
    // Vérifier si pedagogical_methods existe et est déjà un objet
    const pedagogy = typeof training.pedagogical_methods === 'object' 
      ? training.pedagogical_methods 
      : typeof training.pedagogical_methods === 'string' 
        ? (() => {
            try { return JSON.parse(training.pedagogical_methods); } 
            catch(e) { return {}; }
          })() 
        : {};
    
    if (pedagogy?.needs_evaluation) methods.push("Évaluation des besoins");
    if (pedagogy?.theoretical_content) methods.push("Apports théoriques");
    if (pedagogy?.practical_exercises) methods.push("Exercices pratiques");
    if (pedagogy?.case_studies) methods.push("Études de cas");
    if (pedagogy?.experience_sharing) methods.push("Partage d'expérience");
    if (pedagogy?.digital_support) methods.push("Support de cours numérique");
    
    // Parcourir toutes les propriétés pour voir s'il y a des valeurs non booléennes
    if (pedagogy && methods.length === 0) {
      Object.entries(pedagogy).forEach(([key, value]) => {
        // Vérifier si la valeur est une chaîne non vide
        if (value && typeof value === 'string' && value !== '') {
          methods.push(value);
        }
      });
    }
    
    return methods.length > 0 ? methods : ["Méthodes pédagogiques à définir"];
  };

  // Éléments matériels
  const getMaterialElements = () => {
    const elements = [];
    
    // Vérifier si material_elements existe et est déjà un objet
    const material = typeof training.material_elements === 'object' 
      ? training.material_elements 
      : typeof training.material_elements === 'string' 
        ? (() => {
            try { return JSON.parse(training.material_elements); } 
            catch(e) { return {}; }
          })() 
        : {};
    
    if (material?.computer_provided) elements.push("Ordinateur fourni");
    if (material?.pedagogical_material) elements.push("Matériel pédagogique");
    if (material?.digital_support_provided) elements.push("Support de cours au format numérique");
    
    // Parcourir toutes les propriétés pour voir s'il y a des valeurs non booléennes
    if (material && elements.length === 0) {
      Object.entries(material).forEach(([key, value]) => {
        // Vérifier si la valeur est une chaîne non vide
        if (value && typeof value === 'string' && value !== '') {
          elements.push(value);
        }
      });
    }
    
    return elements.length > 0 ? elements : ["Éléments matériels à définir"];
  };
  
  // Fonction pour ajouter un timestamp stable aux URLs d'images - une seule fois par URL
  const getStableSignatureUrl = (url: string): string => {
    if (!url) return '';
    
    // Vérifier si c'est une URL
    try {
      const parsedUrl = new URL(url);
      const baseUrl = url.split('?')[0]; // Utiliser l'URL de base sans paramètres
      return `${baseUrl}?stable=true`; // Paramètre fixe, pas aléatoire
    } catch (e) {
      return url;
    }
  };

  // Fonction pour formater le prix
  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined || price === 0) return 'Sur devis';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
  };

  // Récupération des données formatées
  const objectives = getObjectives();
  const evaluationMethods = getEvaluationMethods();
  const pedagogicalMethods = getPedagogicalMethods();
  const materialElements = getMaterialElements();
  
  // Formatage des données d'entreprise avec validations simplifiées
  const isValidString = (value: any): boolean => {
    return value !== null && value !== undefined && value !== '' && typeof value === 'string' && value.trim().length > 0;
  };
  
  // Fonction pour garantir une valeur texte sécurisée
  const safeText = (value: any, defaultValue: string = 'À compléter'): string => {
    if (value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')) {
      return defaultValue;
    }
    return String(value);
  };

  // Déterminer le texte à afficher pour l'entreprise
  const displayCompanyInfo = (): React.ReactNode => {
  const companyName = isValidString(company?.name) ? company.name : 
                      isValidString(participant?.company) ? participant?.company : 
                      participant?.status === 'auto-entrepreneur' ? `${participant?.first_name} ${participant?.last_name} (Auto-entrepreneur)` :
                      'À compléter';
                      
    const companyAddress = safeText(company?.address);
    const companySiret = safeText(company?.siret);
    
    if (isValidString(companyName)) {
      // Une entreprise est spécifiée
      return (
        <>
          <p>L'entreprise : <span>{companyName}</span></p>
          <p>Adresse de l'entreprise : <span>{companyAddress || 'À compléter'}{company?.postal_code && company?.city ? `, ${company.postal_code} ${company.city}` : ''}</span></p>
          <p>SIRET de l'entreprise : <span>{companySiret || 'À compléter'}</span></p>
        </>
      );
    } else if (participant?.status === 'auto-entrepreneur' || participant?.status === 'freelance') {
      // Cas spécial pour auto-entrepreneur ou freelance
      return (
        <>
          <p>Apprenant indépendant : <span>{participant?.first_name} {participant?.last_name}</span></p>
          <p>Statut : <span>{participant?.status || 'Auto-entrepreneur'}</span></p>
          <p>SIRET : <span>{companySiret || 'À compléter'}</span></p>
        </>
      );
    } else {
      // Cas par défaut - information manquante
      return (
        <>
          <p>L'entreprise : <span>À compléter</span></p>
          <p>Adresse de l'entreprise : <span>À compléter</span></p>
          <p>SIRET de l'entreprise : <span>À compléter</span></p>
        </>
      );
    }
  };
  
  // Formater l'adresse complète de l'entreprise pour "Fait en double exemplaire"
  const getFormattedCompanyAddress = (): string => {
  const companyAddress = safeText(company?.address);
    if (!isValidString(companyAddress)) return '';
    
    let formatted = companyAddress;
    if (company?.postal_code && company?.city) {
      formatted += `, ${company.postal_code} ${company.city}`;
    }
    if (company?.country && company.country !== 'France') {
      formatted += `, ${company.country}`;
    }
    return formatted;
  };

  // Pour les méthodes de suivi
  const getTrackingMethods = () => {
    // Vérifier si tracking_methods existe et est déjà un objet
    const tracking = typeof training.tracking_methods === 'object' 
      ? training.tracking_methods 
      : typeof training.tracking_methods === 'string' 
        ? (() => {
            try { return JSON.parse(training.tracking_methods); } 
            catch(e) { return {}; }
          })() 
        : {};
        
    return tracking;
  };

  // Utilisons cette fonction pour le rendu des méthodes de suivi
  const trackingMethods = getTrackingMethods();

  // Obtenir le lieu de formation, avec valeur par défaut
  const getTrainingLocation = () => {
    // Si la formation a un lieu spécifique défini et valide
    if (training.location && typeof training.location === 'string' && training.location.trim() !== '' && 
        training.location !== 'Lille' && training.location !== 'À définir' && training.location !== 'À compléter') {
      return training.location;
    } else if (training.location && typeof training.location === 'object' && 'name' in training.location && 
               (training.location as any).name && (training.location as any).name !== 'Lille') {
      // Pour le cas où la location est un objet
      return (training.location as any).name + ((training.location as any).city ? `, ${(training.location as any).city}` : '');
    }
    
    // Si nous avons les données de l'entreprise, utilisez l'adresse de l'entreprise
    if (company && company.city && company.city.trim() !== '') {
      return company.city;
    } else if (company && company.address && company.address.trim() !== '') {
      // Essayer d'extraire la ville de l'adresse si possible
      const addressParts = company.address.split(',');
      if (addressParts.length > 1) {
        // Prendre la dernière partie qui contient probablement la ville
        return addressParts[addressParts.length - 1].trim();
      }
      return company.address;
    }
    
    // Fallback à "Dans vos locaux" au lieu de "Lille"
    return "Dans vos locaux";
  };

  // Fonction pour formater l'adresse de l'organisme de formation
  const formatOrganizationAddress = (settings: OrganizationSettings): string => {
    const parts = [settings.address];
    
    if (settings.postal_code || settings.city) {
      const locationParts = [settings.postal_code, settings.city].filter(Boolean);
      parts.push(locationParts.join(' '));
    }
    
    if (settings.country && settings.country.toLowerCase() !== 'france') {
      parts.push(settings.country);
    }
    
    return parts.filter(Boolean).join(', ');
  };

  // Fonction pour obtenir les informations de l'organisme de formation
  const getOrganizationInfo = (settings: OrganizationSettings) => {
    return {
      name: settings.organization_name,
      address: formatOrganizationAddress(settings),
      siret: settings.siret || 'SIRET non renseigné',
      activityNumber: settings.activity_declaration_number || 'Numéro de déclaration d\'activité non renseigné',
      representative: settings.representative_name ? 
        `${settings.representative_name}${settings.representative_title ? `, ${settings.representative_title}` : ''}` :
        'Représentant non renseigné'
    };
  };

  // Initialiser les signatures une seule fois
  useEffect(() => {
    setSignaturesInitialized(true);
    
    // Notifier quand le composant est prêt
    if (onRenderComplete) {
      const timer = setTimeout(() => {
        onRenderComplete();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [onRenderComplete]);

  // URLs stables pour les signatures et tampons
  const stableParticipantSigUrl = useMemo(() => participantSignature ? getStableSignatureUrl(participantSignature) : null, [participantSignature]);
  const stableRepresentativeSigUrl = useMemo(() => representativeSignature ? getStableSignatureUrl(representativeSignature) : null, [representativeSignature]);
  const stableTrainerSigUrl = useMemo(() => trainerSignature ? getStableSignatureUrl(trainerSignature) : null, [trainerSignature]);
  const stableCompanySealUrl = useMemo(() => companySeal ? getStableSignatureUrl(companySeal) : null, [companySeal]);
  const stableOrganizationSealUrl = useMemo(() => organizationSeal ? getStableSignatureUrl(organizationSeal) : null, [organizationSeal]);

  // Rendu des zones de signature/tampon
  // Zone de signature du formateur
  const renderTrainerSignature = () => {
    return (
      <div className="h-28 border border-gray-300 relative">
        {stableTrainerSigUrl ? (
          <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden">
            <SafeImage 
              src={stableTrainerSigUrl} 
              alt="Signature du formateur" 
              className="max-h-20 max-w-[95%] object-contain"
              onLoad={() => markSignatureAsLoaded('trainerSig')}
              isSignature={true}
              pdfMode={pdfMode}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <p className="text-gray-400 italic text-center">Signature en attente</p>
          </div>
        )}
      </div>
    );
  };

  // Zone de tampon organisme
  const renderOrganizationSeal = () => {
    // Ne pas afficher le tampon pour les feuilles d'émargement
    if (training?.type === 'attendance') {
      return null;
    }
      
      return (
      <div className="h-28 border border-gray-300 relative">
        {stableOrganizationSealUrl ? (
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <SafeImage 
              src={stableOrganizationSealUrl} 
                alt="Tampon de l'organisme" 
                className="max-h-24 max-w-[95%] object-contain"
              onLoad={() => markSignatureAsLoaded('organizationSeal')}
              isOrganizationSeal={true}
              pdfMode={pdfMode}
              />
            </div>
          ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <p className="text-gray-400 italic text-center">Tampon en attente</p>
            </div>
          )}
        </div>
      );
  };

  // Zone de signature du représentant
  const renderRepresentativeSignature = () => {
    return (
      <div className="h-28 border border-gray-300 relative">
        {stableRepresentativeSigUrl ? (
          <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden">
            <SafeImage 
              src={stableRepresentativeSigUrl} 
              alt="Signature du représentant" 
              className="max-h-20 max-w-[95%] object-contain"
              onLoad={() => markSignatureAsLoaded('representativeSig')}
              isSignature={true}
              pdfMode={pdfMode}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <p className="text-gray-400 italic text-center">Signature en attente</p>
          </div>
        )}
      </div>
    );
  };

  // Zone de tampon de l'entreprise
  const renderCompanySeal = () => {
    // Ne pas afficher le tampon pour les feuilles d'émargement
    if (training?.type === 'attendance') {
      return null;
    }
    
    return (
      <div className="h-28 border border-gray-300 relative">
        {stableCompanySealUrl ? (
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <SafeImage 
              src={stableCompanySealUrl} 
              alt="Tampon de l'entreprise" 
              className="max-h-24 max-w-[95%] object-contain"
              onLoad={() => markSignatureAsLoaded('companySeal')}
              isOrganizationSeal={true}
              pdfMode={pdfMode}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <p className="text-gray-400 italic text-center">Tampon en attente</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={documentRef} className="bg-white p-8 shadow-sm border border-gray-200 mx-auto" 
      style={{ maxWidth: '800px' }}
      data-document-type="convention">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">CONVENTION DE FORMATION PROFESSIONNELLE</h1>
        <p className="text-sm text-gray-600">(Articles L.6353-1 du Code du travail)</p>
      </div>
      
      <div className="mb-6">
        <p><strong>Entre</strong></p>
        <p>L'organisme de formation : {organizationSettings.organization_name}</p>
        <p>Numéro de déclaration d'activité de l'organisme de formation : {organizationSettings.activity_declaration_number}</p>
        <p>Numéro SIRET de l'organisme de formation : {organizationSettings.siret}</p>
        <p>Adresse de l'organisme de formation : {organizationSettings.address}
          {organizationSettings.postal_code && organizationSettings.city 
            ? `, ${organizationSettings.postal_code} ${organizationSettings.city}` 
            : ''}
          {organizationSettings.country && organizationSettings.country !== 'France'
            ? `, ${organizationSettings.country}`
            : ''}
        </p>
      </div>
      
      <div className="mb-6">
        <p><strong>Et</strong></p>
        {displayCompanyInfo()}
      </div>
      
      <div className="mb-6">
        <p>Pour le(s) bénéficiaire(s) : (ci-après dénommé(s) le(s) stagiaire(s))</p>
        <table className="w-full border mt-2">
          <tbody>
            <tr>
              <th className="border p-2 text-center">Stagiaire</th>
              <th className="border p-2 text-center">Fonction</th>
            </tr>
            {allParticipants.map((participant, index) => (
              <tr key={participant.id || index}>
                <td className="border p-2 text-center">{participant.first_name} {participant.last_name}</td>
                <td className="border p-2 text-center">{participant.job_position || 'À compléter'}</td>
              </tr>
            ))}
            {allParticipants.length === 0 && (
              <tr>
                <td colSpan={2} className="border p-2 text-center text-gray-500">Aucun stagiaire n'est inscrit à cette formation</td>
            </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">I – OBJET</h2>
        <p>L'action de formation entre dans la catégorie : « Les actions de formation » prévue à l'article L.6313-1 du Code du travail.</p>
        <p className="mt-2">En exécution de la présente convention, l'organisme de formation s'engage à organiser l'action de formation professionnelle intitulée : {training.title}</p>
      </div>
      
      <div className="mt-4">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">II – NATURE ET CARACTERISTIQUES DE L'ACTION DE FORMATION</h2>
        <p>Permettre au stagiaire de :</p>
        <ul className="list-disc pl-8 mt-2">
          {objectives.map((objective, index) => (
            <li key={index} className="mb-1">{objective}</li>
          ))}
        </ul>
        
        <p className="mt-4">La durée de la formation est fixée à {training.duration && training.duration !== 'À définir' && training.duration !== 'À compléter' ? training.duration : '14 heures'}</p>
        <p className="mt-1">Horaires de Stage : de 9h00 à 12h30 et de 13h30 à 17h00</p>
        
        <p className="mt-4">Le programme détaillé de l'action de formation figure en annexe de la présente convention.</p>
      </div>
      
      <div className="mt-4">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">III – NIVEAU DE CONNAISSANCES PREALABLES NÉCESSAIRE</h2>
        <p>Aucun prérequis n'est nécessaire.</p>
      </div>
      
      <div className="mt-4">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">IV – ORGANISATION DE L'ACTION DE FORMATION</h2>
        <p>L'action de formation aura lieu (dates ou période) : {getTrainingDates()}</p>
        <p>Lieu de formation : {getTrainingLocation()}</p>
        
        <p className="mt-4 italic">Dans le cas où la formation a lieu au sein de l'entreprise bénéficiaire, l'entreprise s'engage à assurer la sécurité des participants. L'environnement de la formation doit se dérouler dans des conditions techniques et sanitaires appropriées.</p>
        
        <p className="mt-4">Les conditions générales dans lesquelles la formation est dispensée, notamment les moyens pédagogiques et techniques, sont les suivantes :</p>
        <ul className="list-disc pl-8 mt-2">
          {training.pedagogical_methods?.needs_evaluation && <li>Évaluation des besoins et du profil du participant</li>}
          {training.pedagogical_methods?.theoretical_content && <li>Apport théorique et méthodologique</li>}
          {training.pedagogical_methods?.practical_exercises && <li>Questionnaires et exercices pratiques</li>}
          {training.pedagogical_methods?.case_studies && <li>Études de cas</li>}
          {training.pedagogical_methods?.experience_sharing && <li>Retours d'expériences</li>}
          {training.pedagogical_methods?.digital_support && <li>Support de cours numérique</li>}
          {(!training.pedagogical_methods || 
           (!training.pedagogical_methods.needs_evaluation && 
           !training.pedagogical_methods.theoretical_content && 
           !training.pedagogical_methods.practical_exercises && 
           !training.pedagogical_methods.case_studies && 
           !training.pedagogical_methods.experience_sharing && 
           !training.pedagogical_methods.digital_support)) && 
            <li>À compléter</li>
          }
        </ul>
        
        <p className="mt-4">Éléments matériels :</p>
        <ul className="list-disc pl-8 mt-2">
          {training.material_elements?.computer_provided && <li>Mise à disposition du matériel informatique</li>}
          {training.material_elements?.pedagogical_material && <li>Mise à disposition du matériel pédagogique</li>}
          {training.material_elements?.digital_support_provided && <li>Support de cours au format numérique</li>}
          {(!training.material_elements ||
           (!training.material_elements.computer_provided && 
           !training.material_elements.pedagogical_material && 
           !training.material_elements.digital_support_provided)) && 
            <li>À compléter</li>
          }
        </ul>
        
        <p className="mt-2">Les conditions détaillées figurent en annexe de la présente convention.</p>
      </div>
      
      <div className="mt-4">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">V – MOYENS PERMETTANT D'APPRECIER LES RESULTATS DE L'ACTION</h2>
        <ul className="list-disc pl-8 mt-2">
          {training.evaluation_methods?.profile_evaluation && <li>Evaluation individuelle du profil, des attentes et des besoins</li>}
          {training.evaluation_methods?.skills_evaluation && <li>Evaluation des compétences en début et fin de formation</li>}
          {training.evaluation_methods?.knowledge_evaluation && <li>Évaluation des connaissances à chaque étape</li>}
          {training.evaluation_methods?.satisfaction_survey && <li>Questionnaire d'évaluation de la satisfaction</li>}
          {(!training.evaluation_methods ||
           (!training.evaluation_methods.profile_evaluation && 
           !training.evaluation_methods.skills_evaluation && 
           !training.evaluation_methods.knowledge_evaluation && 
           !training.evaluation_methods.satisfaction_survey)) && 
           <li>À compléter</li>
          }
        </ul>
      </div>
      
      <div className="mt-4">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">VI – SANCTION DE LA FORMATION</h2>
        <p>En application de l'article L.6353-1 du Code du travail, une attestation mentionnant les objectifs, la nature et la durée de l'action et les résultats de l'évaluation des acquis de la formation sera remise au stagiaire à l'issue de la formation.</p>
      </div>
      
      <div className="mt-4">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">VII – MOYENS PERMETTANT DE SUIVRE L'EXECUTION DE L'ACTION</h2>
        <ul className="list-disc pl-8 mt-2">
          {trackingMethods?.attendance_sheet && <li>Feuille d'émargement</li>}
          {trackingMethods?.completion_certificate && <li>Attestation de fin de formation</li>}
          {(!trackingMethods ||
            (!trackingMethods.attendance_sheet && !trackingMethods.completion_certificate)) &&
            <li>Méthodes de suivi à définir</li>}
        </ul>
      </div>
      
      <div className="mt-4">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">VIII – NON-RÉALISATION DE LA PRESTATION DE FORMATION</h2>
        <p>En application de l'article L. 6354-1 du Code du travail, il est convenu entre les signataires de la présente convention, que faute de réalisation totale ou partielle de la prestation de formation, l'organisme prestataire doit rembourser au cocontractant les sommes indûment perçues de ce fait.</p>
      </div>
      
      <div className="mt-4">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">IX – DISPOSITIONS FINANCIERES</h2>
        <p>Le prix de l'action de formation est fixé à : {formatPrice(training.price)} {training.price && training.price > 0 ? 'HT + TVA (20%) : ' + (training.price * 0.2).toFixed(2) + '€ = ' + (training.price * 1.2).toFixed(2) + '€ TTC' : ''}</p>
      </div>
      
      <div className="mt-4">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">X – INTERRUPTION DU STAGE</h2>
        <p>En cas de cessation anticipée de la formation du fait de l'organisme de formation ou en cas de renoncement par le bénéficiaire pour un autre motif que la force majeure dûment reconnue, le présent contrat est résilié. Dans ce cas, seules les prestations effectivement dispensées sont dues au prorata temporis de leur valeur prévue au présent contrat.</p>
        <p className="mt-2">Si le stagiaire est empêché de suivre la formation par suite de force majeure dûment reconnue, la convention de formation professionnelle est résiliée. Dans ce cas, seules les prestations effectivement dispensées sont dues au prorata temporis de leur valeur prévue au présent contrat.</p>
      </div>
      
      <div className="mt-4">
        <h2 className="font-bold text-red-600 border-b border-red-600 pb-1 mb-4">XI – CAS DE DIFFEREND</h2>
        <p className="mb-6">Si une contestation ou un différend n'ont pu être réglés à l'amiable, seul le tribunal de commerce dans le ressort de la juridiction du siège social du centre de formation sera compétent pour régler le litige.</p>
      </div>
      
      <div className="mt-8 flex justify-between">
        <div className="w-1/2 pr-4">
          <p><strong>Pour l'entreprise</strong></p>
          <p>Le dirigeant</p>
          <p>(Signature et cachet)</p>
          
          <div className="mt-2 flex flex-col space-y-2">
            {/* Zone de signature du représentant - CORRIGÉ */}
            {renderRepresentativeSignature()} 
            
            {/* Zone de tampon entreprise */}
            {renderCompanySeal()}
          </div>
        </div>
        <div className="w-1/2">
          <p><strong>Pour l'organisme de formation</strong></p>
          <p>(Signature et cachet)</p>
          
          <div className="mt-2 flex flex-col space-y-2">
            {/* Signature du formateur */}
            {renderTrainerSignature()}
            
            {/* Zone de tampon organisme */}
            {renderOrganizationSeal()}
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <p>Fait en double exemplaire, à {organizationSettings.city || '_______________'}{getFormattedCompanyAddress() ? ` et à ${getFormattedCompanyAddress()}` : ''}, le {new Date().toLocaleDateString('fr-FR')}</p>
      </div>
    </div>
  );
});

export default UnifiedTrainingAgreementTemplate; 