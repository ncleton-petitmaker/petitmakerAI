import React, { useState, useEffect, useRef } from 'react';
import { X, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '../../lib/supabase';
import { generateWordLikePDF } from './pdfGenerator';
import { UnifiedTrainingAgreementTemplate } from '../shared/templates/unified/TrainingAgreementTemplate';

interface Company {
  id: string;
  name: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  siret?: string;
}

interface Training {
  id: string;
  title: string;
  company_id: string | null;
  start_date: string | null;
  end_date: string | null;
  duration: string | null;
  location: string | null;
  price: number | null;
  status: string;
  content?: string;
  trainer_name?: string;
  objectives?: string[];
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
}

interface Learner {
  id: string;
  first_name: string;
  last_name: string;
  job_position?: string;
  auth_email?: string;
}

interface TrainingAgreementFormProps {
  training: Training;
  company: Company | null;
  learners: Learner[];
  onSubmit: (agreementData: any) => void;
  onCancel: () => void;
}

interface FormData {
  organization: {
    name: string;
    siret: string;
    address: string;
    postal_code: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    registration_number: string;
    insurance_policy: string;
    certification_qualiopi: string;
  };
  client: {
    name: string;
    address: string;
    postal_code: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    contact_name: string;
    contact_position: string;
    contact_phone: string;
    contact_email: string;
  };
  training: {
    title: string;
    objectives: string;
    program: string;
    methods: string;
    evaluation_methods: string;
    start_date: string;
    end_date: string;
    duration: string;
    location: string;
    modality: 'presentiel' | 'distanciel' | 'mixte';
    participants_min: number;
    participants_max: number;
    prerequisites: string;
    target_audience: string;
    accessibility: string;
    schedule: string;
    trainer_name?: string;
  };
  financial: {
    price_ht: number;
    vat_rate: number;
    price_ttc: number;
    payment_terms: string;
    payment_schedule: string;
    cancellation_terms: string;
    funding_type: 'direct' | 'opco' | 'other';
    funding_organization: string;
    funding_file_number: string;
  };
  administrative: {
    agreement_number: string;
    agreement_date: string;
    internal_reference: string;
    special_conditions: string;
    confidentiality: boolean;
    intellectual_property: boolean;
  };
  participants: {
    id: string;
    first_name: string;
    last_name: string;
    job_position: string;
    email: string;
    selected: boolean;
  }[];
  annexes: {
    include_program: boolean;
    include_cvs: boolean;
    include_company_policy: boolean;
    include_special_conditions: boolean;
    additional_documents: string[];
  };
}

interface Settings {
  company_name: string;
  siret: string;
  training_number: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  representative_name?: string;
}

export const TrainingAgreementForm: React.FC<TrainingAgreementFormProps> = ({
  training,
  company,
  learners,
  onSubmit,
  onCancel
}) => {
  console.log('TrainingAgreementForm - Données de formation reçues:', training);
  console.log('TrainingAgreementForm - Méthodes d\'évaluation:', training.evaluation_methods);
  console.log('TrainingAgreementForm - Moyens pédagogiques:', training.pedagogical_methods);
  console.log('TrainingAgreementForm - Éléments matériels:', training.material_elements);
  
  const [settings, setSettings] = useState<Settings>({
    company_name: 'PETITMAKER',
    siret: '928 386 044 00012',
    training_number: '32 59 13116 59',
    address: '2 rue Héraclès',
    city: 'Villeneuve-d\'Ascq',
    postal_code: '59650',
    country: 'France',
    email: 'nicolas.cleton@petitmaker.fr',
    phone: '07 60 17 72 67',
    website: 'https://petitmaker.fr',
  });
  
  const [formData, setFormData] = useState<FormData>({
    // Training Organization Details
    organization: {
      name: 'PETITMAKER',
      siret: '123456789',
      address: '123 Rue de la Formation',
      postal_code: '75000',
      city: 'Paris',
      country: 'France',
      phone: '+33 1 23 45 67 89',
      email: 'contact@petitmaker.fr',
      website: 'www.petitmaker.fr',
      registration_number: 'Formation continue n°12345678901',
      insurance_policy: 'Police d\'assurance n°ABC123456',
      certification_qualiopi: 'Certification Qualiopi n°XYZ789'
    },
    
    // Client Company Details
    client: {
      name: company?.name || '',
      address: company?.address || '',
      postal_code: company?.postal_code || '',
      city: company?.city || '',
      country: company?.country || '',
      phone: company?.phone || '',
      email: company?.email || '',
      contact_name: '',
      contact_position: '',
      contact_phone: '',
      contact_email: ''
    },
    
    // Training Information
    training: {
      title: training.title,
      objectives: '',
      program: '',
      methods: '',
      evaluation_methods: '',
      start_date: training.start_date || '',
      end_date: training.end_date || '',
      duration: training.duration || '',
      location: training.location || '',
      modality: 'presentiel', // presentiel, distanciel, mixte
      participants_min: 1,
      participants_max: 10,
      prerequisites: '',
      target_audience: '',
      accessibility: 'Pour toute situation de handicap, merci de nous contacter pour envisager les possibilités d\'adaptation.',
      schedule: 'De 9h00 à 12h30 et de 13h30 à 17h00', // Valeur par défaut pour l'horaire
      trainer_name: training.trainer_name,
    },
    
    // Financial Information
    financial: {
      price_ht: training.price || 0,
      vat_rate: 20,
      price_ttc: training.price ? training.price * 1.2 : 0,
      payment_terms: 'Paiement à 30 jours à compter de la date de facturation',
      payment_schedule: 'En une fois, à la fin de la formation',
      cancellation_terms: 'En cas d\'annulation moins de 14 jours avant le début de la formation, 50% du montant total sera dû.',
      funding_type: 'direct', // direct, opco, other
      funding_organization: '',
      funding_file_number: ''
    },
    
    // Administrative Information
    administrative: {
      agreement_number: '',
      agreement_date: new Date().toISOString().split('T')[0],
      internal_reference: '',
      special_conditions: '',
      confidentiality: true,
      intellectual_property: true
    },
    
    // Selected Participants - Automatically select all learners associated with the company
    participants: learners.map(learner => ({
      id: learner.id,
      first_name: learner.first_name,
      last_name: learner.last_name,
      job_position: learner.job_position || '',
      email: learner.auth_email || '',
      selected: true // Automatically select all learners
    })),
    
    // Optional Annexes
    annexes: {
      include_program: true,
      include_cvs: false,
      include_company_policy: false,
      include_special_conditions: false,
      additional_documents: []
    }
  });
  
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [activeTab, setActiveTab] = useState<string>('organization');
  const pdfContentRef = useRef<HTMLDivElement>(null);
  
  const handleChange = (section: keyof FormData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    
    // Clear validation error for this field
    if (validationErrors[`${section}.${field}`]) {
      setValidationErrors(prev => ({
        ...prev,
        [`${section}.${field}`]: ''
      }));
    }
  };
  
  const handleParticipantToggle = (participantId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map(p => 
        p.id === participantId ? { ...p, selected: !p.selected } : p
      )
    }));
  };
  
  const calculatePrices = () => {
    const priceHT = parseFloat(formData.financial.price_ht.toString());
    const vatRate = parseFloat(formData.financial.vat_rate.toString());
    const priceTTC = priceHT * (1 + vatRate / 100);
    
    handleChange('financial', 'price_ttc', priceTTC);
  };
  
  useEffect(() => {
    calculatePrices();
  }, [formData.financial.price_ht, formData.financial.vat_rate]);
  
  // Fetch settings from Supabase or use default values
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // In a real app, this would fetch from a settings table in Supabase
        // For demo purposes, we'll just use the default values from the SettingsView
        
        // Update organization data with settings
        setFormData(prev => ({
          ...prev,
          organization: {
            ...prev.organization,
            name: settings.company_name,
            siret: settings.siret,
            address: settings.address,
            postal_code: settings.postal_code,
            city: settings.city,
            country: settings.country,
            phone: settings.phone,
            email: settings.email,
            website: settings.website,
            registration_number: `Numéro de déclaration d'activité: ${settings.training_number}`,
          }
        }));
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    
    fetchSettings();
  }, []);
  
  // Fetch training objectives and other data from Supabase
  useEffect(() => {
    const fetchTrainingDetails = async () => {
      try {
        // In a real app, this would fetch the training details from Supabase
        // For now, we'll check if training has objectives and use them
        
        // Check if training has objectives (it might be passed as an array from TrainingsView)
        if (training.objectives && Array.isArray(training.objectives) && training.objectives.length > 0) {
          // Convert array of objectives to string with bullet points
          const objectivesText = training.objectives
            .filter(obj => obj && obj.trim() !== '')
            .map(obj => `• ${obj}`)
            .join('\n');
          
          if (objectivesText) {
            setFormData(prev => ({
              ...prev,
              training: {
                ...prev.training,
                objectives: objectivesText
              }
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching training details:', error);
      }
    };
    
    fetchTrainingDetails();
  }, [training]);
  
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    // Required fields validation
    if (!formData.client.name) errors['client.name'] = 'Le nom de l\'entreprise est requis';
    if (!formData.training.objectives) errors['training.objectives'] = 'Les objectifs sont requis';
    if (!formData.training.program) errors['training.program'] = 'Le programme est requis';
    if (!formData.training.methods) errors['training.methods'] = 'Les méthodes pédagogiques sont requises';
    if (!formData.training.evaluation_methods) errors['training.evaluation_methods'] = 'Les méthodes d\'évaluation sont requises';
    if (!formData.financial.price_ht) errors['financial.price_ht'] = 'Le prix HT est requis';
    if (!formData.administrative.agreement_number) errors['administrative.agreement_number'] = 'Le numéro de convention est requis';
    
    // Validate at least one participant is selected
    if (!formData.participants.some(p => p.selected)) {
      errors['participants'] = 'Au moins un participant doit être sélectionné';
    }
    
    return errors;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    onSubmit(formData);
  };
  
  const generatePDF = async () => {
    if (!pdfContentRef.current) return;
    
    try {
      // Générer un nom de fichier basé sur le titre de la formation
      const fileName = `Convention_${formData.training.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Utiliser notre nouvelle fonction pour générer un PDF de type Word
      await generateWordLikePDF(pdfContentRef.current, fileName);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-[100] overflow-hidden">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col m-4">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Convention de formation - {training.title}
          </h3>
          <div className="flex items-center space-x-4">
            <button
              onClick={generatePDF}
              className="text-blue-600 hover:text-blue-800 flex items-center"
              title="Générer un PDF"
            >
              <Download className="h-5 w-5 mr-1" />
              <span>Générer PDF</span>
            </button>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <style>
            {`
              /* Styles pour le PDF */
              .pdf-container {
                font-family: 'Times New Roman', Times, serif;
                font-size: 12pt;
                line-height: 1.4;
                color: black;
                max-width: 100%;
                padding: 0;
                word-wrap: break-word;
                overflow-wrap: break-word;
                hyphens: auto;
              }
              
              /* Titres */
              h2 {
                font-size: 16pt;
                font-weight: bold;
                margin-top: 10pt;
                margin-bottom: 8pt;
                text-align: center;
              }
              
              h3 {
                font-size: 14pt;
                font-weight: bold;
                margin-top: 10pt;
                margin-bottom: 8pt;
                padding: 4pt;
                background-color: #f3f4f6;
                page-break-after: avoid;
              }
              
              h4 {
                font-size: 13pt;
                font-weight: bold;
                margin-top: 8pt;
                margin-bottom: 6pt;
                page-break-after: avoid;
              }
              
              /* Paragraphes */
              p {
                margin-top: 0;
                margin-bottom: 5pt;
                font-size: 12pt;
                text-align: justify;
                page-break-inside: avoid;
              }
              
              /* Listes */
              ul, ol {
                margin-top: 3pt;
                margin-bottom: 5pt;
                padding-left: 20pt;
              }
              
              li {
                margin-bottom: 3pt;
                font-size: 12pt;
                text-align: justify;
                position: relative;
              }
              
              /* Correction pour l'alignement des puces */
              ul li {
                list-style-position: outside;
                margin-left: 5pt;
                padding-left: 5pt;
              }
              
              ol li {
                list-style-position: outside;
                margin-left: 5pt;
                padding-left: 5pt;
              }
              
              /* Tableaux */
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 6pt;
                margin-bottom: 8pt;
                page-break-inside: avoid;
              }
              
              td, th {
                border: 1pt solid black;
                padding: 5pt 6pt;
                font-size: 12pt;
                text-align: center;
                vertical-align: middle;
              }
              
              /* Classes de marge standardisées */
              .mb-4 {
                margin-bottom: 8pt !important;
              }
              
              .mb-3 {
                margin-bottom: 6pt !important;
              }
              
              .mb-2 {
                margin-bottom: 4pt !important;
              }
              
              .mb-1 {
                margin-bottom: 2pt !important;
              }
              
              .mb-0 {
                margin-bottom: 0 !important;
              }
              
              /* Sauts de page */
              .page-break-before {
                page-break-before: always !important;
                display: block !important;
                margin-top: 20pt !important;
                border-top: 1pt solid transparent !important;
              }
              
              .avoid-break {
                page-break-inside: avoid !important;
              }
              
              /* Autres styles */
              .font-semibold {
                font-weight: bold;
              }
              
              .text-center {
                text-align: center;
              }
              
              .bg-gray-200 {
                background-color: #f3f4f6;
              }
              
              .border {
                border: 1pt solid black;
              }
              
              .section-break {
                margin-bottom: 8pt;
              }
              
              /* Éviter les coupures de mots inappropriées */
              span {
                white-space: nowrap;
              }
              
              /* Ajustements pour les signatures */
              .grid {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                margin-top: 15pt;
              }
              
              .grid > div {
                width: 45%;
                margin-bottom: 15pt;
              }
              
              /* Espacement supplémentaire pour aérer le contenu */
              .section-content {
                margin-top: 5pt;
                margin-bottom: 10pt;
              }
              
              /* Styles pour les annexes */
              .annexe-title {
                font-size: 14pt;
                font-weight: bold;
                text-align: center;
                margin-top: 10pt;
                margin-bottom: 10pt;
              }
              
              .annexe-content {
                margin-top: 8pt;
                margin-bottom: 8pt;
              }
              
              /* Styles spécifiques pour l'impression */
              @media print {
                .page-break-before {
                  page-break-before: always !important;
                }
                
                .avoid-break {
                  page-break-inside: avoid !important;
                }
                
                table {
                  page-break-inside: avoid !important;
                }
                
                p {
                  orphans: 3;
                  widows: 3;
                }
                
                .annexe {
                  page-break-before: always !important;
                }
              }
            `}
          </style>
          <div ref={pdfContentRef} className="bg-white max-w-[210mm] mx-auto pdf-container">
            <UnifiedTrainingAgreementTemplate
              training={{
                id: training.id,
                title: formData.training.title,
                duration: formData.training.duration,
                trainer_name: formData.training.trainer_name || '',
                location: formData.training.location,
                start_date: formData.training.start_date,
                end_date: formData.training.end_date,
                objectives: formData.training.objectives ? formData.training.objectives.split('\n').filter(Boolean) : [],
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
                  needs_evaluation: training.pedagogical_methods?.needs_evaluation || false,
                  theoretical_content: training.pedagogical_methods?.theoretical_content || false,
                  practical_exercises: training.pedagogical_methods?.practical_exercises || false,
                  case_studies: training.pedagogical_methods?.case_studies || false,
                  experience_sharing: training.pedagogical_methods?.experience_sharing || false,
                  digital_support: training.pedagogical_methods?.digital_support || false
                },
                material_elements: {
                  computer_provided: training.material_elements?.computer_provided || false,
                  pedagogical_material: training.material_elements?.pedagogical_material || false,
                  digital_support_provided: training.material_elements?.digital_support_provided || false
                }
              }}
              participant={{
                id: formData.participants.filter(p => p.selected).length > 0 
                  ? formData.participants.find(p => p.selected)?.id || ''
                  : '',
                first_name: formData.participants.filter(p => p.selected).length > 0
                  ? formData.participants.find(p => p.selected)?.first_name || ''
                  : 'Participant',
                last_name: formData.participants.filter(p => p.selected).length > 0
                  ? formData.participants.find(p => p.selected)?.last_name || ''
                  : 'à définir',
                job_position: formData.participants.filter(p => p.selected).length > 0
                  ? formData.participants.find(p => p.selected)?.job_position || ''
                  : '',
                company: company?.name || ''
              }}
              company={formData.client.name ? {
                name: formData.client.name,
                address: formData.client.address,
                postal_code: formData.client.postal_code,
                city: formData.client.city,
                country: formData.client.country,
                siret: '',
                contact_name: formData.client.contact_name
              } : undefined}
              organizationSettings={{
                organization_name: formData.organization.name,
                siret: formData.organization.siret,
                address: formData.organization.address,
                postal_code: formData.organization.postal_code,
                city: formData.organization.city,
                country: formData.organization.country,
                activity_declaration_number: formData.organization.registration_number,
                representative_name: 'Représentant légal'
              }}
              viewContext="crm"
            />
          </div>
        </div>
        
        {/* Boutons d'action */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}; 