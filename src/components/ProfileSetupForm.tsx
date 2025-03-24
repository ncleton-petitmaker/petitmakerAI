import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';

interface ProfileSetupFormProps {
  userId: string;
  onComplete: () => void;
}

export const ProfileSetupForm: React.FC<ProfileSetupFormProps> = ({ userId, onComplete }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company: '',
    job_position: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingCompany, setExistingCompany] = useState<{ id: string, name: string } | null>(null);
  const [companyStatus, setCompanyStatus] = useState<'valid' | 'pending' | 'unknown'>('unknown');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, company, job_position')
          .eq('id', userId)
          .single();

        if (error) throw error;
        
        if (data) {
          setFormData({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            company: data.company || '',
            job_position: data.job_position || ''
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  // Vérifier si l'entreprise existe déjà lorsque le champ est modifié
  const checkCompanyExists = async (companyName: string) => {
    if (!companyName.trim()) {
      setCompanyStatus('unknown');
      setExistingCompany(null);
      return;
    }

    try {
      // Rechercher l'entreprise dans la base de données
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, name')
        .ilike('name', `%${companyName}%`)
        .limit(1);

      if (error) throw error;

      if (companies && companies.length > 0) {
        const company = companies[0];
        
        // Vérifier si l'entreprise a des formations associées
        const { data: trainings, error: trainingsError } = await supabase
          .from('trainings')
          .select('id')
          .eq('company_id', company.id)
          .limit(1);
          
        if (trainingsError) throw trainingsError;
        
        setExistingCompany(company);
        setCompanyStatus(trainings && trainings.length > 0 ? 'valid' : 'pending');
      } else {
        setExistingCompany(null);
        setCompanyStatus('pending');
      }
    } catch (error) {
      console.error('Error checking company existence:', error);
      setCompanyStatus('unknown');
    }
  };

  // Effectuez une vérification lorsque le nom de l'entreprise change
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (formData.company) {
        checkCompanyExists(formData.company);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.company]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Si l'entreprise existe, utiliser son ID
      const updates = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        company: formData.company,
        job_position: formData.job_position,
        status: companyStatus === 'pending' ? 'pending_company_validation' : 'active'
      };

      // Si on a trouvé une entreprise existante, associer l'utilisateur à cette entreprise
      if (existingCompany) {
        Object.assign(updates, { company_id: existingCompany.id });
      }

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      // Si l'entreprise n'existe pas encore ou n'a pas de formations, créer une notification pour les administrateurs
      if (companyStatus === 'pending') {
        await supabase.from('notifications').insert({
          type: 'new_company_request',
          title: 'Nouvelle entreprise à valider',
          message: `Un apprenant a demandé l'ajout de l'entreprise "${formData.company}"`,
          is_read: false,
          created_at: new Date().toISOString()
        });
      }

      onComplete();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Une erreur est survenue lors de la mise à jour de votre profil. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner message="Chargement..." />
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Complétez votre profil</h2>
      
      {error && (
        <div className="bg-red-500 text-white p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-300 mb-1">
            Prénom
          </label>
          <input
            type="text"
            id="first_name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-300 mb-1">
            Nom
          </label>
          <input
            type="text"
            id="last_name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-1">
            Entreprise
          </label>
          <input
            type="text"
            id="company"
            name="company"
            value={formData.company}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              companyStatus === 'valid' 
                ? 'border-green-500' 
                : companyStatus === 'pending' 
                ? 'border-yellow-500' 
                : 'border-gray-600'
            }`}
          />
          {companyStatus === 'pending' && (
            <p className="text-yellow-400 text-sm mt-1">
              {existingCompany 
                ? "Cette entreprise existe mais n'est pas encore associée à une formation. Un administrateur a été prévenu." 
                : "Votre entreprise n'est pas encore référencée, un administrateur a été prévenu et s'en occupe."}
            </p>
          )}
          {companyStatus === 'valid' && existingCompany && (
            <p className="text-green-400 text-sm mt-1">
              Entreprise reconnue : {existingCompany.name}
            </p>
          )}
        </div>
        
        <div>
          <label htmlFor="job_position" className="block text-sm font-medium text-gray-300 mb-1">
            Fonction
          </label>
          <input
            type="text"
            id="job_position"
            name="job_position"
            value={formData.job_position}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Votre fonction dans l'entreprise"
          />
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Enregistrement...' : 'Continuer'}
        </button>
      </form>
    </div>
  );
}; 