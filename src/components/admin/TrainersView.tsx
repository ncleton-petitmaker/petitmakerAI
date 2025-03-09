import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PlusCircle, Edit, Trash2, Search, X, Upload, Download, ExternalLink, Camera, Eye, EyeOff } from 'lucide-react';
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
  is_public?: boolean;
  created_at: string;
  updated_at: string;
}

interface TrainerFormProps {
  trainer: Trainer | null;
  onSubmit: (trainerData: Partial<Trainer>) => void;
  onCancel: () => void;
}

export const TrainersView = () => {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentTrainer, setCurrentTrainer] = useState<Trainer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadType, setUploadType] = useState<'cv' | 'profile_picture'>('cv');

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;

      setTrainers(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des formateurs:', error);
      setError(error.message || 'Une erreur est survenue lors du chargement des formateurs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTrainer = () => {
    setCurrentTrainer(null);
    setIsFormOpen(true);
  };

  const handleEditTrainer = (trainer: Trainer) => {
    setCurrentTrainer(trainer);
    setIsFormOpen(true);
  };

  const handleDeleteTrainer = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce formateur ?')) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Supprimer le CV du stockage si existant
      const trainer = trainers.find(t => t.id === id);
      if (trainer?.cv_url) {
        const cvPath = trainer.cv_url.split('/').pop();
        if (cvPath) {
          await supabase.storage.from('trainer-cvs').remove([cvPath]);
        }
      }
      
      // Supprimer la photo de profil du stockage si existante
      if (trainer?.profile_picture_url) {
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

      setTrainers(trainers.filter(trainer => trainer.id !== id));
    } catch (error: any) {
      console.error('Erreur lors de la suppression du formateur:', error);
      setError(error.message || 'Une erreur est survenue lors de la suppression du formateur');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (trainerData: Partial<Trainer>) => {
    try {
      setIsLoading(true);
      
      if (currentTrainer) {
        // Mise à jour d'un formateur existant
        const { error } = await supabase
          .from('trainers')
          .update({
            ...trainerData,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentTrainer.id);

        if (error) throw error;
      } else {
        // Création d'un nouveau formateur
        const { error } = await supabase
          .from('trainers')
          .insert({
            ...trainerData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      setIsFormOpen(false);
      fetchTrainers();
    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement du formateur:', error);
      setError(error.message || 'Une erreur est survenue lors de l\'enregistrement du formateur');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadCV = async (trainerId: string, file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadType('cv');
      
      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${trainerId}-${Date.now()}.${fileExt}`;
      
      // Uploader le fichier
      const { data, error } = await supabase.storage
        .from('trainer-cvs')
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
        .from('trainer-cvs')
        .getPublicUrl(fileName);
      
      // Mettre à jour le formateur avec l'URL du CV
      const { error: updateError } = await supabase
        .from('trainers')
        .update({ 
          cv_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', trainerId);
      
      if (updateError) throw updateError;
      
      // Rafraîchir la liste des formateurs
      fetchTrainers();
      
    } catch (error: any) {
      console.error('Erreur lors de l\'upload du CV:', error);
      setError(error.message || 'Une erreur est survenue lors de l\'upload du CV');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUploadProfilePicture = async (trainerId: string, file: File) => {
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
      const fileName = `${trainerId}-${Date.now()}.${fileExt}`;
      
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
        .eq('id', trainerId);
      
      if (updateError) throw updateError;
      
      // Rafraîchir la liste des formateurs
      fetchTrainers();
      
    } catch (error: any) {
      console.error('Erreur lors de l\'upload de la photo de profil:', error);
      setError(error.message || 'Une erreur est survenue lors de l\'upload de la photo de profil');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownloadCV = async (cvUrl: string, trainerName: string) => {
    try {
      // Extraire le nom du fichier de l'URL
      const fileName = cvUrl.split('/').pop() || 'cv.pdf';
      
      // Créer un élément a temporaire pour le téléchargement
      const link = document.createElement('a');
      link.href = cvUrl;
      link.download = `CV_${trainerName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error('Erreur lors du téléchargement du CV:', error);
      setError(error.message || 'Une erreur est survenue lors du téléchargement du CV');
    }
  };

  const handleTogglePublic = async (trainerId: string, currentStatus: boolean | undefined) => {
    try {
      setIsLoading(true);
      
      const newStatus = !currentStatus;
      
      const { error } = await supabase
        .from('trainers')
        .update({ 
          is_public: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', trainerId);
      
      if (error) throw error;
      
      // Mettre à jour l'état local
      setTrainers(trainers.map(trainer => 
        trainer.id === trainerId 
          ? { ...trainer, is_public: newStatus } 
          : trainer
      ));
      
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du statut public:', error);
      setError(error.message || 'Une erreur est survenue lors de la mise à jour du statut public');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTrainers = trainers.filter(trainer => 
    trainer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trainer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fonction pour générer un slug à partir du nom du formateur
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD') // Décomposer les caractères accentués
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-z0-9]+/g, '-') // Remplacer les caractères non alphanumériques par des tirets
      .replace(/^-+|-+$/g, '') // Supprimer les tirets au début et à la fin
      .replace(/-+/g, '-'); // Remplacer les séquences de tirets par un seul tiret
  };

  if (isLoading && trainers.length === 0) {
    return <LoadingSpinner />;
  }

  if (isFormOpen) {
    const TrainerForm = React.lazy(() => import('./TrainerForm').then(module => ({ default: module.TrainerForm })));
    
    return (
      <React.Suspense fallback={<LoadingSpinner />}>
        <TrainerForm 
          trainer={currentTrainer} 
          onSubmit={handleFormSubmit} 
          onCancel={() => setIsFormOpen(false)}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 sm:mb-0">
            Formateurs
          </h2>
          <button
            onClick={handleAddTrainer}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <PlusCircle size={18} className="mr-2" />
            Ajouter un formateur
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher un formateur..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setSearchTerm('')}
            >
              <X size={18} className="text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {filteredTrainers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchTerm 
                ? "Aucun formateur ne correspond à votre recherche." 
                : "Aucun formateur n'a été ajouté. Cliquez sur 'Ajouter un formateur' pour commencer."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrainers.map((trainer) => (
              <div 
                key={trainer.id} 
                className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-5 bg-white">
                  <div className="flex items-center mb-4">
                    <div className="relative mr-4">
                      {trainer.profile_picture_url ? (
                        <img 
                          src={trainer.profile_picture_url} 
                          alt={trainer.full_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                          {trainer.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <label 
                        className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md cursor-pointer"
                        title="Changer la photo de profil"
                      >
                        <Camera size={14} className="text-gray-600" />
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleUploadProfilePicture(trainer.id, e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{trainer.full_name}</h3>
                      <p className="text-sm text-gray-600">{trainer.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Compétences techniques</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{trainer.technical_skills}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Qualifications</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{trainer.qualifications}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Expérience professionnelle</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{trainer.professional_experience}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditTrainer(trainer)}
                        className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                        title="Modifier"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteTrainer(trainer.id)}
                        className="p-2 text-red-600 hover:text-red-800 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => handleTogglePublic(trainer.id, trainer.is_public)}
                        className={`p-2 ${trainer.is_public ? 'text-green-600 hover:text-green-800' : 'text-gray-600 hover:text-gray-800'} transition-colors`}
                        title={trainer.is_public ? "Rendre privé" : "Rendre public"}
                      >
                        {trainer.is_public ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                    
                    <div className="flex space-x-2">
                      {trainer.cv_url ? (
                        <button
                          onClick={() => handleDownloadCV(trainer.cv_url!, trainer.full_name)}
                          className="p-2 text-green-600 hover:text-green-800 transition-colors"
                          title="Télécharger le CV"
                        >
                          <Download size={18} />
                        </button>
                      ) : (
                        <label 
                          className="p-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                          title="Uploader un CV"
                        >
                          <Upload size={18} />
                          <input 
                            type="file" 
                            className="hidden" 
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleUploadCV(trainer.id, e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      )}
                      <a
                        href={`/formateur/${generateSlug(trainer.full_name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-purple-600 hover:text-purple-800 transition-colors"
                        title="Voir le profil public"
                      >
                        <ExternalLink size={18} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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