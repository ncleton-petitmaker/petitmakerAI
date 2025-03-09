import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Edit, 
  Trash2, 
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  Building2,
  Info,
  Eye
} from 'lucide-react';
import { LearnerForm } from './LearnerForm';
import { useNavigate, useLocation } from 'react-router-dom';

interface Learner {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
  company_id: string | null;
  job_position: string | null;
  status: string;
  last_login: string | null;
  created_at: string;
  auth_email?: string;
  questionnaire_completed?: boolean;
  initial_evaluation_completed?: boolean;
  final_evaluation_completed?: boolean;
  satisfaction_completed?: boolean;
}

export const LearnersView = () => {
  const [allLearners, setAllLearners] = useState<Learner[]>([]);
  const [filteredLearners, setFilteredLearners] = useState<Learner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);
  const [selectedLearners, setSelectedLearners] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLearners, setTotalLearners] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [companies, setCompanies] = useState<{id: string, name: string}[]>([]);
  const itemsPerPage = 10;
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchLearners();
    fetchCompanies();
    
    // Check if we need to open the edit form (redirected from another page)
    if (location.state && location.state.openLearnerEdit && location.state.learnerToEdit) {
      setEditingLearner(location.state.learnerToEdit);
      setShowAddForm(true);
      
      // Clear the state to prevent reopening the form on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location]);

  useEffect(() => {
    // Apply filters whenever search term, status filter, or company filter changes
    let filtered = [...allLearners];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(learner => 
        learner.first_name.toLowerCase().includes(term) || 
        learner.last_name.toLowerCase().includes(term) || 
        (learner.company && learner.company.toLowerCase().includes(term))
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(learner => learner.status === statusFilter);
    }
    
    if (companyFilter !== 'all') {
      filtered = filtered.filter(learner => learner.company_id === companyFilter);
    }
    
    setFilteredLearners(filtered);
    setTotalLearners(filtered.length);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, statusFilter, companyFilter, allLearners]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchLearners = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all non-admin users
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, company, company_id, job_position, status, last_login, created_at, questionnaire_completed, initial_evaluation_completed, final_evaluation_completed, satisfaction_completed')
        .eq('is_admin', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // For each user, obtain their email via the RPC function
      const learnersWithEmail = await Promise.all((data || []).map(async (learner) => {
        try {
          const { data: emailData, error: emailError } = await supabase
            .rpc('get_auth_users_email', { user_id: learner.id });
          
          if (emailError) throw emailError;
          
          return {
            ...learner,
            auth_email: emailData || ''
          };
        } catch (emailError) {
          console.error('Error fetching user email:', emailError);
          return {
            ...learner,
            auth_email: 'Email non disponible'
          };
        }
      }));
      
      setAllLearners(learnersWithEmail);
      setFilteredLearners(learnersWithEmail);
      setTotalLearners(learnersWithEmail.length);
    } catch (error) {
      console.error('Error fetching learners:', error);
      setAllLearners([]);
      setFilteredLearners([]);
      setTotalLearners(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectLearner = (id: string) => {
    if (selectedLearners.includes(id)) {
      setSelectedLearners(selectedLearners.filter(learnerId => learnerId !== id));
    } else {
      setSelectedLearners([...selectedLearners, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLearners([]);
    } else {
      setSelectedLearners(filteredLearners.map(learner => learner.id));
    }
    setSelectAll(!selectAll);
  };

  const handleDeleteLearner = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet apprenant ?')) {
      return;
    }
    
    try {
      // Create a deletion request
      const { error: requestError } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: id,
          processed: false,
          reason: 'Suppression par administrateur'
        });
      
      if (requestError) throw requestError;
      
      // Refresh the list
      fetchLearners();
      setSelectedLearners(selectedLearners.filter(learnerId => learnerId !== id));
    } catch (error) {
      console.error('Error deleting learner:', error);
      alert('Une erreur est survenue lors de la suppression de l\'apprenant.');
    }
  };

  const handleViewLearnerDetails = (id: string) => {
    navigate(`/admin/learners/${id}`);
  };

  const handleBulkDelete = async () => {
    if (selectedLearners.length === 0) return;
    
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedLearners.length} apprenant(s) ?`)) {
      return;
    }
    
    try {
      // Create deletion requests for all selected users
      const deletionRequests = selectedLearners.map(userId => ({
        user_id: userId,
        processed: false,
        reason: 'Suppression groupée par administrateur'
      }));
      
      const { error } = await supabase
        .from('account_deletion_requests')
        .insert(deletionRequests);
      
      if (error) throw error;
      
      // Refresh the list
      fetchLearners();
      setSelectedLearners([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error deleting learners:', error);
      alert('Une erreur est survenue lors de la suppression des apprenants.');
    }
  };

  const exportLearners = () => {
    const dataToExport = filteredLearners.map(learner => ({
      Prénom: learner.first_name,
      Nom: learner.last_name,
      Email: learner.auth_email || '',
      Entreprise: learner.company,
      Poste: learner.job_position || '',
      Statut: learner.status === 'active' ? 'Actif' : learner.status === 'lead' ? 'Lead' : 'Inactif',
      'Dernière connexion': learner.last_login ? new Date(learner.last_login).toLocaleDateString() : 'Jamais',
      'Date d\'inscription': new Date(learner.created_at).toLocaleDateString()
    }));
    
    const csvContent = 
      'data:text/csv;charset=utf-8,' + 
      Object.keys(dataToExport[0]).join(';') + '\n' + 
      dataToExport.map(row => 
        Object.values(row).join(';')
      ).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'apprenants.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get paginated learners
  const paginatedLearners = filteredLearners.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalPages = Math.ceil(totalLearners / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Users className="mr-2 h-6 w-6 text-green-600" />
          Apprenants
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({totalLearners})
          </span>
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Ajouter un apprenant
          </button>
          
          <button
            onClick={exportLearners}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Download className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
            Exporter
          </button>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher un apprenant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative inline-block text-left">
            <div className="flex items-center">
              <Filter className="h-5 w-5 text-gray-400 mr-2" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
                <option value="lead">Lead</option>
              </select>
            </div>
          </div>
          
          <div className="relative inline-block text-left">
            <div className="flex items-center">
              <Building2 className="h-5 w-5 text-gray-400 mr-2" />
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
              >
                <option value="all">Toutes les entreprises</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Learners table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {selectedLearners.length > 0 && (
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 sm:px-6 flex items-center justify-between">
            <span className="text-sm text-gray-700">
              {selectedLearners.length} apprenant(s) sélectionné(s)
            </span>
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Supprimer
            </button>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entreprise
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Poste
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Questionnaires
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dernière connexion
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 whitespace-nowrap">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
                    </div>
                  </td>
                </tr>
              ) : paginatedLearners.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    Aucun apprenant trouvé
                  </td>
                </tr>
              ) : (
                paginatedLearners.map((learner) => (
                  <tr key={learner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedLearners.includes(learner.id)}
                          onChange={() => handleSelectLearner(learner.id)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div 
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                        onClick={() => handleViewLearnerDetails(learner.id)}
                      >
                        {learner.first_name} {learner.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {learner.auth_email || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{learner.company || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{learner.job_position || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        learner.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : learner.status === 'lead'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {learner.status === 'active' ? 'Actif' : learner.status === 'lead' ? 'Lead' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        {learner.questionnaire_completed ? (
                          <span title="Questionnaire de positionnement complété" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            QP
                          </span>
                        ) : (
                          <span title="Questionnaire de positionnement non complété" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            QP
                          </span>
                        )}
                        {learner.initial_evaluation_completed ? (
                          <span title="Évaluation initiale complétée" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            EI
                          </span>
                        ) : (
                          <span title="Évaluation initiale non complétée" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            EI
                          </span>
                        )}
                        {learner.final_evaluation_completed ? (
                          <span title="Évaluation finale complétée" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            EF
                          </span>
                        ) : (
                          <span title="Évaluation finale non complétée" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            EF
                          </span>
                        )}
                        {learner.satisfaction_completed ? (
                          <span title="Questionnaire de satisfaction complété" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            QS
                          </span>
                        ) : (
                          <span title="Questionnaire de satisfaction non complété" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            QS
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {learner.last_login 
                        ? new Date(learner.last_login).toLocaleDateString() 
                        : 'Jamais'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewLearnerDetails(learner.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir les détails"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setEditingLearner(learner)}
                          className="text-green-600 hover:text-green-900"
                          title="Modifier"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLearner(learner.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Affichage de <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> à{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, totalLearners)}
                  </span>{' '}
                  sur <span className="font-medium">{totalLearners}</span> résultats
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Précédent</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border ${
                        page === currentPage
                          ? 'z-10 bg-green-50 border-green-500 text-green-600'
                          : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                      } text-sm font-medium`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Suivant</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Learner Modal */}
      {(showAddForm || editingLearner) && (
        <LearnerForm
          learner={editingLearner}
          companies={companies}
          onSubmit={(learnerData) => {
            if (editingLearner) {
              // Update existing learner
              const updatedLearners = allLearners.map(l => 
                l.id === learnerData.id ? { ...l, ...learnerData } : l
              );
              setAllLearners(updatedLearners);
              setEditingLearner(null);
            } else {
              // Add new learner (in a real app, this would involve creating a user account)
              // For demo purposes, we'll just add it to the UI
              const newLearner = {
                ...learnerData,
                id: Math.random().toString(36).substring(2, 11),
                created_at: new Date().toISOString(),
                last_login: null
              };
              setAllLearners([newLearner, ...allLearners]);
              setShowAddForm(false);
            }
          }}
          onCancel={() => {
            setShowAddForm(false);
            setEditingLearner(null);
          }}
        />
      )}
    </div>
  );
};