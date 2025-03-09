import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';

interface DocumentGeneratorProps {
  onGenerate: (data: any) => void;
  onCancel: () => void;
  companies: { id: string; name: string }[];
}

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({ 
  onGenerate, 
  onCancel, 
  companies 
}) => {
  const [formData, setFormData] = useState({
    type: 'convention',
    company_id: '',
    company: '',
    title: '',
    date_debut: '',
    date_fin: '',
    duree: '',
    lieu: '',
    prix: '',
    participants: [] as { nom: string; prenom: string; fonction: string }[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const [previewReady, setPreviewReady] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Special handling for company selection
    if (name === 'company_id' && value) {
      const selectedCompany = companies.find(c => c.id === value);
      if (selectedCompany) {
        setFormData(prev => ({ 
          ...prev, 
          [name]: value,
          company: selectedCompany.name,
          title: `Convention de formation - ${selectedCompany.name}`
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const addParticipant = () => {
    setFormData(prev => ({
      ...prev,
      participants: [
        ...prev.participants,
        { nom: '', prenom: '', fonction: '' }
      ]
    }));
  };

  const removeParticipant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index)
    }));
  };

  const handleParticipantChange = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const newParticipants = [...prev.participants];
      newParticipants[index] = {
        ...newParticipants[index],
        [field]: value
      };
      return {
        ...prev,
        participants: newParticipants
      };
    });
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.type) {
      newErrors.type = 'Le type de document est requis';
    }
    
    if (!formData.company_id) {
      newErrors.company_id = 'L\'entreprise est requise';
    }
    
    if (!formData.title.trim()) {
      newErrors.title = 'Le titre du document est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.date_debut) {
      newErrors.date_debut = 'La date de début est requise';
    }
    
    if (!formData.date_fin) {
      newErrors.date_fin = 'La date de fin est requise';
    }
    
    if (!formData.duree.trim()) {
      newErrors.duree = 'La durée est requise';
    }
    
    if (!formData.lieu.trim()) {
      newErrors.lieu = 'Le lieu est requis';
    }
    
    if (!formData.prix.trim()) {
      newErrors.prix = 'Le prix est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    
    if (formData.participants.length === 0) {
      newErrors.participants = 'Au moins un participant est requis';
    } else {
      formData.participants.forEach((participant, index) => {
        if (!participant.nom.trim()) {
          newErrors[`participant_${index}_nom`] = 'Le nom est requis';
        }
        if (!participant.prenom.trim()) {
          newErrors[`participant_${index}_prenom`] = 'Le prénom est requis';
        }
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      generatePreview();
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const generatePreview = () => {
    // In a real app, this would generate a preview of the document
    // For demo purposes, we'll just set a flag
    setPreviewReady(true);
    setStep(4);
  };

  const handleGenerate = async () => {
    setIsSubmitting(true);
    
    try {
      // In a real app, this would generate the document and save it to Supabase
      // For demo purposes, we'll just pass the form data to the parent component
      await onGenerate({
        ...formData,
        type: formData.type,
        company: formData.company,
        title: formData.title
      });
    } catch (error) {
      console.error('Error generating document:', error);
      setErrors(prev => ({
        ...prev,
        submit: 'Une erreur est survenue lors de la génération du document.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          Type de document *
        </label>
        <select
          name="type"
          id="type"
          value={formData.type}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
            errors.type
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
          }`}
          required
        >
          <option value="convention">Convention de formation</option>
          <option value="attestation">Attestation de présence</option>
          <option value="devis">Devis</option>
          <option value="facture">Facture</option>
          <option value="programme">Programme de formation</option>
        </select>
        {errors.type && (
          <p className="mt-1 text-sm text-red-600">{errors.type}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="company_id" className="block text-sm font-medium text-gray-700">
          Entreprise *
        </label>
        <select
          name="company_id"
          id="company_id"
          value={formData.company_id}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
            errors.company_id
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
          }`}
          required
        >
          <option value="">Sélectionner une entreprise...</option>
          {companies.map(company => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        {errors.company_id && (
          <p className="mt-1 text-sm text-red-600">{errors.company_id}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Titre du document *
        </label>
        <input
          type="text"
          name="title"
          id="title"
          value={formData.title}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
            errors.title
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
          }`}
          required
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="date_debut" className="block text-sm font-medium text-gray-700">
            Date de début *
          </label>
          <input
            type="date"
            name="date_debut"
            id="date_debut"
            value={formData.date_debut}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
              errors.date_debut
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
            }`}
            required
          />
          {errors.date_debut && (
            <p className="mt-1 text-sm text-red-600">{errors.date_debut}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="date_fin" className="block text-sm font-medium text-gray-700">
            Date de fin *
          </label>
          <input
            type="date"
            name="date_fin"
            id="date_fin"
            value={formData.date_fin}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
              errors.date_fin
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
            }`}
            required
          />
          {errors.date_fin && (
            <p className="mt-1 text-sm text-red-600">{errors.date_fin}</p>
          )}
        </div>
      </div>
      
      <div>
        <label htmlFor="duree" className="block text-sm font-medium text-gray-700">
          Durée (en heures) *
        </label>
        <input
          type="text"
          name="duree"
          id="duree"
          value={formData.duree}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
            errors.duree
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
          }`}
          required
        />
        {errors.duree && (
          <p className="mt-1 text-sm text-red-600">{errors.duree}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="lieu" className="block text-sm font-medium text-gray-700">
          Lieu *
        </label>
        <input
          type="text"
          name="lieu"
          id="lieu"
          value={formData.lieu}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
            errors.lieu
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
          }`}
          required
        />
        {errors.lieu && (
          <p className="mt-1 text-sm text-red-600">{errors.lieu}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="prix" className="block text-sm font-medium text-gray-700">
          Prix (en euros) *
        </label>
        <input
          type="text"
          name="prix"
          id="prix"
          value={formData.prix}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
            errors.prix
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
          }`}
          required
        />
        {errors.prix && (
          <p className="mt-1 text-sm text-red-600">{errors.prix}</p>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Participants</h3>
        <button
          type="button"
          onClick={addParticipant}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          Ajouter un participant
        </button>
      </div>
      
      {errors.participants && (
        <p className="text-sm text-red-600">{errors.participants}</p>
      )}
      
      {formData.participants.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Aucun participant ajouté</p>
          <button
            type="button"
            onClick={addParticipant}
            className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Ajouter un participant
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {formData.participants.map((participant, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-700">Participant {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeParticipant(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Supprimer
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={`participant_${index}_nom`} className="block text-sm font-medium text-gray-700">
                    Nom *
                  </label>
                  <input
                    type="text"
                    id={`participant_${index}_nom`}
                    value={participant.nom}
                    onChange={(e) => handleParticipantChange(index, 'nom', e.target.value)}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors[`participant_${index}_nom`]
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
                    }`}
                    required
                  />
                  {errors[`participant_${index}_nom`] && (
                    <p className="mt-1 text-sm text-red-600">{errors[`participant_${index}_nom`]}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor={`participant_${index}_prenom`} className="block text-sm font-medium text-gray-700">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    id={`participant_${index}_prenom`}
                    value={participant.prenom}
                    onChange={(e) => handleParticipantChange(index, 'prenom', e.target.value)}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors[`participant_${index}_prenom`]
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
                    }`}
                    required
                  />
                  {errors[`participant_${index}_prenom`] && (
                    <p className="mt-1 text-sm text-red-600">{errors[`participant_${index}_prenom`]}</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor={`participant_${index}_fonction`} className="block text-sm font-medium text-gray-700">
                    Fonction
                  </label>
                  <input
                    type="text"
                    id={`participant_${index}_fonction`}
                    value={participant.fonction}
                    onChange={(e) => handleParticipantChange(index, 'fonction', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-purple-700">
        <p className="font-medium">Aperçu du document généré</p>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{formData.title}</h3>
            <p className="text-gray-500 mt-1">
              {formData.type === 'convention' ? 'Convention de formation professionnelle' :
               formData.type === 'attestation' ? 'Attestation de présence' :
               formData.type === 'devis' ? 'Devis de formation' :
               formData.type === 'facture' ? 'Facture' : 'Programme de formation'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">PETITMAKER</p>
            <p className="text-sm text-gray-500">SIRET: 928 386 044 00012</p>
            <p className="text-sm text-gray-500">2 rue Héraclès, 59650 Villeneuve-d'Ascq</p>
          </div>
        </div>
        
        <hr className="border-gray-200" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Entreprise</h4>
            <p className="font-medium">{formData.company}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Dates</h4>
            <p>Du {new Date(formData.date_debut).toLocaleDateString()} au {new Date(formData.date_fin).toLocaleDateString()}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Durée</h4>
            <p>{formData.duree} heures</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Lieu</h4>
            <p>{formData.lieu}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Prix</h4>
            <p>{formData.prix} € HT</p>
          </div>
        </div>
        
        <hr className="border-gray-200" />
        
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Participants ({formData.participants.length})</h4>
          <ul className="space-y-2">
            {formData.participants.map((participant, index) => (
              <li key={index} className="text-sm">
                {participant.prenom} {participant.nom}{participant.fonction ? ` - ${participant.fonction}` : ''}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex justify-center pt-4">
          <div className="text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Ceci est un aperçu simplifié. Le document final sera généré au format PDF.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-[100] overflow-hidden p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Générer un document
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-1 flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`flex-1 h-1 ${
                step > 1 ? 'bg-purple-600' : 'bg-gray-200'
              }`} />
            </div>
            
            <div className="flex-1 flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <div className={`flex-1 h-1 ${
                step > 2 ? 'bg-purple-600' : 'bg-gray-200'
              }`} />
            </div>
            
            <div className="flex-1 flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 3 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
              <div className={`flex-1 h-1 ${
                step > 3 ? 'bg-purple-600' : 'bg-gray-200'
              }`} />
            </div>
            
            <div className="flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 4 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
            }">
              4
            </div>
          </div>
          
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Informations</span>
            <span>Détails</span>
            <span>Participants</span>
            <span>Aperçu</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {errors.submit && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {errors.submit}
            </div>
          )}
          
          {renderStepContent()}
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={step === 1 ? onCancel : handlePrevStep}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            {step === 1 ? 'Annuler' : 'Précédent'}
          </button>
          
          <button
            type="button"
            onClick={step === 4 ? handleGenerate : handleNextStep}
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting 
              ? 'Génération...' 
              : step === 4 
                ? 'Générer le document' 
                : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  );
};