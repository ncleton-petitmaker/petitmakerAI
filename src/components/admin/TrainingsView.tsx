import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Download, 
  Calendar, 
  Building2, 
  Users, 
  FileText,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  MapPin,
  DollarSign,
  CheckCircle2,
  UserPlus,
  X
} from 'lucide-react';
import { LoadingSpinner } from '../LoadingSpinner';
import { useLocation, useNavigate } from 'react-router-dom';
import { TrainingForm } from './TrainingForm';
import { TrainingAgreementButton } from './TrainingAgreementButton';
import { GenericAttendanceSheetButton } from './GenericAttendanceSheetButton';
import { CompletionCertificateButton } from './CompletionCertificateButton';

// Interface pour les formations dans la vue
interface Participant {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    job_position?: string;
    auth_email?: string;
  };
}

interface Training {
  id: string;
  title: string;
  company_id: string | null;
  company_name?: string;
  target_audience: string;
  prerequisites: string;
  duration: string;
  dates: string;
  schedule: string;
  min_participants: number;
  max_participants: number;
  registration_deadline: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  price: number | null;
  objectives: string[];
  content: string;
  evaluation_methods: {
    profile_evaluation: boolean;
    skills_evaluation: boolean;
    knowledge_evaluation: boolean;
    satisfaction_survey: boolean;
  };
  tracking_methods: {
    attendance_sheet: boolean;
    completion_certificate: boolean;
  };
  pedagogical_methods: {
    needs_evaluation: boolean;
    theoretical_content: boolean;
    practical_exercises: boolean;
    case_studies: boolean;
    experience_sharing: boolean;
    digital_support: boolean;
  };
  material_elements: {
    computer_provided: boolean;
    pedagogical_material: boolean;
    digital_support_provided: boolean;
  };
  status: string;
  created_at: string;
  learners?: any[];
  trainer_name?: string;
  participants?: Participant[];
  companies?: {
    id: string;
    name: string;
    address?: string;
    postal_code?: string;
    city?: string;
    country?: string;
    phone?: string;
    email?: string;
    siret?: string;
  };
}

// Interface pour les entreprises
interface Company {
  id: string;
  name: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  siret?: string;
}

// Interface pour les apprenants
interface Learner {
  id: string;
  first_name: string;
  last_name: string;
  job_position?: string;
  auth_email?: string;
}

