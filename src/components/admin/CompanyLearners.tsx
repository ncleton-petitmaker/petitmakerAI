import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Users, Mail, Phone, MapPin, ExternalLink, ArrowLeft, UserCircle } from 'lucide-react';
import { LoadingSpinner } from '../LoadingSpinner';
import { useNavigate } from 'react-router-dom';

interface CompanyLearnersProps {
  companyId: string;
  companyName: string;
  onClose: () => void;
}

interface Learner {
  id: string;
  first_name: string;
  last_name: string;
  job_position?: string;
  status: string;
  last_login?: string;
  created_at: string;
  auth_email?: string;
  questionnaire_completed?: boolean;
  initial_evaluation_completed?: boolean;
  final_evaluation_completed?: boolean;
  satisfaction_completed?: boolean;
}

export const CompanyLearners: React.FC<CompanyLearnersProps> = ({ 
  companyId, 
  companyName, 
  onClose 
}) => {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCompanyDetails();
    fetchLearners();
  }, [companyId]);

  const fetchCompanyDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      
      if (error) throw error;
      
      setCompanyDetails(data);
    } catch (error) {
      console.error('Error fetching company details:', error);
      setError('Impossible de charger les détails de l\'entreprise');
    }
  };

  const fetchLearners = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch learners associated with this company
      const { data: learnersData, error: learnersError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, job_position, status, last_login, created_at, questionnaire_completed, initial_evaluation_completed, final_evaluation_completed, satisfaction_completed')
        .eq('company_id', companyId);
      
      if (learnersError) throw learnersError;
      
      // For each learner, get their email
      const learnersWithEmail = await Promise.all(
        learnersData.map(async (learner) => {
          try {
            const { data: emailData, error: emailError } = await supabase
              .rpc('get_auth_users_email', { user_id: learner.id });
            
            if (emailError) throw emailError;
            
            return {
              ...learner,
              auth_email: emailData || 'Email non disponible'
            };
          } catch (error) {
            console.error(`Error fetching email for learner ${learner.id}:`, error);
            return {
              ...learner,
              auth_email: 'Email non disponible'
            };
          }
        })
      );
      
      setLearners(learnersWithEmail);
    } catch (error) {
      console.error('Error fetching learners:', error);
      setError('Impossible de charger les apprenants');
      setLearners([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewLearnerDetails = (learnerId: string) => {
    // Fermer la modal des apprenants de l'entreprise
    onClose();
    // Rediriger vers la page de détail de l'apprenant
    navigate(`/admin/learners/${learnerId}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-[100] overflow-hidden p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Users className="mr-2 h-5 w-5 text-blue-500" />
            Apprenants de {companyName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {/* Company details card */}
          {companyDetails && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-100">
              <h4 className="text-md font-medium text-blue-800 mb-2">Détails de l'entreprise</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-sm text-gray-800">{companyDetails.email || 'Non renseigné'}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Téléphone</p>
                    <p className="text-sm text-gray-800">{companyDetails.phone || 'Non renseigné'}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Adresse</p>
                    <p className="text-sm text-gray-800">
                      {companyDetails.address ? (
                        <>
                          {companyDetails.address}<br />
                          {companyDetails.postal_code} {companyDetails.city}<br />
                          {companyDetails.country}
                        </>
                      ) : (
                        'Non renseignée'
                      )}
                    </p>
                  </div>
                </div>
                {companyDetails.website && (
                  <div className="flex items-start">
                    <ExternalLink className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Site web</p>
                      <a 
                        href={companyDetails.website.startsWith('http') ? companyDetails.website : `https://${companyDetails.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {companyDetails.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Learners list */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">
                Liste des apprenants
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({learners.length})
                </span>
              </h4>
              <button
                onClick={onClose}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Retour
              </button>
            </div>
            
            {isLoading ? (
              <LoadingSpinner message="Chargement des apprenants..." />
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            ) : learners.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
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
                        onClick={() => handleViewLearnerDetails(learner.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-800 font-medium">
                                {learner.first_name.charAt(0)}{learner.last_name.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="flex flex-col">
                                <div className="text-sm font-medium text-gray-900">{learner.first_name} {learner.last_name}</div>
                                <div className="text-sm text-gray-500">{learner.auth_email}</div>
                                {learner.job_position && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {learner.job_position}
                                  </div>
                                )}
                                <div className="flex mt-1 space-x-1">
                                  {learner.questionnaire_completed && (
                                    <span title="Questionnaire de positionnement complété" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      QP
                                    </span>
                                  )}
                                  {learner.initial_evaluation_completed && (
                                    <span title="Évaluation initiale complétée" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      EI
                                    </span>
                                  )}
                                  {learner.final_evaluation_completed && (
                                    <span title="Évaluation finale complétée" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                      EF
                                    </span>
                                  )}
                                  {learner.satisfaction_completed && (
                                    <span title="Questionnaire de satisfaction complété" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      QS
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              learner.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {learner.status === 'active' ? 'Actif' : 'Inactif'}
                            </span>
                            <UserCircle className="ml-2 h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              Dernière connexion: {learner.last_login 
                                ? new Date(learner.last_login).toLocaleDateString() 
                                : 'Jamais'}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <p>
                              Inscrit le: {new Date(learner.created_at).toLocaleDateString()}
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
    </div>
  );
}; 