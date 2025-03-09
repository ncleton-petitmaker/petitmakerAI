import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Download, Edit, Trash2, Camera } from 'lucide-react';
import { LoadingSpinner } from '../LoadingSpinner';

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
  created_at: string;
  updated_at: string;
}

interface TrainerDetailProps {
  onBack: () => void;
}

export const TrainerDetail: React.FC<TrainerDetailProps> = ({ onBack }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadType, setUploadType] = useState<'cv' | 'profile_picture'>('cv');

  useEffect(() => {
    fetchTrainer();
  }, [id]);

  const fetchTrainer = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setTrainer(data);
    } catch (error: any) {
      console.error('Erreur lors du chargement du formateur:', error);
      setError(error.message || 'Une erreur est survenue lors du chargement du formateur');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    navigate('/admin', { state: { openTrainerEdit: true, trainerId: id } });
  };

  const handleDelete = async () => {
    if (!trainer || !window.confirm('Êtes-vous sûr de vouloir supprimer ce formateur ?')) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Supprimer le CV du stockage si existant
      if (trainer.cv_url) {
        const cvPath = trainer.cv_url.split('/').pop();
        if (cvPath) {
          await supabase.storage.from('trainer-cvs').remove([cvPath]);
        }
      }
      
      // Supprimer la photo de profil du stockage si existante
      if (trainer.profile_picture_url) {
        const picturePath = trainer.profile_picture_url.split('/').pop();
        if (picturePath) {
          await supabase.storage.from('trainer-profile-pictures').remove([picturePath]);
        }
      }
      
      // Supprimer le formateur de la base de données
      const { error } = await supabase
        .from('trainers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      navigate('/admin', { state: { view: 'trainers' } });
    } catch (error: any) {
      console.error('Erreur lors de la suppression du formateur:', error);
      setError(error.message || 'Une erreur est survenue lors de la suppression du formateur');
      setIsLoading(false);
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

  const handleUploadProfilePicture = async (file: File) => {
    if (!id || !file) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadType('profile_picture');
      
      // Vérifier que le fichier est une image
      if (!file.type.startsWith('image/')) {
        throw new Error('Le fichier doit être une image (JPG, PNG, etc.)');
      }
      
      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}-${Date.now()}.${fileExt}`;
      
      // Uploader le fichier
      const { data, error } = await supabase.storage
        .from('trainer-profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          // Utiliser un gestionnaire d'événements pour suivre la progression
          onUploadProgress: (event: { loaded: number; total: number }) => {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        } as any); // Utiliser 'as any' pour éviter l'erreur de type
      
      if (error) throw error;
      
      // Obtenir l'URL publique du fichier
      const { data: { publicUrl } } = supabase.storage
        .from('trainer-profile-pictures')
        .getPublicUrl(fileName);
      
      // Mettre à jour le formateur avec l'URL de la photo de profil
      const { error: updateError } = await supabase
        .from('trainers')
        .update({ 
          profile_picture_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      // Rafraîchir les données du formateur
      fetchTrainer();
      
    } catch (error: any) {
      console.error('Erreur lors de l\'upload de la photo de profil:', error);
      setError(error.message || 'Une erreur est survenue lors de l\'upload de la photo de profil');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
        <span className="block sm:inline">{error}</span>
        <button 
          className="absolute top-0 bottom-0 right-0 px-4 py-3"
          onClick={() => setError(null)}
        >
          <span className="sr-only">Fermer</span>
          <span className="text-2xl">&times;</span>
        </button>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Formateur non trouvé.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Retour
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <Edit size={16} className="mr-2" />
              Modifier
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
            >
              <Trash2 size={16} className="mr-2" />
              Supprimer
            </button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-start">
          <div className="md:w-1/3 mb-6 md:mb-0 md:pr-6">
            <div className="bg-gray-100 p-6 rounded-lg">
              <div className="flex flex-col items-center mb-4">
                <div className="relative mb-4">
                  {trainer.profile_picture_url ? (
                    <img 
                      src={trainer.profile_picture_url} 
                      alt={trainer.full_name}
                      className="w-32 h-32 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-4xl">
                      {trainer.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <label 
                    className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md cursor-pointer"
                    title="Changer la photo de profil"
                  >
                    <Camera size={18} className="text-gray-600" />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadProfilePicture(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 text-center">{trainer.full_name}</h1>
                <p className="text-gray-600 mb-2 text-center">{trainer.email}</p>
                {trainer.phone && <p className="text-gray-600 mb-4 text-center">Tél: {trainer.phone}</p>}
              </div>
              
              {trainer.cv_url && (
                <button
                  onClick={handleDownloadCV}
                  className="flex items-center justify-center w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Download size={16} className="mr-2" />
                  Télécharger le CV
                </button>
              )}
              
              <div className="mt-4 text-sm text-gray-500 text-center">
                <p>Dernière mise à jour: {new Date(trainer.updated_at).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          </div>
          
          <div className="md:w-2/3">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Profil Qualiopi</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Compétences techniques</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-gray-800 whitespace-pre-line">{trainer.technical_skills}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Qualifications professionnelles</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-gray-800 whitespace-pre-line">{trainer.qualifications}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Expérience professionnelle</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-gray-800 whitespace-pre-line">{trainer.professional_experience}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Compétences pédagogiques</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-gray-800 whitespace-pre-line">{trainer.pedagogical_skills}</p>
                </div>
              </div>
              
              {trainer.digital_tools_mastery && (
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Maîtrise des outils numériques</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-gray-800 whitespace-pre-line">{trainer.digital_tools_mastery}</p>
                  </div>
                </div>
              )}
              
              {trainer.adaptation_capacity && (
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Capacité d'adaptation</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-gray-800 whitespace-pre-line">{trainer.adaptation_capacity}</p>
                  </div>
                </div>
              )}
              
              {trainer.evaluation_skills && (
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Compétences en évaluation</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-gray-800 whitespace-pre-line">{trainer.evaluation_skills}</p>
                  </div>
                </div>
              )}
              
              {trainer.continuous_improvement && (
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Démarche d'amélioration continue</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-gray-800 whitespace-pre-line">{trainer.continuous_improvement}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h3 className="text-lg font-semibold mb-4">
              {uploadType === 'cv' ? 'Upload du CV en cours...' : 'Upload de la photo en cours...'}
            </h3>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-center mt-2">{uploadProgress}%</p>
          </div>
        </div>
      )}
    </div>
  );
}; 