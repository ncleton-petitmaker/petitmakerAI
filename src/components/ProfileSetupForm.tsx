import React, { useState, useEffect } from 'react';
import { supabase, checkAuth, handleSupabaseError } from '../lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';

interface FormData {
  firstName: string;
  lastName: string;
  company: string;
  jobPosition: string;
}

interface Company {
  id: string;
  name: string;
  status: string;
}

interface ProfileSetupFormProps {
  userId: string;
  onSuccess?: () => void;
}

type CompanyStatus = 'unknown' | 'pending' | 'valid';

export default function ProfileSetupForm({ userId, onSuccess }: ProfileSetupFormProps) {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    company: '',
    jobPosition: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyStatus, setCompanyStatus] = useState<CompanyStatus>('unknown');
  const [existingCompany, setExistingCompany] = useState<Company | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Vérifier d'abord l'authentification
        const user = await checkAuth();
        if (!user) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }

        const { data, error } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, company, job_position')
          .eq('id', userId)
          .single();

        if (error) throw error;
        
        if (data) {
          setFormData({
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            company: data.company || '',
            jobPosition: data.job_position || ''
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError(handleSupabaseError(error));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  // Fonction pour vérifier l'entreprise
  const checkCompany = async (companyName: string) => {
    try {
      console.log('🔍 [COMPANY] Vérification de l\'entreprise:', companyName);
      
      if (!companyName.trim()) {
        setCompanyStatus('unknown');
        setExistingCompany(null);
        return;
      }

      // Vérifier l'authentification avant de faire la requête
      const user = await checkAuth();
      if (!user) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      // Rechercher l'entreprise
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, name, status')
        .ilike('name', `%${companyName}%`)
        .limit(1);

      if (error) {
        console.error('❌ [COMPANY] Erreur lors de la recherche:', error);
        throw error;
      }

      if (companies && companies.length > 0) {
        console.log('✅ [COMPANY] Entreprise trouvée:', companies[0]);
        setExistingCompany(companies[0]);
        setCompanyStatus('valid');
      } else {
        console.log('ℹ️ [COMPANY] Nouvelle entreprise à créer');
        setExistingCompany(null);
        setCompanyStatus('pending');
      }
    } catch (error) {
      console.error('❌ [COMPANY] Erreur lors de la vérification:', error);
      setError(handleSupabaseError(error));
      setCompanyStatus('unknown');
      setExistingCompany(null);
    }
  };

  // Gestionnaire de changement des champs
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Vérifier l'entreprise si le champ modifié est 'company'
    if (name === 'company') {
      await checkCompany(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('📝 [PROFILE] Début de la soumission du profil');
      console.log('📊 [PROFILE] Données du formulaire:', formData);

      // Vérifier l'authentification avant de soumettre
      const user = await checkAuth();
      if (!user) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      let companyId = existingCompany?.id;

      // Si l'entreprise n'existe pas et qu'un nom est fourni, la créer
      if (!companyId && formData.company.trim()) {
        console.log('🏢 [COMPANY] Création d\'une nouvelle entreprise:', formData.company);
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert([{
            name: formData.company.trim(),
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select('id')
          .single();

        if (companyError) {
          console.error('❌ [COMPANY] Erreur lors de la création:', companyError);
          throw companyError;
        }

        console.log('✅ [COMPANY] Nouvelle entreprise créée:', newCompany);
        companyId = newCompany.id;

        // Créer une notification pour la nouvelle entreprise
        const { error: notifError } = await supabase
          .from('notifications')
          .insert([{
            type: 'company_validation',
            title: 'Nouvelle entreprise à valider',
            message: `L'entreprise "${formData.company}" a été ajoutée et nécessite une validation.`,
            status: 'unread',
            created_at: new Date().toISOString(),
            metadata: { company_id: companyId }
          }]);

        if (notifError) {
          console.error('⚠️ [NOTIFICATION] Erreur lors de la création:', notifError);
        }
      }

      // Mettre à jour ou créer le profil utilisateur
      console.log('👤 [PROFILE] Mise à jour du profil utilisateur');
      const updates = {
        id: userId,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        company_id: companyId,
        job_position: formData.jobPosition.trim(),
        updated_at: new Date().toISOString()
      };

      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(updates, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('❌ [PROFILE] Erreur lors de la mise à jour:', profileError);
        throw profileError;
      }

      console.log('✅ [PROFILE] Profil mis à jour avec succès');
      setIsLoading(false);
      onSuccess?.();
    } catch (error) {
      console.error('❌ [PROFILE] Erreur globale:', error);
      setError(handleSupabaseError(error));
      setIsLoading(false);
    }
  };

  if (isLoading) {
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
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">
            Prénom
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-1">
            Nom
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
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
            required
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
          <label htmlFor="jobPosition" className="block text-sm font-medium text-gray-300 mb-1">
            Fonction
          </label>
          <input
            type="text"
            id="jobPosition"
            name="jobPosition"
            value={formData.jobPosition}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Votre fonction dans l'entreprise"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Enregistrement...' : 'Continuer'}
        </button>
      </form>
    </div>
  );
} 