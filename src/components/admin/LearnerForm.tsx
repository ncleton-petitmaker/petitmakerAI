import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LearnerFormProps {
  learner?: any;
  companies: { id: string; name: string }[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export const LearnerForm: React.FC<LearnerFormProps> = ({ 
  learner, 
  companies, 
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    id: '',
    first_name: '',
    last_name: '',
    auth_email: '',
    company_id: '',
    company: '',
    job_position: '',
    status: 'active',
    created_at: new Date().toISOString()
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isNewUser, setIsNewUser] = useState(true);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (learner) {
      setFormData({
        id: learner.id || '',
        first_name: learner.first_name || '',
        last_name: learner.last_name || '',
        auth_email: learner.auth_email || '',
        company_id: learner.company_id || '',
        company: learner.company || '',
        job_position: learner.job_position || '',
        status: learner.status || 'active',
        created_at: learner.created_at || new Date().toISOString()
      });
      setIsNewUser(false);
    } else {
      setIsNewUser(true);
    }
  }, [learner]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Special handling for company selection
    if (name === 'company_id' && value) {
      const selectedCompany = companies.find(c => c.id === value);
      if (selectedCompany) {
        setFormData(prev => ({ 
          ...prev, 
          [name]: value,
          company: selectedCompany.name
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Le prénom est requis';
    }
    
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Le nom est requis';
    }
    
    if (!formData.auth_email.trim()) {
      newErrors.auth_email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.auth_email)) {
      newErrors.auth_email = 'L\'email n\'est pas valide';
    }
    
    if (isNewUser && !password.trim()) {
      newErrors.password = 'Le mot de passe est requis pour un nouvel utilisateur';
    } else if (isNewUser && password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (isNewUser) {
        // Create a new user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.auth_email,
          password: password,
          options: {
            data: {
              first_name: formData.first_name,
              last_name: formData.last_name
            }
          }
        });
        
        if (authError) throw authError;
        
        if (authData.user) {
          // Update the user profile with additional information
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({
              first_name: formData.first_name,
              last_name: formData.last_name,
              company: formData.company,
              company_id: formData.company_id,
              job_position: formData.job_position,
              status: formData.status,
              is_admin: false
            })
            .eq('id', authData.user.id);
          
          if (profileError) throw profileError;
          
          // Add the user ID to the form data for the UI update
          formData.id = authData.user.id;
          
          // Create notification
          await supabase
            .from('notifications')
            .insert({
              type: 'new_learner',
              title: 'Nouvel apprenant ajouté',
              message: `${formData.first_name} ${formData.last_name} a été ajouté comme apprenant.`,
              is_read: false,
              created_at: new Date().toISOString()
            });
        }
      } else {
        // Update existing user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            company: formData.company,
            company_id: formData.company_id,
            job_position: formData.job_position,
            status: formData.status
          })
          .eq('id', formData.id);
        
        if (profileError) throw profileError;
      }
      
      // Call the onSubmit callback with the form data
      onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors(prev => ({
        ...prev,
        submit: 'Une erreur est survenue lors de l\'enregistrement.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-[100] overflow-hidden p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {learner ? 'Modifier l\'apprenant' : 'Ajouter un apprenant'}
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
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {errors.submit}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                  Prénom *
                </label>
                <input
                  type="text"
                  name="first_name"
                  id="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.first_name
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                  }`}
                  required
                />
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                  Nom *
                </label>
                <input
                  type="text"
                  name="last_name"
                  id="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.last_name
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                  }`}
                  required
                />
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                )}
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <label htmlFor="auth_email" className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  name="auth_email"
                  id="auth_email"
                  value={formData.auth_email}
                  onChange={handleChange}
                  disabled={!isNewUser} // Can't change email for existing users
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.auth_email
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                  } ${!isNewUser ? 'bg-gray-100' : ''}`}
                  required
                />
                {errors.auth_email && (
                  <p className="mt-1 text-sm text-red-600">{errors.auth_email}</p>
                )}
                {!isNewUser && (
                  <p className="mt-1 text-xs text-gray-500">
                    L'email ne peut pas être modifié pour un utilisateur existant.
                  </p>
                )}
              </div>
              
              {isNewUser && (
                <div className="col-span-1 md:col-span-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Mot de passe *
                  </label>
                  <input
                    type="password"
                    name="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.password
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                    }`}
                    required
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Le mot de passe doit contenir au moins 6 caractères.
                  </p>
                </div>
              )}
              
              <div>
                <label htmlFor="company_id" className="block text-sm font-medium text-gray-700">
                  Entreprise
                </label>
                <select
                  name="company_id"
                  id="company_id"
                  value={formData.company_id}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                >
                  <option value="">Sélectionner une entreprise...</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="job_position" className="block text-sm font-medium text-gray-700">
                  Poste / Fonction
                </label>
                <input
                  type="text"
                  name="job_position"
                  id="job_position"
                  value={formData.job_position}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>
            </div>
          </form>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Enregistrement...' : learner ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
};