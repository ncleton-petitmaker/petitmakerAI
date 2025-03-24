import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface CompanyFormProps {
  company?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export const CompanyForm: React.FC<CompanyFormProps> = ({ company, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    size: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    phone: '',
    website: '',
    status: 'active',
    notes: '',
    siret: '',
    email: '',
    id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        industry: company.industry || '',
        size: company.size || '',
        address: company.address || '',
        city: company.city || '',
        postal_code: company.postal_code || '',
        country: company.country || 'France',
        phone: company.phone || '',
        website: company.website || '',
        status: company.status || 'active',
        notes: company.notes || '',
        siret: company.siret || '',
        email: company.email || '',
        id: company.id || ''
      });
    }
  }, [company]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Log détaillé pour le champ siret
    if (name === 'siret') {
      console.log('CompanyForm - Siret field changed:', {
        oldValue: formData.siret,
        newValue: value
      });
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de l\'entreprise est requis';
    }
    
    if (formData.website && !isValidUrl(formData.website)) {
      newErrors.website = 'L\'URL du site web n\'est pas valide';
    }
    
    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = 'Le numéro de téléphone n\'est pas valide';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const isValidPhone = (phone: string) => {
    // Simple phone validation - can be improved
    return /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(phone) || 
           /^(0|\+33)[1-9]([-. ]?[0-9]{2}){4}$/.test(phone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Log the start of form submission with current formData
    console.log('CompanyForm - Starting form submission with data:', formData);
    console.log('CompanyForm - Current address value in form:', formData.address);
    
    if (company) {
      console.log('CompanyForm - Original company address value:', company.address);
    }

    if (!validateForm()) {
      console.error('CompanyForm - Form validation failed');
      return;
    }

    setIsSubmitting(true);

    try {
      // Préserver les valeurs email et siret si elles sont définies dans l'entreprise existante
      // mais pas dans le formulaire
      let dataToSubmit = { ...formData };
      
      if (company) {
        // Si c'est une mise à jour, inclure l'ID de l'entreprise
        dataToSubmit.id = company.id;
        console.log('CompanyForm - Including company ID for update:', company.id);
        
        // Log détaillé pour l'adresse
        console.log('CompanyForm - Address comparison:');
        console.log('  - Form address value:', dataToSubmit.address);
        console.log('  - Original address value:', company.address);
        console.log('  - Is form address different?', dataToSubmit.address !== company.address);
        
        // Si les champs email et siret sont vides dans le formulaire
        // mais définis dans l'entreprise existante, les préserver
        if ((!dataToSubmit.email || dataToSubmit.email === '') && company.email) {
          dataToSubmit.email = company.email;
          console.log('CompanyForm - Preserving email value:', company.email);
        }
        
        // Vérification plus détaillée pour le champ siret
        console.log('CompanyForm - Checking siret preservation:');
        console.log('  - Form siret value:', dataToSubmit.siret);
        console.log('  - Original siret value:', company.siret);
        console.log('  - Is form siret empty?', !dataToSubmit.siret || dataToSubmit.siret === '');
        console.log('  - Does original have siret?', !!company.siret);
        
        if ((!dataToSubmit.siret || dataToSubmit.siret === '') && company.siret) {
          dataToSubmit.siret = company.siret;
          console.log('CompanyForm - Preserving siret value:', company.siret);
        } else {
          console.log('CompanyForm - Using form siret value:', dataToSubmit.siret);
        }
      }
      
      // Log the data being submitted, including email and siret
      console.log(`CompanyForm - Submitting data (${company ? 'update' : 'create'}):`, {
        ...dataToSubmit,
        id: dataToSubmit.id,
        email: dataToSubmit.email,
        siret: dataToSubmit.siret,
        address: dataToSubmit.address
      });

      onSubmit(dataToSubmit);
      console.log('CompanyForm - Form submitted successfully');
      setIsSubmitting(false);
    } catch (error) {
      console.error('CompanyForm - Error submitting form:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-[100] overflow-hidden p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {company ? 'Modifier l\'entreprise' : 'Ajouter une entreprise'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nom de l'entreprise *
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.name
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  required
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <label htmlFor="siret" className="block text-sm font-medium text-gray-700">
                  Numéro SIRET
                </label>
                <input
                  type="text"
                  name="siret"
                  id="siret"
                  value={formData.siret}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="123 456 789 00012"
                />
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="contact@example.com"
                />
              </div>
              
              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
                  Secteur d'activité
                </label>
                <input
                  type="text"
                  name="industry"
                  id="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="size" className="block text-sm font-medium text-gray-700">
                  Taille de l'entreprise
                </label>
                <select
                  name="size"
                  id="size"
                  value={formData.size}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Sélectionner...</option>
                  <option value="1-10">1-10 employés</option>
                  <option value="11-50">11-50 employés</option>
                  <option value="51-200">51-200 employés</option>
                  <option value="201-500">201-500 employés</option>
                  <option value="501+">501+ employés</option>
                </select>
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Adresse
                </label>
                <input
                  type="text"
                  name="address"
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  Ville
                </label>
                <input
                  type="text"
                  name="city"
                  id="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                  Code postal
                </label>
                <input
                  type="text"
                  name="postal_code"
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                  Pays
                </label>
                <input
                  type="text"
                  name="country"
                  id="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Téléphone
                </label>
                <input
                  type="text"
                  name="phone"
                  id="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.phone
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                  Site web
                </label>
                <input
                  type="text"
                  name="website"
                  id="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://example.com"
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.website
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {errors.website && (
                  <p className="mt-1 text-sm text-red-600">{errors.website}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Statut
                </label>
                <select
                  name="status"
                  id="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="lead">Prospect</option>
                </select>
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </form>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Enregistrement...' : company ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
};