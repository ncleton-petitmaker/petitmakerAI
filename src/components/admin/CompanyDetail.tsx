import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Users,
  ExternalLink,
  Edit,
  Trash2
} from 'lucide-react';
import { LoadingSpinner } from '../LoadingSpinner';

interface CompanyDetailProps {
  onBack?: () => void;
}

export const CompanyDetail: React.FC<CompanyDetailProps> = ({ onBack }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<any>(null);
  const [learners, setLearners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchCompanyDetails();
    }
  }, [id]);

  const fetchCompanyDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch company profile
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (companyError) throw companyError;

      setCompany(companyData);

      // Fetch learners associated with this company
      const { data, error: learnersError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, job_position, status, last_login, created_at')
        .eq('company_id', id)
        .order('last_name', { ascending: true });

      if (learnersError) throw learnersError;

      // For each learner, get their email
      const learnersWithEmail = await Promise.all((data || []).map(async (learner) => {
        try {
          const { data: emailData, error: emailError } = await supabase
            .rpc('get_auth_users_email', { user_id: learner.id });
          
          if (emailError) throw emailError;
          
          return {
            ...learner,
            auth_email: emailData || 'Email non disponible'
          };
        } catch (emailError) {
          console.error('Error fetching user email:', emailError);
          return {
            ...learner,
            auth_email: 'Email non disponible'
          };
        }
      }));

      setLearners(learnersWithEmail);

    } catch (error) {
      console.error('Error fetching company details:', error);
      setError('Impossible de charger les détails de l\'entreprise');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/admin');
    }
  };

  const handleEdit = () => {
    // Rediriger vers la page d'administration avec un paramètre d'état pour ouvrir le formulaire d'édition
    navigate('/admin', { 
      state: { 
        openCompanyEdit: true, 
        companyToEdit: company 
      } 
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non disponible';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <LoadingSpinner message="Chargement des détails de l'entreprise..." />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="bg-white shadow rounded-lg p-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Détails de l'entreprise</h1>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error || "Impossible de trouver l'entreprise demandée"}
        </div>
        <div className="mt-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Détails de l'entreprise</h1>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleEdit}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Edit className="h-4 w-4 mr-1" />
            Modifier
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Company profile */}
        <div className="flex flex-col md:flex-row md:items-start">
          {/* Logo and basic info */}
          <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
            <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center">
              <Building2 className="h-12 w-12 text-blue-800" />
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {company.name}
            </h2>
            
            <div className="mt-1 flex items-center">
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                {learners.length} apprenant{learners.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{company.email || 'Non renseigné'}</p>
                </div>
              </div>

              {company.phone && (
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Téléphone</p>
                    <p className="text-sm text-gray-900">{company.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Adresse</p>
                  <p className="text-sm text-gray-900">
                    {company.address ? (
                      <>
                        {company.address}<br />
                        {company.postal_code} {company.city}<br />
                        {company.country}
                      </>
                    ) : (
                      'Non renseignée'
                    )}
                  </p>
                </div>
              </div>

              {company.website && (
                <div className="flex items-start">
                  <ExternalLink className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Site web</p>
                    <a 
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {company.website}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Date d'ajout</p>
                  <p className="text-sm text-gray-900">{formatDate(company.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Learners */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Apprenants</h3>
          
          {learners.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun apprenant</h3>
              <p className="mt-1 text-sm text-gray-500">
                Cette entreprise n'a pas encore d'apprenants associés.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {learners.map((learner) => (
                  <li key={learner.id}>
                    <div 
                      className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                      onClick={() => navigate(`/admin/learners/${learner.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-800 font-medium">
                              {learner.first_name.charAt(0)}{learner.last_name.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-blue-600 hover:text-blue-800">
                              {learner.first_name} {learner.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {learner.auth_email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {learner.job_position && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 mr-2">
                              {learner.job_position}
                            </span>
                          )}
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            learner.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {learner.status === 'active' ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            Dernière connexion: {learner.last_login 
                              ? formatDate(learner.last_login)
                              : 'Jamais'}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>
                            Inscrit le: {formatDate(learner.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 