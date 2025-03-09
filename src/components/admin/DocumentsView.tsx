import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  FileText, 
  Trash2, 
  Eye,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Building2,
  X
} from 'lucide-react';
import { DocumentForm } from './DocumentForm';
import { DocumentGenerator } from './DocumentGenerator';

interface Document {
  id: string;
  title: string;
  type: string;
  company: string;
  created_at: string;
  created_by: string;
  file_url: string;
}

export const DocumentsView = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [companies, setCompanies] = useState<{id: string, name: string}[]>([]);
  const itemsPerPage = 10;
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchCompanies();
  }, [currentPage, searchTerm, typeFilter, companyFilter]);

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

  const fetchDocuments = async () => {
    setIsLoading(true);
    
    // In a real app, this would fetch from Supabase
    // For demo purposes, we'll use mock data
    const mockDocuments = [
      {
        id: '1',
        title: 'Convention de formation - Tech Solutions',
        type: 'convention',
        company: 'Tech Solutions SAS',
        created_at: '2025-02-15T10:30:00Z',
        created_by: 'Nicolas Cléton',
        file_url: '#'
      },
      {
        id: '2',
        title: 'Attestation de présence - Jean Dupont',
        type: 'attestation',
        company: 'Tech Solutions SAS',
        created_at: '2025-02-16T14:20:00Z',
        created_by: 'Nicolas Cléton',
        file_url: '#'
      },
      {
        id: '3',
        title: 'Devis formation IA - MarketPro Agency',
        type: 'devis',
        company: 'MarketPro Agency',
        created_at: '2025-02-10T09:15:00Z',
        created_by: 'Nicolas Cléton',
        file_url: '#'
      },
      {
        id: '4',
        title: 'Facture #2025-001 - Tech Solutions',
        type: 'facture',
        company: 'Tech Solutions SAS',
        created_at: '2025-02-18T16:45:00Z',
        created_by: 'Nicolas Cléton',
        file_url: '#'
      },
      {
        id: '5',
        title: 'Programme de formation - Innov Digital',
        type: 'programme',
        company: 'Innov Digital',
        created_at: '2025-02-05T11:20:00Z',
        created_by: 'Nicolas Cléton',
        file_url: '#'
      }
    ];
    
    // Filter by search term
    let filteredDocs = [...mockDocuments];
    if (searchTerm) {
      filteredDocs = filteredDocs.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.company.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by type
    if (typeFilter !== 'all') {
      filteredDocs = filteredDocs.filter(doc => doc.type === typeFilter);
    }
    
    // Filter by company
    if (companyFilter !== 'all') {
      filteredDocs = filteredDocs.filter(doc => 
        doc.company.toLowerCase() === companies.find(c => c.id === companyFilter)?.name.toLowerCase()
      );
    }
    
    setTotalDocuments(filteredDocs.length);
    
    // Apply pagination
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    setDocuments(filteredDocs.slice(start, end));
    
    setIsLoading(false);
  };

  const handleSelectDocument = (id: string) => {
    if (selectedDocuments.includes(id)) {
      setSelectedDocuments(selectedDocuments.filter(docId => docId !== id));
    } else {
      setSelectedDocuments([...selectedDocuments, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map(doc => doc.id));
    }
    setSelectAll(!selectAll);
  };

  const handleDeleteDocument = (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      return;
    }
    
    // In a real app, this would delete from Supabase
    setDocuments(documents.filter(doc => doc.id !== id));
    setSelectedDocuments(selectedDocuments.filter(docId => docId !== id));
  };

  const handleBulkDelete = () => {
    if (selectedDocuments.length === 0) return;
    
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedDocuments.length} document(s) ?`)) {
      return;
    }
    
    // In a real app, this would delete from Supabase
    setDocuments(documents.filter(doc => !selectedDocuments.includes(doc.id)));
    setSelectedDocuments([]);
    setSelectAll(false);
  };

  const exportDocuments = () => {
    const dataToExport = documents.map(doc => ({
      Titre: doc.title,
      Type: doc.type.charAt(0).toUpperCase() + doc.type.slice(1),
      Entreprise: doc.company,
      'Créé le': new Date(doc.created_at).toLocaleDateString(),
      'Créé par': doc.created_by
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
    link.setAttribute('download', 'documents.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(totalDocuments / itemsPerPage);

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'convention':
        return 'Convention';
      case 'attestation':
        return 'Attestation';
      case 'devis':
        return 'Devis';
      case 'facture':
        return 'Facture';
      case 'programme':
        return 'Programme';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'convention':
        return 'bg-blue-100 text-blue-800';
      case 'attestation':
        return 'bg-green-100 text-green-800';
      case 'devis':
        return 'bg-yellow-100 text-yellow-800';
      case 'facture':
        return 'bg-purple-100 text-purple-800';
      case 'programme':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <FileText className="mr-2 h-6 w-6 text-purple-600" />
          Documents
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({totalDocuments})
          </span>
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <FileUp className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
            Importer
          </button>
          
          <button
            onClick={() => setShowGenerator(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Générer un document
          </button>
          
          <button
            onClick={exportDocuments}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
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
            placeholder="Rechercher un document..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative inline-block text-left">
            <div className="flex items-center">
              <Filter className="h-5 w-5 text-gray-400 mr-2" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
              >
                <option value="all">Tous les types</option>
                <option value="convention">Conventions</option>
                <option value="attestation">Attestations</option>
                <option value="devis">Devis</option>
                <option value="facture">Factures</option>
                <option value="programme">Programmes</option>
              </select>
            </div>
          </div>
          
          <div className="relative inline-block text-left">
            <div className="flex items-center">
              <Building2 className="h-5 w-5 text-gray-400 mr-2" />
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
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

      {/* Documents table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {selectedDocuments.length > 0 && (
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 sm:px-6 flex items-center justify-between">
            <span className="text-sm text-gray-700">
              {selectedDocuments.length} document(s) sélectionné(s)
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
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entreprise
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date de création
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Créé par
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 whitespace-nowrap">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    Aucun document trouvé
                  </td>
                </tr>
              ) : (
                documents.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedDocuments.includes(document.id)}
                          onChange={() => handleSelectDocument(document.id)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{document.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDocumentTypeColor(document.type)}`}>
                        {getDocumentTypeLabel(document.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{document.company}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(document.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {document.created_by}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setPreviewDocument(document)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <a
                          href={document.file_url}
                          download
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Download className="h-5 w-5" />
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(document.id)}
                          className="text-red-600 hover:text-red-900"
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
                    {Math.min(currentPage * itemsPerPage, totalDocuments)}
                  </span>{' '}
                  sur <span className="font-medium">{totalDocuments}</span> résultats
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
                          ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
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

      {/* Document Upload Modal */}
      {showAddForm && (
        <DocumentForm
          onSubmit={(documentData) => {
            // In a real app, this would upload to Supabase
            const newDocument = {
              id: Math.random().toString(36).substring(2, 11),
              title: documentData.title,
              type: documentData.type,
              company: documentData.company,
              created_at: new Date().toISOString(),
              created_by: 'Nicolas Cléton',
              file_url: '#'
            };
            setDocuments([newDocument, ...documents]);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
          companies={companies}
        />
      )}

      {/* Document Generator Modal */}
      {showGenerator && (
        <DocumentGenerator
          onGenerate={(documentData) => {
            // In a real app, this would generate a document and save to Supabase
            const newDocument = {
              id: Math.random().toString(36).substring(2, 11),
              title: documentData.title,
              type: documentData.type,
              company: documentData.company,
              created_at: new Date().toISOString(),
              created_by: 'Nicolas Cléton',
              file_url: '#'
            };
            setDocuments([newDocument, ...documents]);
            setShowGenerator(false);
          }}
          onCancel={() => setShowGenerator(false)}
          companies={companies}
        />
      )}

      {/* Document Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-[100] overflow-hidden p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {previewDocument.title}
              </h3>
              <button
                onClick={() => setPreviewDocument(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="bg-white shadow-md rounded-lg p-8 min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aperçu du document non disponible dans cette démo</p>
                  <p className="text-sm text-gray-400 mt-2">Dans une application réelle, le document PDF serait affiché ici</p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Fermer
              </button>
              <a
                href={previewDocument.file_url}
                download
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <Download className="-ml-1 mr-2 h-5 w-5 inline-block" />
                Télécharger
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};