import React, { useState, useEffect, useRef } from 'react';
import { X, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '../../lib/supabase';
import { generateWordLikePDF } from './pdfGenerator';

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
  objectives?: string[];
  content?: string;
  evaluation_methods?: {
    profile_evaluation?: boolean;
    skills_evaluation?: boolean;
    knowledge_evaluation?: boolean;
    satisfaction_survey?: boolean;
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
  
  const [settings, setSettings] = useState({
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
            {/* Contenu du formulaire pour le PDF */}
            <div className="mb-0 avoid-break section-content">
              <h2 className="font-bold text-center mb-0">CONVENTION DE FORMATION PROFESSIONNELLE</h2>
              <p className="text-center mb-0">(Article L.6353-1 du Code du travail)</p>
            </div>
            
            {/* Entre */}
            <div className="mb-0 section-content">
              <p className="font-semibold mb-0">Entre</p>
            </div>
            
            {/* Informations sur l'organisme de formation */}
            <div className="mb-0 section-content">
              <p className="mb-0">L'organisme de formation : <span className="font-semibold">{settings.company_name}</span></p>
              <p className="mb-0">Numéro de déclaration d'activité de formation : <span className="font-semibold">{settings.training_number}</span></p>
              <p className="mb-0">Numéro SIRET de l'organisme de formation : <span className="font-semibold">{settings.siret}</span></p>
              <p className="mb-0">Adresse de l'organisme de formation : <span className="font-semibold">{settings.address}, {settings.postal_code} {settings.city}, {settings.country}</span></p>
            </div>
            
            {/* Et */}
            <div className="mb-0 section-content">
              <p className="font-semibold mb-0">Et</p>
            </div>
            
            {/* Informations sur le client */}
            <div className="mb-0 section-content">
              <p className="mb-0">L'entreprise : <span className={company?.name ? "font-semibold" : "bg-yellow-200 px-1"}>{company?.name || "XXXXXXXXXX"}</span></p>
              <p className="mb-0">Adresse de l'entreprise : <span className={company?.address ? "font-semibold" : "bg-yellow-200 px-1"}>{company?.address || "XXXXXXXXXX"}</span></p>
              <p className="mb-0">SIRET de l'entreprise : <span className={company?.siret ? "font-semibold" : "bg-yellow-200 px-1"}>{company?.siret || "xxxxxxxxxxxx"}</span></p>
            </div>
            
            {/* Participants */}
            <div className="mb-0 avoid-break section-content">
              <p className="font-semibold mb-0">Pour le(s) bénéficiaire(s) : (Ci-après dénommé(s) le(s) stagiaire(s))</p>
              <table className="w-full border-collapse border border-gray-300" style={{ maxWidth: "100%", margin: "6pt auto" }}>
                <thead>
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-center" style={{ width: '60%' }}>Stagiaires</th>
                    <th className="border border-gray-300 px-4 py-2 text-center" style={{ width: '40%' }}>Fonction</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.participants.filter(p => p.selected).length > 0 ? (
                    formData.participants.filter(p => p.selected).map((participant) => (
                      <tr key={participant.id}>
                        <td className="border border-gray-300 px-4 py-2 text-center">{`${participant.first_name} ${participant.last_name}`}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">{participant.job_position || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 text-center bg-yellow-200">XXXXXX</td>
                      <td className="border border-gray-300 px-4 py-2 text-center bg-yellow-200">XXXXX</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Objet */}
            <div className="mb-0 avoid-break section-content">
              <h3 className="font-bold mb-0 bg-gray-200 p-1">I - OBJET</h3>
              <p className="mb-0">L'action de formation entre dans la catégorie : « Les actions de formation » prévue à l'article L.6313-1 du Code du travail.</p>
              <p className="mb-0">En exécution de la présente convention, l'organisme de formation s'engage à organiser l'action de formation professionnelle intitulée : <span className="font-semibold">{training.title}</span></p>
            </div>
            
            {/* Nature et caractéristiques */}
            <div className="mb-0 avoid-break section-content">
              <div className="page-break-before"></div>
              <h3 className="font-bold mb-0 bg-gray-200 p-1">II - NATURE ET CARACTÉRISTIQUES DE L'ACTION DE FORMATION</h3>
              <p className="mb-0">À l'issue de cette formation, le participant sera capable de :</p>
              {formData.training.objectives ? (
                <ul className="list-disc pl-6 mb-0">
                  {formData.training.objectives.split('\n').map((objective, index) => (
                    <li key={index} className="mb-0">{objective.replace('• ', '')}</li>
                  ))}
                </ul>
              ) : (
                <ul className="list-disc pl-6 mb-0">
                  <li className="mb-0 bg-yellow-200">xxxx</li>
                  <li className="mb-0 bg-yellow-200">xxxxxx</li>
                  <li className="mb-0 bg-yellow-200">xxxxxxxxx</li>
                </ul>
              )}
              <p className="mb-0">La durée de la formation est fixée à <span className={training.duration ? "font-semibold" : "bg-yellow-200 px-1"}>{training.duration || "2 heures"}</span></p>
              <p className="mb-0">Horaires de Stage : <span className={formData.training.schedule ? "font-semibold" : "bg-yellow-200 px-1"}>{formData.training.schedule || "9h00-11h00"}</span></p>
              <p className="mb-0">Le programme détaillé de l'action de formation figure en annexe de la présente convention.</p>
            </div>
            
            {/* Niveau de connaissances préalables */}
            <div className="mb-0 avoid-break section-content">
              <h3 className="font-bold mb-0 bg-gray-200 p-1">III - NIVEAU DE CONNAISSANCES PRÉALABLES NÉCESSAIRE</h3>
              <p className="mb-0">{formData.training.prerequisites || "Aucun."}</p>
            </div>
            
            {/* Organisation */}
            <div className="mb-0 avoid-break section-content">
              <h3 className="font-bold mb-0 bg-gray-200 p-1">IV - ORGANISATION DE L'ACTION DE FORMATION</h3>
              <p className="mb-0">Modalités : {formData.training.modality === 'presentiel' ? 'Formation en présentiel' : 
                                formData.training.modality === 'distanciel' ? 'Formation à distance sous la forme de webinar participatif' : 
                                'Formation mixte (présentiel et distanciel)'}</p>
              <p className="mb-0">L'action de formation aura lieu (date ou période) : {training.start_date && training.end_date ? 
                                `du ${new Date(training.start_date).toLocaleDateString('fr-FR')} au ${new Date(training.end_date).toLocaleDateString('fr-FR')}` : 
                                <span className="bg-yellow-200 px-1">le xx/xx/2020</span>}</p>
              <p className="mb-0">Lieu de formation : <span className={training.location ? "font-semibold" : "bg-yellow-200 px-1"}>{training.location || "À distance"}</span></p>
              <p className="mb-0">Les conditions générales dans lesquelles la formation est dispensée, notamment les moyens pédagogiques et techniques, sont les suivantes :</p>
              <ul className="list-disc pl-6 mb-0">
                {training.pedagogical_methods?.needs_evaluation === true && (
                  <li className="mb-0">Évaluation des besoins et du profil du participant</li>
                )}
                {training.pedagogical_methods?.theoretical_content === true && (
                  <li className="mb-0">Apport théorique et méthodologique</li>
                )}
                {training.pedagogical_methods?.case_studies === true && (
                  <li className="mb-0">Études de cas</li>
                )}
                {training.pedagogical_methods?.practical_exercises === true && (
                  <li className="mb-0">Questionnaires et exercices pratiques</li>
                )}
                {training.pedagogical_methods?.experience_sharing === true && (
                  <li className="mb-0">Retours d'expériences</li>
                )}
                {training.pedagogical_methods?.digital_support === true && (
                  <li className="mb-0">Support de cours numérique</li>
                )}
              </ul>
              <p className="mb-0">Les conditions détaillées figurent en annexe de la présente convention.</p>
            </div>
            
            {/* Moyens permettant d'apprécier les résultats */}
            <div className="mb-0 avoid-break section-content">
              <div className="page-break-before"></div>
              <h3 className="font-bold mb-0 bg-gray-200 p-1">V - MOYENS PERMETTANT D'APPRÉCIER LES RÉSULTATS DE L'ACTION</h3>
              <ul className="list-disc pl-6 mb-0">
                {training.evaluation_methods?.satisfaction_survey === true && (
                  <li className="mb-0">Questionnaire d'évaluation de la satisfaction</li>
                )}
                {training.evaluation_methods?.knowledge_evaluation === true && (
                  <li className="mb-0">Évaluation des connaissances à chaque étape</li>
                )}
                {training.evaluation_methods?.profile_evaluation === true && (
                  <li className="mb-0">Évaluation individuelle du profil, des attentes et des besoins</li>
                )}
                {training.evaluation_methods?.skills_evaluation === true && (
                  <li className="mb-0">Évaluation des compétences en début et fin de formation</li>
                )}
              </ul>
            </div>
            
            {/* Sanction de la formation */}
            <div className="mb-0 avoid-break section-content">
              <h3 className="font-bold mb-0 bg-gray-200 p-1">VI - SANCTION DE LA FORMATION</h3>
              <p className="mb-0">En application de l'article L.6353-1 du Code du travail, une attestation mentionnant les objectifs, la nature et la durée de l'action et les résultats de l'évaluation des acquis de la formation sera remise au stagiaire à l'issue de la formation.</p>
            </div>
            
            {/* Moyens permettant de suivre l'exécution */}
            <div className="mb-0 avoid-break section-content">
              <h3 className="font-bold mb-0 bg-gray-200 p-1">VII - MOYENS PERMETTANT DE SUIVRE L'EXÉCUTION DE L'ACTION</h3>
              <ul className="list-disc pl-6 mb-0">
                <li className="mb-0">Feuille de présences signées des participants et du formateur par demi-journée</li>
                <li className="mb-0">Attestation de fin de formation mentionnant les objectifs, la nature et la durée de l'action et les résultats de l'évaluation des acquis de la formation</li>
              </ul>
            </div>
            
            {/* Non-réalisation de la prestation */}
            <div className="mb-0 avoid-break section-content">
              <h3 className="font-bold mb-0 bg-gray-200 p-1">VIII - NON-RÉALISATION DE LA PRESTATION DE FORMATION</h3>
              <p className="mb-0">En application de l'article L. 6354-1 du Code du travail, il est convenu entre les signataires de la présente convention, que faute de réalisation totale ou partielle de la prestation de formation, l'organisme prestataire doit rembourser au cocontractant les sommes indûment perçues de ce fait.</p>
            </div>
            
            {/* Dispositions financières */}
            <div className="mb-0 avoid-break section-content">
              <div className="page-break-before"></div>
              <h3 className="font-bold mb-0 bg-gray-200 p-1">IX - DISPOSITIONS FINANCIÈRES</h3>
              {training.price ? (
                <p className="mb-0">Le prix de l'action de formation est fixé à : <span className="font-semibold">{training.price.toFixed(2)}€ HT + TVA (20%) : {(training.price * 0.2).toFixed(2)} € = {(training.price * 1.2).toFixed(2)} € TTC</span></p>
              ) : (
                <p className="mb-0">Le prix de l'action de formation est fixé à : <span className="bg-yellow-200 px-1">3 500,00€ HT + TVA (20%) : 700,00 € = 4 200,00 € TTC</span></p>
              )}
            </div>
            
            {/* Interruption du stage */}
            <div className="mb-0 avoid-break section-content">
              <h3 className="font-bold mb-0 bg-gray-200 p-1">X - INTERRUPTION DU STAGE</h3>
              <p className="mb-0">En cas de cessation anticipée de la formation du fait de l'organisme de formation ou en cas de renoncement par le bénéficiaire pour un autre motif que la force majeure dûment reconnue, le présent contrat est résilié.</p>
              <p className="mb-0">Dans ce cas, seules les prestations effectivement dispensées sont dues au prorata temporis de leur valeur prévue au présent contrat.</p>
              <p className="mb-0">Si le stagiaire est empêché de suivre la formation par suite de force majeure dûment reconnue, la convention de formation professionnelle est résiliée. Dans ce cas, seules les prestations effectivement dispensées sont dues au prorata temporis de leur valeur prévue au présent contrat.</p>
            </div>
            
            {/* Cas de différend */}
            <div className="mb-0 avoid-break section-content">
              <h3 className="font-bold mb-0 bg-gray-200 p-1">XI - CAS DE DIFFÉREND</h3>
              <p className="mb-0">Si une contestation ou un différend n'ont pu être réglés à l'amiable, seul le tribunal de commerce dans le ressort de la juridiction du siège social du centre de formation sera compétent pour régler le litige.</p>
            </div>
            
            {/* Éléments matériels */}
            <div className="mb-0 avoid-break section-content">
              <h3 className="font-bold mb-0 bg-gray-200 p-1">XII - ÉLÉMENTS MATÉRIELS</h3>
              <p className="mb-0">Les éléments matériels de la formation sont :</p>
              <ul className="list-disc pl-6 mb-0">
                {training.material_elements?.computer_provided === true && (
                  <li className="mb-0">Mise à disposition du matériel informatique</li>
                )}
                {training.material_elements?.pedagogical_material === true && (
                  <li className="mb-0">Mise à disposition du matériel pédagogique</li>
                )}
                {training.material_elements?.digital_support_provided === true && (
                  <li className="mb-0">Support de cours au format numérique</li>
                )}
              </ul>
            </div>

            {/* Signature et signatures */}
            <div className="mb-0 avoid-break section-content">
              <div className="page-break-before"></div>
              <div className="mb-0">
                <p className="mb-0">Fait en double exemplaire, à <span className="font-semibold">{settings.city}</span>, le <span className="font-semibold">{new Date().toLocaleDateString('fr-FR')}</span></p>
              </div>
              
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 mb-0">
                <div>
                  <p className="font-semibold mb-0">Pour l'organisme de formation :</p>
                  <p className="mb-0">Nom et qualité du signataire :</p>
                  <p className="mb-0">Signature et cachet :</p>
                  <div className="h-16 border border-gray-300 mt-1"></div>
                </div>
                <div>
                  <p className="font-semibold mb-0">Pour l'entreprise :</p>
                  <p className="mb-0">Nom et qualité du signataire :</p>
                  <p className="mb-0">Signature et cachet :</p>
                  <div className="h-16 border border-gray-300 mt-1"></div>
                </div>
              </div>
            </div>

            {/* Annexe - Programme de formation */}
            <div className="annexe avoid-break">
              <div className="page-break-before"></div>
              <h3 className="annexe-title font-bold mb-0 text-center">ANNEXE - PROGRAMME DE FORMATION</h3>
              
              {/* Titre de la formation */}
              <div className="annexe-content mb-0">
                <h4 className="font-semibold mb-0">{training.title}</h4>
              </div>
              
              {/* Programme de formation */}
              <div className="annexe-content mb-0">
                <h4 className="font-semibold mb-0">Contenu de la formation :</h4>
                <div className="whitespace-pre-wrap">
                  {training.content || "Le programme détaillé sera fourni ultérieurement."}
                </div>
              </div>
            </div>
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