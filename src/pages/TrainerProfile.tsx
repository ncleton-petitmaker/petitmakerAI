import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Eye, EyeOff, ArrowLeft, Download } from 'lucide-react';

interface Trainer {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  technical_skills: string;
  qualifications: string;
  professional_experience: string;
  pedagogical_skills: string;
  digital_tools_mastery: string;
  adaptation_capacity: string;
  evaluation_skills: string;
  continuous_improvement: string;
  cv_url?: string;
  profile_picture_url?: string;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
}

export const TrainerProfile = () => {
  // Le paramètre id contient maintenant le slug du formateur (son nom)
  const { id: trainerSlug } = useParams<{ id: string }>();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (trainerSlug) {
      initializeProfile();
    } else {
      setError("Identifiant de formateur invalide");
      setIsLoading(false);
    }
  }, [trainerSlug]);

  // Effet pour gérer le style CSS pour masquer le bouton "L'espace des stagiaires" pour les administrateurs
  useEffect(() => {
    if (isAdmin) {
      // Créer une feuille de style dynamique
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        a[href="/espace-stagiaires"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
      styleElement.id = 'admin-styles';
      document.head.appendChild(styleElement);
      
      // Nettoyer la feuille de style lors du démontage du composant
      return () => {
        const existingStyle = document.getElementById('admin-styles');
        if (existingStyle) {
          document.head.removeChild(existingStyle);
        }
      };
    }
  }, [isAdmin]);

  // Fonction pour initialiser le profil
  const initializeProfile = async () => {
    try {
      setIsLoading(true);
      
      // Vérifier d'abord si l'utilisateur est admin
      const adminStatus = await checkAdminStatus();
      
      // Ensuite, récupérer le formateur
      if (trainerSlug) {
        await fetchTrainerBySlug(trainerSlug, adminStatus);
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'initialisation du profil:', error);
      setError(error.message || 'Une erreur est survenue lors de l\'initialisation du profil');
      setIsLoading(false);
    }
  };

  // Fonction pour normaliser un slug (pour la comparaison)
  const normalizeSlug = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  };

  const fetchTrainerBySlug = async (slug: string, isUserAdmin: boolean) => {
    try {
      setError(null);

      // Récupérer tous les formateurs
      const { data, error } = await supabase
        .from('trainers')
        .select('*');

      if (error) throw error;

      if (!data || data.length === 0) {
        setError('Aucun formateur trouvé.');
        setTrainer(null);
        return;
      }

      // Trouver le formateur dont le nom correspond au slug
      const normalizedSlug = normalizeSlug(slug);
      const matchedTrainer = data.find(t => normalizeSlug(t.full_name) === normalizedSlug);

      if (!matchedTrainer) {
        setError('Formateur non trouvé.');
        setTrainer(null);
        return;
      }

      // Si le formateur n'est pas public et que l'utilisateur n'est pas admin, afficher une erreur
      if (!matchedTrainer.is_public && !isUserAdmin) {
        setError('Ce profil de formateur n\'est pas public.');
        setTrainer(null);
      } else {
        setTrainer(matchedTrainer);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement du formateur:', error);
      setError(error.message || 'Une erreur est survenue lors du chargement du formateur');
    } finally {
      setIsLoading(false);
    }
  };

  const checkAdminStatus = async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAdmin(false);
        return false;
      }
      
      // Vérifier si l'utilisateur est admin
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();
      
      if (error) throw error;
      
      const isUserAdmin = !!data?.is_admin;
      setIsAdmin(isUserAdmin);
      return isUserAdmin;
    } catch (error) {
      console.error('Erreur lors de la vérification du statut admin:', error);
      setIsAdmin(false);
      return false;
    }
  };

  const togglePublicStatus = async () => {
    if (!trainer || !isAdmin) return;
    
    try {
      setIsUpdating(true);
      
      const newPublicStatus = !trainer.is_public;
      
      const { error } = await supabase
        .from('trainers')
        .update({ 
          is_public: newPublicStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', trainer.id);
      
      if (error) throw error;
      
      setTrainer({
        ...trainer,
        is_public: newPublicStatus
      });
      
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du statut public:', error);
      setError(error.message || 'Une erreur est survenue lors de la mise à jour du statut public');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadCV = async () => {
    if (!trainer?.cv_url) return;
    
    try {
      // Extraire le nom du fichier de l'URL
      const fileName = trainer.cv_url.split('/').pop() || 'cv.pdf';
      
      // Créer un élément a temporaire pour le téléchargement
      const link = document.createElement('a');
      link.href = trainer.cv_url;
      link.download = `CV_${trainer.full_name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error('Erreur lors du téléchargement du CV:', error);
      setError(error.message || 'Une erreur est survenue lors du téléchargement du CV');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
        <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
          <ArrowLeft size={20} className="mr-2" />
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-8">
          <p className="text-gray-500">Formateur non trouvé.</p>
          <Link to="/" className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            <ArrowLeft size={20} className="mr-2" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Barre d'administration (visible uniquement pour les admins) */}
      {isAdmin && (
        <div className="bg-gray-800 text-white py-2 px-4 relative z-10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center">
              <span className="font-medium">Mode administrateur</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="mr-2">Statut:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${trainer?.is_public ? 'bg-green-600' : 'bg-red-600'}`}>
                  {trainer?.is_public ? 'Public' : 'Privé'}
                </span>
              </div>
              <button
                onClick={togglePublicStatus}
                disabled={isUpdating}
                className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors disabled:opacity-50"
              >
                {trainer?.is_public ? (
                  <>
                    <EyeOff size={16} className="mr-1" />
                    Rendre privé
                  </>
                ) : (
                  <>
                    <Eye size={16} className="mr-1" />
                    Rendre public
                  </>
                )}
              </button>
              <Link
                to="/admin"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Retour à l'administration
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            <ArrowLeft size={20} className="mr-2" />
            Retour à l'accueil
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-start">
              {/* Colonne de gauche - Informations personnelles */}
              <div className="md:w-1/3 mb-6 md:mb-0 md:pr-6">
                <div className="flex flex-col items-center mb-6">
                  {trainer.profile_picture_url ? (
                    <img 
                      src={trainer.profile_picture_url} 
                      alt={trainer.full_name}
                      className="w-40 h-40 rounded-full object-cover mb-4"
                    />
                  ) : (
                    <div className="w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-5xl mb-4">
                      {trainer.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <h1 className="text-3xl font-bold text-gray-800 text-center">{trainer.full_name}</h1>
                  <p className="text-gray-600 mt-2 text-center">Formateur professionnel</p>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Coordonnées</h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-gray-800">{trainer.email}</p>
                    </div>
                    {trainer.phone && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Téléphone</p>
                        <p className="text-gray-800">{trainer.phone}</p>
                      </div>
                    )}
                  </div>

                  {trainer.cv_url && (
                    <button
                      onClick={handleDownloadCV}
                      className="mt-6 w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Download size={16} className="mr-2" />
                      Télécharger le CV
                    </button>
                  )}
                </div>
              </div>

              {/* Colonne de droite - Compétences et qualifications */}
              <div className="md:w-2/3">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Profil professionnel</h2>
                
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-medium text-gray-700 mb-3">Compétences techniques</h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-gray-800 whitespace-pre-line">{trainer.technical_skills}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-gray-700 mb-3">Qualifications professionnelles</h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-gray-800 whitespace-pre-line">{trainer.qualifications}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-gray-700 mb-3">Expérience professionnelle</h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-gray-800 whitespace-pre-line">{trainer.professional_experience}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-gray-700 mb-3">Compétences pédagogiques</h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-gray-800 whitespace-pre-line">{trainer.pedagogical_skills}</p>
                    </div>
                  </div>
                  
                  {trainer.digital_tools_mastery && (
                    <div>
                      <h3 className="text-xl font-medium text-gray-700 mb-3">Maîtrise des outils numériques</h3>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <p className="text-gray-800 whitespace-pre-line">{trainer.digital_tools_mastery}</p>
                      </div>
                    </div>
                  )}
                  
                  {trainer.adaptation_capacity && (
                    <div>
                      <h3 className="text-xl font-medium text-gray-700 mb-3">Capacité d'adaptation</h3>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <p className="text-gray-800 whitespace-pre-line">{trainer.adaptation_capacity}</p>
                      </div>
                    </div>
                  )}
                  
                  {trainer.evaluation_skills && (
                    <div>
                      <h3 className="text-xl font-medium text-gray-700 mb-3">Compétences en évaluation</h3>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <p className="text-gray-800 whitespace-pre-line">{trainer.evaluation_skills}</p>
                      </div>
                    </div>
                  )}
                  
                  {trainer.continuous_improvement && (
                    <div>
                      <h3 className="text-xl font-medium text-gray-700 mb-3">Démarche d'amélioration continue</h3>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <p className="text-gray-800 whitespace-pre-line">{trainer.continuous_improvement}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 