export const TrainingsView = () => {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [filteredTrainings, setFilteredTrainings] = useState<Training[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAgreementForm, setShowAgreementForm] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isCreatingTables, setIsCreatingTables] = useState(false);
  const [showLearnersModal, setShowLearnersModal] = useState(false);
  const [selectedTrainingLearners, setSelectedTrainingLearners] = useState<Learner[]>([]);
  const [associatingTrainingId, setAssociatingTrainingId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCompanies();
    fetchTrainings();
    fetchLearners();
    
    // Check if we need to open the edit form (redirected from another page)
    if (location.state && location.state.openTrainingEdit && location.state.trainingToEdit) {
      setEditingTraining(location.state.trainingToEdit);
      setShowAddForm(true);
      
      // Clear the state to prevent reopening the form on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location]);

  useEffect(() => {
    filterTrainings();
  }, [searchTerm, statusFilter, trainings]);

  useEffect(() => {
    // Si une formation est sélectionnée pour un accord, récupérer l'entreprise associée
    if (selectedTraining && selectedTraining.company_id) {
      fetchCompanyById(selectedTraining.company_id);
    }
  }, [selectedTraining]);

  const fetchCompanies = async () => {
    try {
      // Vérifier d'abord si la table existe
      const { error: tableCheckError } = await supabase
        .from('companies')
        .select('count')
        .limit(1)
        .single();
      
      if (tableCheckError && tableCheckError.code === '42P01') {
        console.error('Table companies does not exist:', tableCheckError);
        // Créer un tableau vide pour éviter les erreurs dans l'interface
        setCompanies([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, address, postal_code, city, country, phone, email, siret')
        .order('name');
      
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      // Créer un tableau vide pour éviter les erreurs dans l'interface
      setCompanies([]);
    }
  };

  const fetchCompanyById = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, address, postal_code, city, country, phone, email, siret')
        .eq('id', companyId)
        .single();
      
      if (error) throw error;
      setSelectedCompany(data);
    } catch (error) {
      console.error('Error fetching company:', error);
      setSelectedCompany(null);
    }
  };

  const fetchLearners = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, job_position')
        .order('last_name');
      
      if (error) throw error;
      
      // Pour chaque utilisateur, obtenir son email via la fonction RPC
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
      
      setLearners(learnersWithEmail);
    } catch (error) {
      console.error('Error fetching learners:', error);
      // Créer un tableau vide pour éviter les erreurs dans l'interface
      setLearners([]);
    }
  };

  const processObjectives = (objectives: any) => {
    console.log("Traitement des objectifs - Valeur reçue:", objectives);
    console.log("Traitement des objectifs - Type:", typeof objectives);
    
    if (!objectives) {
      console.log("Objectifs non définis, retour tableau avec chaîne vide");
      return [''];
    }
    
    if (Array.isArray(objectives)) {
      console.log("Objectifs déjà sous forme de tableau:", objectives);
      return objectives;
    }
    
    if (typeof objectives === 'string') {
      console.log("Objectifs sous forme de chaîne:", objectives);
      try {
        const parsed = JSON.parse(objectives);
        console.log("Parsing JSON réussi:", parsed);
        return Array.isArray(parsed) ? parsed : [objectives];
      } catch (e) {
        console.log("Échec du parsing JSON, utilisation comme chaîne simple");
        return [objectives];
      }
    }
    
    console.log("Type non géré, conversion en chaîne");
    return [String(objectives)];
  };

  // Fonction pour traiter les champs JSON stockés en chaîne
  const processJsonField = (field: any, defaultValue: any) => {
    if (!field) {
      return defaultValue;
    }
    
    if (typeof field === 'object' && !Array.isArray(field)) {
      return field;
    }
    
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (e) {
        console.error("Erreur lors du parsing JSON:", e);
        return defaultValue;
      }
    }
    
    return defaultValue;
  };

  const fetchTrainings = async () => {
    try {
      console.log('🔍 [DEBUG] Début de fetchTrainings');
      setIsLoading(true);
      setError(null);
      
      // Récupérer toutes les formations avec les informations des entreprises
      console.log('🔍 [DEBUG] Récupération des formations depuis Supabase');
      const { data: trainings, error: trainingsError } = await supabase
        .from('trainings')
        .select(`
          *,
          companies:company_id (
            id,
            name,
            address,
            postal_code,
            city,
            country,
            phone,
            email,
            siret
          )
        `)
        .order('created_at', { ascending: false });
      
      if (trainingsError) {
        console.error('❌ [ERROR] Erreur lors de la récupération des formations:', trainingsError);
        if (trainingsError.code === '42P01') {
          setError('La table des formations n\'existe pas. Veuillez créer les tables nécessaires.');
        } else {
          setError(`Erreur lors de la récupération des formations: ${trainingsError.message}`);
        }
        return;
      }

      console.log('✅ [DEBUG] Formations récupérées:', trainings);

      // Pour chaque formation, récupérer les apprenants associés
      const processedTrainings = await Promise.all(trainings?.map(async (training) => {
        console.log(`🔍 [DEBUG] Récupération des apprenants pour la formation ${training.id}`);
        
        // Récupérer les apprenants pour cette formation qui appartiennent à la même entreprise
        let query = supabase
          .from('user_profiles')
          .select('id, first_name, last_name, job_position')
          .eq('training_id', training.id);
        
        // Si la formation a une entreprise associée, filtrer les apprenants par cette entreprise
        if (training.company_id) {
          query = query.eq('company_id', training.company_id);
        }
        
        const { data: learners, error: learnersError } = await query;

        if (learnersError) {
          console.error(`❌ [ERROR] Erreur lors de la récupération des apprenants pour la formation ${training.id}:`, learnersError);
        } else {
          console.log(`✅ [DEBUG] Apprenants récupérés pour la formation ${training.id}:`, learners);
        }
        
        // Traiter les objectifs et autres champs JSON
        const objectives = processObjectives(training.objectives);
        const evaluation_methods = processJsonField(training.evaluation_methods, {
          profile_evaluation: true,
          skills_evaluation: true,
          knowledge_evaluation: true,
          satisfaction_survey: true
        });
        
        const tracking_methods = processJsonField(training.tracking_methods, {
          attendance_sheet: true,
          completion_certificate: true
        });
        
        const pedagogical_methods = processJsonField(training.pedagogical_methods, {
          needs_evaluation: true,
          theoretical_content: true,
          practical_exercises: true,
          case_studies: true,
          experience_sharing: true,
          digital_support: true
        });
        
        const material_elements = processJsonField(training.material_elements, {
          computer_provided: true,
          pedagogical_material: true,
          digital_support_provided: true
        });
        
        return {
          ...training,
          company_name: training.companies?.name || 'Entreprise non définie',
          objectives,
          evaluation_methods,
          tracking_methods,
          pedagogical_methods,
          material_elements,
          learners: learners || []
        };
      })) || [];
      
      console.log('✅ [DEBUG] Formations traitées:', processedTrainings);
      setTrainings(processedTrainings);
      setFilteredTrainings(processedTrainings);
      
    } catch (error: any) {
      console.error('❌ [ERROR] Erreur lors de la récupération des formations:', error);
      setError(`Une erreur est survenue: ${error.message}`);
    } finally {
      setIsLoading(false);
      console.log('✅ [DEBUG] Fin de fetchTrainings');
    }
  };

  const filterTrainings = () => {
    let filtered = [...trainings];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(training => 
        training.title.toLowerCase().includes(term) || 
        (training.company_name && training.company_name.toLowerCase().includes(term)) ||
        (training.location && training.location.toLowerCase().includes(term))
      );
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(training => training.status === statusFilter);
    }
    
    setFilteredTrainings(filtered);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non défini';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR').format(date);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Nouvelle';
      case 'confirmed': return 'Confirmée';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminée';
      case 'cancelled': return 'Annulée';
      default: return 'Inconnue';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock className="h-3 w-3 mr-1" />;
      case 'confirmed': return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'in_progress': return <Users className="h-3 w-3 mr-1" />;
      case 'completed': return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'cancelled': return <AlertCircle className="h-3 w-3 mr-1" />;
      default: return null;
    }
  };

  const handleAddTraining = async (trainingData: any) => {
    console.log('🔍 [DEBUG] Début de handleAddTraining');
    console.log('🔍 [DEBUG] Données reçues complètes:', trainingData);
    
    try {
      setIsLoading(true);
      
      // Vérifier si la formation existe déjà
      if (trainingData.id) {
        console.log('🔍 [DEBUG] Formation existante, ID:', trainingData.id);
        // Si c'est une mise à jour, on ne continue pas avec la création
        setIsLoading(false);
        return;
      }

      // Créer un objet avec seulement les champs nécessaires
      const trainingToAdd = {
        title: trainingData.title || 'Nouvelle formation',
        company_id: trainingData.company_id,
        trainer_id: trainingData.trainer_id,
        target_audience: trainingData.target_audience || '',
        prerequisites: trainingData.prerequisites || 'Aucun',
        duration: trainingData.duration || '2 jours soit 14h',
        dates: trainingData.dates || 'À définir',
        schedule: trainingData.schedule || 'De 9h à 12h30 et de 13h30 à 17h',
        min_participants: trainingData.min_participants || 1,
        max_participants: trainingData.max_participants || 8,
        registration_deadline: trainingData.registration_deadline || 'Inscription à réaliser 1 mois avant le démarrage de la formation',
        location: trainingData.location || '',
        price: trainingData.price || 0,
        objectives: Array.isArray(trainingData.objectives) ? trainingData.objectives : [],
        content: trainingData.content || '',
        start_date: trainingData.start_date ? new Date(trainingData.start_date).toISOString() : null,
        end_date: trainingData.end_date ? new Date(trainingData.end_date).toISOString() : null,
        evaluation_methods: {
          profile_evaluation: true,
          skills_evaluation: true,
          knowledge_evaluation: true,
          satisfaction_survey: true
        },
        tracking_methods: {
          attendance_sheet: true,
          completion_certificate: true
        },
        pedagogical_methods: {
          needs_evaluation: true,
          theoretical_content: true,
          practical_exercises: true,
          case_studies: true,
          experience_sharing: true,
          digital_support: true
        },
        material_elements: {
          computer_provided: true,
          pedagogical_material: true,
          digital_support_provided: true
        },
        status: trainingData.status || 'draft',
        trainer_name: trainingData.trainer_name || ''
      };
      
      console.log('🔍 [DEBUG] Données préparées pour l\'ajout:', trainingToAdd);

      // Ajouter la formation
      const { data: newTraining, error: insertError } = await supabase
        .from('trainings')
        .insert([trainingToAdd])
        .select()
        .single();

      if (insertError) {
        console.error('❌ [ERROR] Erreur lors de l\'ajout de la formation:', insertError);
        throw new Error(`Erreur lors de l'ajout de la formation: ${insertError.message}`);
      }

      console.log('✅ [DEBUG] Formation ajoutée avec succès:', newTraining);

      // Si une entreprise est spécifiée, associer les apprenants
      if (trainingData.company_id && newTraining?.id) {
        await handleAutoAssociateLearners(newTraining.id, trainingData.company_id);
      }

      // Rafraîchir la liste une seule fois après toutes les opérations
      await fetchTrainings();
      
      // Fermer le formulaire après la création réussie
      setShowAddForm(false);
      
    } catch (error: any) {
      console.error('❌ [ERROR] Erreur dans handleAddTraining:', error);
      alert(`Une erreur est survenue lors de l'ajout de la formation: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTraining = async (trainingData: any) => {
    console.log('🔍 [DEBUG] Début de handleUpdateTraining');
    console.log('🔍 [DEBUG] Données reçues:', trainingData);
    console.log('🔍 [DEBUG] Dates reçues:', {
      start_date: trainingData.start_date,
      end_date: trainingData.end_date
    });
    
    try {
      // Vérifier si le company_id a changé
      let companyChanged = false;
      let originalCompanyId = null;
      
      // Récupérer la formation originale pour comparer le company_id
      if (trainingData.id) {
        const { data: originalTraining, error: originalError } = await supabase
          .from('trainings')
          .select('company_id, start_date, end_date')
          .eq('id', trainingData.id)
          .single();
        
        if (!originalError && originalTraining) {
          originalCompanyId = originalTraining.company_id;
          companyChanged = originalCompanyId !== trainingData.company_id;
          console.log('🔍 [DEBUG] Formation originale:', originalTraining);
        }
      }
      
      // Définir les champs autorisés pour éviter d'envoyer des champs non reconnus
      const allowedFields = [
        'title', 'description', 'dates', 'schedule', 'location', 'price',
        'start_date', 'end_date', 'status', 'company_id', 'metadata',
        'evaluation_methods', 'pedagogical_methods', 'material_elements',
        'trainer_name', 'trainer_id', 'target_audience', 'prerequisites', 'duration',
        'min_participants', 'max_participants', 'registration_deadline',
        'objectives', 'content', 'tracking_methods', 'periods', 'time_slots'
      ];
      
      // Nettoyer les données pour ne garder que les champs autorisés
      const cleanedData: any = {};
      for (const field of allowedFields) {
        if (field in trainingData) {
          if (field === 'start_date' || field === 'end_date') {
            // S'assurer que les dates sont au format ISO
            if (trainingData[field]) {
              try {
                const date = new Date(trainingData[field]);
                cleanedData[field] = date.toISOString();
                console.log(`✅ [DEBUG] Date ${field} formatée:`, cleanedData[field]);
              } catch (error) {
                console.error(`❌ [ERROR] Erreur de format pour ${field}:`, error);
                cleanedData[field] = null;
              }
            } else {
              cleanedData[field] = null;
            }
          } else if (field === 'evaluation_methods' || field === 'pedagogical_methods' || 
              field === 'material_elements' || field === 'tracking_methods') {
            // Si c'est déjà une chaîne JSON, la garder telle quelle
            if (typeof trainingData[field] === 'string') {
              cleanedData[field] = trainingData[field];
            } else {
              // Sinon, convertir en chaîne JSON
              cleanedData[field] = JSON.stringify(trainingData[field]);
            }
          } else if (field === 'objectives') {
            // Gérer les objectifs spécifiquement
            if (Array.isArray(trainingData[field])) {
              cleanedData[field] = trainingData[field];
            } else if (typeof trainingData[field] === 'string') {
              try {
                cleanedData[field] = JSON.parse(trainingData[field]);
              } catch (e) {
                cleanedData[field] = [trainingData[field]];
              }
            } else {
              cleanedData[field] = [String(trainingData[field])];
            }
          } else {
            cleanedData[field] = trainingData[field];
          }
        }
      }

      console.log('🔍 [DEBUG] Données nettoyées avant envoi:', cleanedData);
      console.log('🔍 [DEBUG] Dates finales:', {
        start_date: cleanedData.start_date,
        end_date: cleanedData.end_date
      });
      
      // APPROCHE DIRECTE: Utiliser la fonction RPC pour contourner les problèmes de RLS
      console.log('Tentative de mise à jour via fonction RPC bypass_rls_update_training...');
      const { data: rpcData, error: rpcError } = await supabase.rpc('bypass_rls_update_training', {
        training_data: cleanedData,
        training_id: trainingData.id
      });
      
      if (rpcError) {
        console.error('Erreur lors de la mise à jour via RPC:', rpcError);
        
        // Fallback: Essayer avec l'API standard
        console.log('Tentative de mise à jour via API standard...');
        const { data, error } = await supabase
          .from('trainings')
          .update(cleanedData)
          .eq('id', trainingData.id);
        
        if (error) {
          console.error('Erreur lors de la mise à jour via API standard:', error);
          throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
        }
        
        console.log('Mise à jour réussie via API standard');
      } else {
        console.log('Mise à jour réussie via RPC:', rpcData);
      }
      
      // Rafraîchir la liste des formations et fermer le formulaire
      console.log('Mise à jour réussie, rafraîchissement de la liste...');
      
      // Si l'entreprise a changé, associer automatiquement les apprenants
      if (companyChanged && trainingData.company_id) {
        await handleAutoAssociateLearners(trainingData.id, trainingData.company_id);
      }
      
      await fetchTrainings();
      setShowAddForm(false);
      setSelectedTraining(null);
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      alert(`Erreur lors de la mise à jour: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleDuplicateTraining = async (trainingData: any) => {
    // Check if trainingData exists
    if (!trainingData) {
      console.error('Invalid training data for duplication: training data is null or undefined');
      alert('Données de formation invalides pour la duplication');
      return;
    }
    
    // Log the training data for debugging
    console.log('Training data received for duplication:', JSON.stringify(trainingData));
    
    // Check if ID is empty and handle it specially
    if (!trainingData.id || trainingData.id === '') {
      console.error('Training ID is empty or missing. Cannot duplicate a training without an ID.');
      alert('Impossible de dupliquer une formation sans identifiant. Veuillez sauvegarder la formation avant de la dupliquer.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Create a copy of the training data, excluding the id
      const { id, learners, participants, ...trainingDataToDuplicate } = trainingData;
      
      // Remove the nested companies object if it exists, as it's not a direct column
      delete trainingDataToDuplicate.companies; 
      
      // Also remove other non-column properties like extractedPeriods and extractedTimeSlots if they exist
      delete trainingDataToDuplicate.extractedPeriods;
      delete trainingDataToDuplicate.extractedTimeSlots;
      
      // Explicitement définir company_id à null pour ne pas conserver l'association à l'entreprise
      trainingDataToDuplicate.company_id = null;
      
      // Définir explicitement company_name à null ou une valeur par défaut pour l'affichage
      trainingDataToDuplicate.company_name = null;
      
      // Modify the title to indicate it's a copy
      trainingDataToDuplicate.title = `${trainingDataToDuplicate.title || 'Formation'} (copie)`;
      
      // Réinitialiser les participants_ids à un tableau vide
      trainingDataToDuplicate.participants_ids = [];
      
      console.log('Attempting to duplicate training with data:', trainingDataToDuplicate);
      
      // Insérer la nouvelle formation
      const { data: newTraining, error: trainingError } = await supabase
        .from('trainings')
        .insert(trainingDataToDuplicate)
        .select()
        .single();
      
      if (trainingError) {
        console.error('Supabase error during training duplication:', trainingError);
        throw trainingError;
      }
      
      if (!newTraining) {
        throw new Error('No data returned after training duplication');
      }
      
      // Get company name if needed
      if (newTraining.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('name')
          .eq('id', newTraining.company_id)
          .single();
        
        if (!companyError && companyData) {
          newTraining.company_name = companyData.name;
        }
      }
      
      // IMPORTANT: Ne pas copier les signatures de l'ancienne formation, à l'exception du tampon d'organisme
      console.log('🔍 [DEBUG] Une nouvelle formation a été créée. Nettoyage des signatures...');
      try {
        // 1. Récupérer le tampon d'organisme global depuis settings
        const { data: settings } = await supabase
          .from('settings')
          .select('organization_seal_url, organization_seal_path')
          .single();
          
        // 2. Vérifier si une signature existait pour la formation originale
        const { data: existingSignatures } = await supabase
          .from('documents')
          .select('id, signature_type')
          .eq('training_id', id)
          .in('signature_type', ['participant', 'representative', 'trainer', 'companySeal']);
          
        if (existingSignatures && existingSignatures.length > 0) {
          console.log(`🔒 [INFO] ${existingSignatures.length} signatures trouvées pour la formation d'origine. Elles ne seront PAS copiées.`);
        }
        
        // 3. Seul le tampon d'organisme sera préservé lors de la duplication
        console.log("✅ [SECURITY] Seul le tampon d'organisme de formation sera conservé pour cette nouvelle formation.");
        
        // 4. Si la formation d'origine avait un tampon d'organisme personnalisé (autre que celui des settings), on pourrait le copier ici
        // Mais dans notre cas, on utilisera simplement le tampon global des settings
      } catch (signatureError) {
        console.error('❌ [ERROR] Erreur lors du nettoyage des signatures:', signatureError);
        // Ne pas bloquer le processus si cette partie échoue
      }
      
      // Add the duplicated training to the list
      setTrainings([newTraining, ...trainings]);
      
      // Close the form and open the edit form for the new duplicated training
      setShowAddForm(false);
      setEditingTraining(null);
      
      // Show a success message
      alert('Formation dupliquée avec succès');
      
      // Open the edit form for the new training
      setTimeout(() => {
        setEditingTraining(newTraining);
        setShowAddForm(true);
      }, 100);
      
    } catch (error) {
      console.error('Error duplicating training:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      } else {
        console.error('Unknown error type:', JSON.stringify(error));
      }
      alert('Erreur lors de la duplication de la formation. Veuillez vérifier les logs pour plus de détails.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTraining = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette formation ?')) return;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('trainings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Remove the deleted training from the list
      setTrainings(trainings.filter(training => training.id !== id));
    } catch (error) {
      console.error('Error deleting training:', error);
      alert('Erreur lors de la suppression de la formation');
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour créer les tables manquantes
  const createMissingTables = async () => {
    try {
      setIsCreatingTables(true);
      setError(null);
      
      alert('Pour créer les tables manquantes, veuillez exécuter le script "create_tables_individually.sh" dans un terminal. Une fois terminé, rafraîchissez cette page.');
      
      // Afficher les instructions
      console.log('Instructions pour créer les tables:');
      console.log('1. Ouvrez un terminal');
      console.log('2. Naviguez vers le dossier du projet');
      console.log('3. Exécutez la commande: bash create_tables_individually.sh');
      console.log('4. Une fois terminé, rafraîchissez cette page');
      
    } catch (error: any) {
      console.error('Erreur lors de la création des tables:', error);
      setError(`Erreur lors de la création des tables: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsCreatingTables(false);
    }
  };

  // Fonction pour associer automatiquement tous les apprenants d'une entreprise à une formation
  const handleAutoAssociateLearners = async (trainingId: string, companyId: string) => {
    try {
      console.log('🔍 [DEBUG] Début de handleAutoAssociateLearners');
      console.log(`➡️ [INPUT] trainingId: ${trainingId}`);
      console.log(`➡️ [INPUT] companyId: ${companyId}`);
      
      setAssociatingTrainingId(trainingId);
      
      // Récupérer tous les apprenants de l'entreprise
      console.log(`🔍 [DEBUG] Récupération des apprenants de l'entreprise ${companyId}`);
      const { data: companyLearners, error: learnersError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, company_id')
        .eq('company_id', companyId);
      
      if (learnersError) {
        console.error('❌ [ERROR] Erreur lors de la récupération des apprenants:', learnersError);
        console.error('❌ [ERROR] Détails de l\'erreur:', {
          code: learnersError.code,
          message: learnersError.message,
          details: learnersError.details
        });
        alert('Erreur lors de la récupération des apprenants. Veuillez réessayer.');
        return;
      }
      
      if (!companyLearners || companyLearners.length === 0) {
        console.log('ℹ️ [INFO] Aucun apprenant trouvé pour cette entreprise');
        alert('Aucun apprenant trouvé pour cette entreprise.');
        return;
      }
      
      console.log(`✅ [DEBUG] Apprenants trouvés:`, companyLearners);
      
      // Vérifier d'abord si la requête est correcte en imprimant les IDs
      const learnerIds = companyLearners.map(learner => learner.id);
      console.log(`🔍 [DEBUG] IDs des apprenants à mettre à jour:`, learnerIds);
      
      // Mettre à jour le training_id UNIQUEMENT pour les apprenants de l'entreprise spécifiée
      console.log(`🔍 [DEBUG] Mise à jour du training_id pour les apprenants de l'entreprise ${companyId}`);
      const { data: updatedData, error: updateError } = await supabase
        .from('user_profiles')
        .update({ training_id: trainingId })
        .eq('company_id', companyId)
        .select();
      
      if (updateError) {
        console.error('❌ [ERROR] Erreur lors de la mise à jour des apprenants:', updateError);
        console.error('❌ [ERROR] Détails de l\'erreur:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details
        });
        alert('Erreur lors de l\'association des apprenants. Veuillez réessayer.');
        return;
      }
      
      console.log('✅ [DEBUG] Lignes mises à jour par Supabase:', updatedData);
      console.log(`✅ [DEBUG] Nombre d'apprenants mis à jour: ${updatedData?.length || 0}`);
      
      // Si aucune ligne n'a été mise à jour, vérifier manuellement la condition
      if (!updatedData || updatedData.length === 0) {
        console.log('⚠️ [WARNING] Aucune ligne mise à jour, vérification manuelle...');
        
        // Vérifier si la requête directe fonctionne
        const { data: directQuery, error: directError } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, company_id, training_id')
          .eq('company_id', companyId);
          
        console.log('🔍 [DEBUG] Requête directe pour vérifier les profils:', directQuery);
        
        if (directError) {
          console.error('❌ [ERROR] Erreur lors de la vérification directe:', directError);
        }
      }
      
      // Rafraîchir la liste des formations pour afficher les apprenants associés
      console.log('🔍 [DEBUG] Rafraîchissement de la liste des formations');
      await fetchTrainings();
      
      console.log('✅ [DEBUG] Fin de handleAutoAssociateLearners avec succès');
      alert(`${updatedData?.length || 0} apprenant(s) associé(s) à la formation.`);
    } catch (error) {
      console.error('❌ [ERROR] Erreur lors de l\'association des apprenants:', error);
      if (error instanceof Error) {
        console.error('❌ [ERROR] Stack trace:', error.stack);
      }
      alert('Une erreur est survenue lors de l\'association des apprenants.');
    } finally {
      setAssociatingTrainingId(null);
    }
  };

  // Fonction pour afficher la modal des apprenants
  const handleShowLearners = (training: Training) => {
    if (training.learners && training.learners.length > 0) {
      setSelectedTrainingLearners(training.learners);
      setSelectedTraining(training);
      setShowLearnersModal(true);
    } else {
      alert('Aucun apprenant associé à cette formation.');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Formations</h3>
        <div className="mt-3 sm:mt-0 sm:ml-4">
          <button
            type="button"
            onClick={() => {
              setShowAddForm(true);
              setEditingTraining(null);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle formation
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <input
              type="text"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-10"
              placeholder="Rechercher une formation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <select
            className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="new">Nouvelles</option>
            <option value="confirmed">Confirmées</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminées</option>
            <option value="cancelled">Annulées</option>
          </select>
        </div>
      </div>

      {/* Training list */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={createMissingTables}
              disabled={isCreatingTables}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {isCreatingTables ? 'Création en cours...' : 'Créer les tables manquantes'}
            </button>
          </div>
        ) : filteredTrainings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune formation</h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer une nouvelle formation.
            </p>
            <div className="mt-6">
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingTraining(null);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle formation
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Vue mobile (cartes) */}
            <div className="md:hidden space-y-4 px-4">
              {filteredTrainings.map((training) => (
                <div key={training.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-medium text-gray-900">{training.title}</h3>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(training.status)}`}>
                      {getStatusIcon(training.status)}
                      {getStatusLabel(training.status)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs text-gray-500 mb-3">
                    {training.trainer_name && (
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        <span>Formateur: {training.trainer_name}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Building2 className="h-3 w-3 mr-1" />
                      <span>{training.company_name || 'Entreprise non définie'}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="h-3 w-3 mr-1 text-blue-500" />
                      {training.learners && training.learners.length > 0 ? (
                        <button 
                          onClick={() => handleShowLearners(training)}
                          className="text-blue-600 font-medium hover:underline"
                        >
                          {training.learners.length} apprenant{training.learners.length > 1 ? 's' : ''}
                        </button>
                      ) : (
                        <span className="text-gray-400">Aucun apprenant</span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>
                        {formatDate(training.start_date)}
                        {training.end_date && ` au ${formatDate(training.end_date)}`}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span>{training.location || 'Lieu non défini'}</span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-3 w-3 mr-1" />
                      <span>{training.price ? `${training.price} €` : 'Prix non défini'}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => {
                        setEditingTraining(training);
                        setShowAddForm(true);
                      }}
                      className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Modifier
                    </button>
                    
                    <TrainingAgreementButton 
                      training={training}
                      participants={training.learners || []}
                      buttonText="Convention"
                      variant="outline"
                      className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    />
                    
                    <GenericAttendanceSheetButton 
                      training={training}
                      participants={training.learners || []}
                      buttonText="Émargement"
                      variant="outline"
                      className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    />
                    
                    <CompletionCertificateButton
                      training={training}
                      participants={training.learners || []}
                      buttonText="Attestation"
                      variant="outline"
                      className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    />
                    
                    {training.company_id && (
                      <button
                        onClick={() => handleAutoAssociateLearners(training.id, training.company_id as string)}
                        className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        title="Associer tous les apprenants de l'entreprise à cette formation"
                        disabled={associatingTrainingId === training.id}
                      >
                        {associatingTrainingId === training.id ? (
                          <>
                            <LoadingSpinner size="small" />
                            <span className="ml-1">Association...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3 mr-1 text-green-500" />
                            Associer apprenants
                          </>
                        )}
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeleteTraining(training.id)}
                      className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1 text-red-500" />
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Vue desktop (tableau) */}
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Formation
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entreprise
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lieu
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTrainings.map((training) => (
                    <tr key={training.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{training.title}</div>
                        {training.duration && (
                          <div className="text-sm text-gray-500">{training.duration}</div>
                        )}
                        {training.trainer_name && (
                          <div className="text-sm text-gray-500">Formateur: {training.trainer_name}</div>
                        )}
                        <div className="text-sm text-gray-500 mt-1">
                          <Users className="h-3 w-3 inline mr-1 text-blue-500" />
                          {training.learners && training.learners.length > 0 ? (
                            <button 
                              onClick={() => handleShowLearners(training)}
                              className="text-blue-600 font-medium hover:underline"
                            >
                              {training.learners.length} apprenant{training.learners.length > 1 ? 's' : ''}
                            </button>
                          ) : (
                            <span className="text-gray-400">Aucun apprenant</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{training.company_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{formatDate(training.start_date)}</div>
                        {training.end_date && (
                          <div className="text-sm text-gray-500">au {formatDate(training.end_date)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{training.location || 'Non défini'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(training.status)}`}>
                          {getStatusIcon(training.status)}
                          {getStatusLabel(training.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{training.price ? `${training.price} €` : 'Prix non défini'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setEditingTraining(training);
                              setShowAddForm(true);
                            }}
                            className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Modifier
                          </button>
                          
                          <TrainingAgreementButton 
                            training={training}
                            participants={training.learners || []}
                            buttonText="Convention"
                            variant="outline"
                            className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          />
                          
                          <GenericAttendanceSheetButton 
                            training={training}
                            participants={training.learners || []}
                            buttonText="Émargement"
                            variant="outline"
                            className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          />
                          
                          <CompletionCertificateButton
                            training={training}
                            participants={training.learners || []}
                            buttonText="Attestation"
                            variant="outline"
                            className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          />
                          
                          {training.company_id && (
                            <button
                              onClick={() => handleAutoAssociateLearners(training.id, training.company_id as string)}
                              className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              title="Associer tous les apprenants de l'entreprise à cette formation"
                              disabled={associatingTrainingId === training.id}
                            >
                              {associatingTrainingId === training.id ? (
                                <>
                                  <LoadingSpinner size="small" />
                                  <span className="ml-1">Association...</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-3 w-3 mr-1 text-green-500" />
                                  Associer apprenants
                                </>
                              )}
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteTraining(training.id)}
                            className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Trash2 className="h-3 w-3 mr-1 text-red-500" />
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal pour afficher la liste des apprenants */}
      {showLearnersModal && selectedTraining && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Apprenants associés à la formation
              </h3>
              <button
                onClick={() => setShowLearnersModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-2 text-sm text-gray-500">
              <strong>Formation :</strong> {selectedTraining.title}
            </div>
            
            {selectedTrainingLearners.length > 0 ? (
              <div className="mt-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Poste
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedTrainingLearners.map((learner) => (
                      <tr key={learner.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {learner.first_name} {learner.last_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {learner.job_position || 'Non spécifié'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                Aucun apprenant associé à cette formation.
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowLearnersModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour ajouter/modifier une formation */}
      {showAddForm && (
        <TrainingForm
          training={editingTraining}
          companies={companies}
          onSubmit={editingTraining ? handleUpdateTraining : handleAddTraining}
          onCancel={() => {
            setShowAddForm(false);
            setEditingTraining(null);
          }}
          onDuplicate={handleDuplicateTraining}
        />
      )}
    </div>
  );
};