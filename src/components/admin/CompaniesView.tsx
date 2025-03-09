import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FileText, 
  Users, 
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Building2,
  Info
} from 'lucide-react';
import { CompanyForm } from './CompanyForm';
import { CompanyLearners } from './CompanyLearners';
import { useNavigate, useLocation } from 'react-router-dom';

interface Company {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  city: string | null;
  status: string;
  created_at: string;
  siret?: string | null;
  email?: string | null;
}

export const CompaniesView = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCompanyForLearners, setSelectedCompanyForLearners] = useState<{id: string, name: string} | null>(null);
  const itemsPerPage = 10;
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchCompanies();
    
    // Vérifier si nous avons des paramètres d'état pour ouvrir le formulaire d'édition
    if (location.state && location.state.openCompanyEdit && location.state.companyToEdit) {
      setEditingCompany(location.state.companyToEdit);
      // Réinitialiser l'état de navigation pour éviter de rouvrir le formulaire lors des rechargements
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [currentPage, searchTerm, statusFilter, location.state]);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('companies')
        .select('id, name, industry, size, city, status, created_at, email, siret', { count: 'exact' });
      
      // Apply filters
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,industry.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
      }
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      console.log('Companies fetched from Supabase:', data);
      setCompanies(data || []);
      setTotalCompanies(count || 0);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCompany = (id: string) => {
    if (selectedCompanies.includes(id)) {
      setSelectedCompanies(selectedCompanies.filter(companyId => companyId !== id));
    } else {
      setSelectedCompanies([...selectedCompanies, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(companies.map(company => company.id));
    }
    setSelectAll(!selectAll);
  };

  const handleAddCompany = async (companyData: any) => {
    setIsLoading(true);
    
    // Log the start of company creation
    console.log('CompaniesView - Starting company creation with data:', companyData);

    try {
      // Ensure email and siret are properly handled
      const dataToSubmit = {
        ...companyData,
        email: companyData.email || null,
        siret: companyData.siret || null
      };

      // Log the data being submitted to Supabase
      console.log('CompaniesView - Submitting new company to Supabase:', {
        ...dataToSubmit,
        email: dataToSubmit.email,
        siret: dataToSubmit.siret
      });

      const { error } = await supabase
        .from('companies')
        .insert([dataToSubmit]);

      if (error) throw error;

      // Close the form and refresh the list
      setShowAddForm(false);
      fetchCompanies();
      
      console.log('CompaniesView - Company created successfully');
    } catch (error) {
      console.error('CompaniesView - Error creating company:', error);
      alert('Une erreur est survenue lors de la création de l\'entreprise.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCompany = async (companyData: any) => {
    setIsLoading(true);
    
    // Log the start of company update
    console.log('CompaniesView - Starting company update with data:', companyData);
    console.log('CompaniesView - Siret value in update data:', companyData.siret);

    try {
      // Ensure we have the company ID
      if (!companyData.id) {
        console.error('CompaniesView - Missing company ID in update data');
        
        // If we have editingCompany, try to use its ID
        if (editingCompany && editingCompany.id) {
          companyData.id = editingCompany.id;
          console.log('CompaniesView - Using ID from editingCompany:', editingCompany.id);
        } else {
          throw new Error('Company ID is required for update');
        }
      } else {
        console.log('CompaniesView - Company ID found in update data:', companyData.id);
      }
      
      // Check if email and siret are being preserved from the original company
      const originalCompany = editingCompany;
      if (originalCompany) {
        console.log('CompaniesView - Original company data:', {
          id: originalCompany.id,
          email: originalCompany.email,
          siret: originalCompany.siret
        });
        
        // Vérification détaillée pour le champ siret
        console.log('CompaniesView - Checking siret preservation:');
        console.log('  - Update siret value:', companyData.siret);
        console.log('  - Original siret value:', originalCompany.siret);
        console.log('  - Is update siret empty?', !companyData.siret || companyData.siret === '');
        console.log('  - Does original have siret?', !!originalCompany.siret);
        
        if ((!companyData.email || companyData.email === '') && originalCompany.email) {
          companyData.email = originalCompany.email;
          console.log('CompaniesView - Preserving email value:', originalCompany.email);
        }
        
        if ((!companyData.siret || companyData.siret === '') && originalCompany.siret) {
          companyData.siret = originalCompany.siret;
          console.log('CompaniesView - Preserving siret value:', originalCompany.siret);
        } else {
          console.log('CompaniesView - Using provided siret value:', companyData.siret);
        }
      }

      // Ensure siret is explicitly set to null if it's empty
      if (companyData.siret === '') {
        companyData.siret = null;
        console.log('CompaniesView - Setting empty siret to null');
      }

      // Log the data being submitted to Supabase
      console.log('CompaniesView - Submitting update to Supabase:', {
        id: companyData.id,
        ...companyData,
        email: companyData.email,
        siret: companyData.siret
      });

      const { error } = await supabase
        .from('companies')
        .update(companyData)
        .eq('id', companyData.id);

      if (error) {
        console.error('CompaniesView - Supabase update error:', error);
        throw error;
      }

      // Close the form and refresh the list
      setEditingCompany(null);
      fetchCompanies();
      
      console.log('CompaniesView - Company updated successfully');
    } catch (error) {
      console.error('CompaniesView - Error updating company:', error);
      alert('Une erreur est survenue lors de la mise à jour de l\'entreprise.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Refresh the list
      fetchCompanies();
      setSelectedCompanies(selectedCompanies.filter(companyId => companyId !== id));
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Une erreur est survenue lors de la suppression de l\'entreprise.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCompanies.length === 0) return;
    
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedCompanies.length} entreprise(s) ?`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .in('id', selectedCompanies);
      
      if (error) throw error;
      
      // Refresh the list
      fetchCompanies();
      setSelectedCompanies([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error deleting companies:', error);
      alert('Une erreur est survenue lors de la suppression des entreprises.');
    }
  };

  const exportCompanies = async () => {
    try {
      // Fetch all companies for export
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const dataToExport = (data || []).map(company => ({
        Nom: company.name,
        Secteur: company.industry || '',
        Taille: company.size || '',
        Adresse: company.address || '',
        Ville: company.city || '',
        'Code postal': company.postal_code || '',
        Pays: company.country || '',
        Téléphone: company.phone || '',
        Email: company.email || '',
        SIRET: company.siret || '',
        'Site web': company.website || '',
        Statut: company.status === 'active' ? 'Actif' : company.status === 'inactive' ? 'Inactif' : 'Prospect',
        Notes: company.notes || '',
        'Date de création': new Date(company.created_at).toLocaleDateString()
      }));
      
      console.log('Data to export:', dataToExport);
      
      const csvContent = 
        'data:text/csv;charset=utf-8,' + 
        Object.keys(dataToExport[0]).join(';') + '\n' + 
        dataToExport.map(row => 
          Object.values(row).join(';')
        ).join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'entreprises.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting companies:', error);
      alert('Une erreur est survenue lors de l\'exportation des entreprises.');
    }
  };

  const handleViewLearners = (company: Company) => {
    setSelectedCompanyForLearners({
      id: company.id,
      name: company.name
    });
  };

  const handleViewCompanyDetails = (companyId: string) => {
    navigate(`/admin/companies/${companyId}`);
  };

  const totalPages = Math.ceil(totalCompanies / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Building2 className="mr-2 h-6 w-6 text-blue-600" />
          Entreprises
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({totalCompanies})
          </span>
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Ajouter une entreprise
          </button>
          
          <button
            onClick={exportCompanies}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
            placeholder="Rechercher une entreprise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        
        <div className="flex items-center">
          <div className="relative inline-block text-left">
            <div className="flex items-center">
              <Filter className="h-5 w-5 text-gray-400 mr-2" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
                <option value="lead">Prospect</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Companies table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {selectedCompanies.length > 0 && (
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 sm:px-6 flex items-center justify-between">
            <span className="text-sm text-gray-700">
              {selectedCompanies.length} entreprise(s) sélectionnée(s)
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entreprise
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Secteur
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Ville
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                  SIRET
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Statut
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                  Date d'ajout
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    Aucune entreprise trouvée
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        checked={selectedCompanies.includes(company.id)}
                        onChange={() => handleSelectCompany(company.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div 
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            onClick={() => handleViewCompanyDetails(company.id)}
                          >
                            {company.name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <Users className="h-3 w-3 mr-1" />
                            <span 
                              className="cursor-pointer hover:text-blue-600"
                              onClick={() => handleViewLearners(company)}
                            >
                              Voir les apprenants
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {company.industry || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                      {company.city || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                      {company.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                      {company.siret || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        company.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : company.status === 'inactive' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {company.status === 'active' 
                          ? 'Actif' 
                          : company.status === 'inactive' 
                            ? 'Inactif' 
                            : 'Prospect'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                      {new Date(company.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewCompanyDetails(company.id)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="Voir les détails"
                      >
                        <Info className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleViewLearners(company)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Voir les apprenants"
                      >
                        <Users className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setEditingCompany(company)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                        title="Modifier"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCompany(company.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
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
                    {Math.min(currentPage * itemsPerPage, totalCompanies)}
                  </span>{' '}
                  sur <span className="font-medium">{totalCompanies}</span> résultats
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
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
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

      {/* Add/Edit Company Modal */}
      {(showAddForm || editingCompany) && (
        <CompanyForm
          company={editingCompany}
          onSubmit={editingCompany ? handleUpdateCompany : handleAddCompany}
          onCancel={() => {
            setShowAddForm(false);
            setEditingCompany(null);
          }}
        />
      )}

      {/* Company Learners Modal */}
      {selectedCompanyForLearners && (
        <CompanyLearners
          companyId={selectedCompanyForLearners.id}
          companyName={selectedCompanyForLearners.name}
          onClose={() => setSelectedCompanyForLearners(null)}
        />
      )}
    </div>
  );
};