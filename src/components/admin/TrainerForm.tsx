import React, { useState, useEffect } from 'react';
import { X, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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

interface TrainerFormProps {
  trainer: Trainer | null;
  onSubmit: (trainerData: Partial<Trainer>) => void;
  onCancel: () => void;
}

const TrainerForm: React.FC<TrainerFormProps> = ({ trainer, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Trainer>>({
    full_name: '',
    email: '',
    phone: '',
    technical_skills: '',
    qualifications: '',
    professional_experience: '',
    pedagogical_skills: '',
    digital_tools_mastery: '',
    adaptation_capacity: '',
    evaluation_skills: '',
    continuous_improvement: '',
  });
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'cv' | 'profile_picture'>('cv');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (trainer) {
      setFormData({
        full_name: trainer.full_name || '',
        email: trainer.email || '',
        phone: trainer.phone || '',
        technical_skills: trainer.technical_skills || '',
        qualifications: trainer.qualifications || '',
        professional_experience: trainer.professional_experience || '',
        pedagogical_skills: trainer.pedagogical_skills || '',
        digital_tools_mastery: trainer.digital_tools_mastery || '',
        adaptation_capacity: trainer.adaptation_capacity || '',
        evaluation_skills: trainer.evaluation_skills || '',
        continuous_improvement: trainer.continuous_improvement || '',
        cv_url: trainer.cv_url || '',
        profile_picture_url: trainer.profile_picture_url || '',
      });
    }
  }, [trainer]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Effacer l'erreur de validation lorsque l'utilisateur modifie le champ
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: '' });
    }
  };
  
  const handleCvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
    }
  };
  
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePictureFile(file);
      
      // Créer une URL pour prévisualiser l'image
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const uploadCV = async (trainerId: string): Promise<string | null> => {
    if (!cvFile) return null;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadType('cv');
      
      // Générer un nom de fichier unique
      const fileExt = cvFile.name.split('.').pop();
      const fileName = `${trainerId}-${Date.now()}.${fileExt}`;
      
      // Uploader le fichier
      const { data, error } = await supabase.storage
        .from('trainer-cvs')
        .upload(fileName, cvFile, {
          cacheControl: '3600',
          upsert: true,
        });
      
      if (error) throw error;
      
      // Obtenir l'URL publique du fichier
      const { data: { publicUrl } } = supabase.storage
        .from('trainer-cvs')
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (error) {
      console.error('Erreur lors de l\'upload du CV:', error);
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  const uploadProfilePicture = async (trainerId: string): Promise<string | null> => {
    if (!profilePictureFile) return null;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadType('profile_picture');
      
      // Vérifier que le fichier est une image
      if (!profilePictureFile.type.startsWith('image/')) {
        throw new Error('Le fichier doit être une image (JPG, PNG, etc.)');
      }
      
      // Générer un nom de fichier unique
      const fileExt = profilePictureFile.name.split('.').pop();
      const fileName = `${trainerId}-${Date.now()}.${fileExt}`;
      
      // Uploader le fichier
      const { data, error } = await supabase.storage
        .from('trainer-profile-pictures')
        .upload(fileName, profilePictureFile, {
          cacheControl: '3600',
          upsert: true,
        });
      
      if (error) throw error;
      
      // Obtenir l'URL publique du fichier
      const { data: { publicUrl } } = supabase.storage
        .from('trainer-profile-pictures')
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (error) {
      console.error('Erreur lors de l\'upload de la photo de profil:', error);
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.full_name?.trim()) {
      errors.full_name = 'Le nom complet est requis';
    }
    
    if (!formData.email?.trim()) {
      errors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'L\'email n\'est pas valide';
    }
    
    if (!formData.technical_skills?.trim()) {
      errors.technical_skills = 'Les compétences techniques sont requises';
    }
    
    if (!formData.qualifications?.trim()) {
      errors.qualifications = 'Les qualifications sont requises';
    }
    
    if (!formData.professional_experience?.trim()) {
      errors.professional_experience = 'L\'expérience professionnelle est requise';
    }
    
    if (!formData.pedagogical_skills?.trim()) {
      errors.pedagogical_skills = 'Les compétences pédagogiques sont requises';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      let cvUrl = formData.cv_url;
      let profilePictureUrl = formData.profile_picture_url;
      
      // Pour un nouveau formateur, on utilise un ID temporaire pour l'upload
      const tempId = trainer?.id || `temp-${Date.now()}`;
      
      // Si un nouveau fichier CV a été sélectionné, l'uploader
      if (cvFile) {
        const uploadedCvUrl = await uploadCV(tempId);
        // Vérifier si l'URL est null avant de l'assigner
        if (uploadedCvUrl) {
          cvUrl = uploadedCvUrl;
        }
      }
      
      // Si une nouvelle photo de profil a été sélectionnée, l'uploader
      if (profilePictureFile) {
        const uploadedPictureUrl = await uploadProfilePicture(tempId);
        // Vérifier si l'URL est null avant de l'assigner
        if (uploadedPictureUrl) {
          profilePictureUrl = uploadedPictureUrl;
        }
      }
      
      // Préparer les données à soumettre
      const dataToSubmit = {
        ...formData,
        cv_url: cvUrl,
        profile_picture_url: profilePictureUrl,
      };
      
      onSubmit(dataToSubmit);
    } catch (error) {
      console.error('Erreur lors de la soumission du formulaire:', error);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">
          {trainer ? 'Modifier le formateur' : 'Ajouter un formateur'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X size={24} />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
              Nom complet *
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${
                validationErrors.full_name ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {validationErrors.full_name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.full_name}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${
                validationErrors.email ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="profile_picture" className="block text-sm font-medium text-gray-700 mb-1">
              Photo de profil
            </label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                {(previewUrl || formData.profile_picture_url) ? (
                  <img 
                    src={previewUrl || formData.profile_picture_url} 
                    alt="Prévisualisation"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                    {formData.full_name ? formData.full_name.charAt(0).toUpperCase() : 'A'}
                  </div>
                )}
                <label 
                  className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md cursor-pointer"
                  title="Changer la photo de profil"
                >
                  <Camera size={16} className="text-gray-600" />
                  <input 
                    type="file" 
                    id="profile_picture"
                    className="hidden" 
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                  />
                </label>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  Choisissez une photo de profil (JPG, PNG). Taille recommandée : 400x400 pixels.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <label htmlFor="cv" className="block text-sm font-medium text-gray-700 mb-1">
            CV (PDF, DOC, DOCX)
          </label>
          <input
            type="file"
            id="cv"
            accept=".pdf,.doc,.docx"
            onChange={handleCvFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {formData.cv_url && !cvFile && (
            <p className="mt-1 text-sm text-gray-600">
              Un CV est déjà téléchargé. Sélectionnez un nouveau fichier pour le remplacer.
            </p>
          )}
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Compétences et qualifications (Qualiopi)</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="technical_skills" className="block text-sm font-medium text-gray-700 mb-1">
                Compétences techniques dans le domaine de formation concerné *
              </label>
              <textarea
                id="technical_skills"
                name="technical_skills"
                value={formData.technical_skills}
                onChange={handleChange}
                rows={3}
                className={`w-full px-3 py-2 border ${
                  validationErrors.technical_skills ? 'border-red-500' : 'border-gray-300'
                } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Décrivez les compétences techniques du formateur..."
              />
              {validationErrors.technical_skills && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.technical_skills}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="qualifications" className="block text-sm font-medium text-gray-700 mb-1">
                Qualifications professionnelles (diplômes, certifications) *
              </label>
              <textarea
                id="qualifications"
                name="qualifications"
                value={formData.qualifications}
                onChange={handleChange}
                rows={3}
                className={`w-full px-3 py-2 border ${
                  validationErrors.qualifications ? 'border-red-500' : 'border-gray-300'
                } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Listez les diplômes et certifications du formateur..."
              />
              {validationErrors.qualifications && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.qualifications}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="professional_experience" className="block text-sm font-medium text-gray-700 mb-1">
                Expérience professionnelle pertinente dans le domaine enseigné *
              </label>
              <textarea
                id="professional_experience"
                name="professional_experience"
                value={formData.professional_experience}
                onChange={handleChange}
                rows={3}
                className={`w-full px-3 py-2 border ${
                  validationErrors.professional_experience ? 'border-red-500' : 'border-gray-300'
                } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Décrivez l'expérience professionnelle du formateur..."
              />
              {validationErrors.professional_experience && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.professional_experience}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="pedagogical_skills" className="block text-sm font-medium text-gray-700 mb-1">
                Compétences pédagogiques avancées (conception et adaptation des séquences pédagogiques) *
              </label>
              <textarea
                id="pedagogical_skills"
                name="pedagogical_skills"
                value={formData.pedagogical_skills}
                onChange={handleChange}
                rows={3}
                className={`w-full px-3 py-2 border ${
                  validationErrors.pedagogical_skills ? 'border-red-500' : 'border-gray-300'
                } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Décrivez les compétences pédagogiques du formateur..."
              />
              {validationErrors.pedagogical_skills && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.pedagogical_skills}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="digital_tools_mastery" className="block text-sm font-medium text-gray-700 mb-1">
                Maîtrise des outils numériques pour la formation (plateformes LMS, applications interactives)
              </label>
              <textarea
                id="digital_tools_mastery"
                name="digital_tools_mastery"
                value={formData.digital_tools_mastery}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Décrivez la maîtrise des outils numériques du formateur..."
              />
            </div>
            
            <div>
              <label htmlFor="adaptation_capacity" className="block text-sm font-medium text-gray-700 mb-1">
                Capacité d'adaptation aux différents publics, y compris personnes en situation de handicap
              </label>
              <textarea
                id="adaptation_capacity"
                name="adaptation_capacity"
                value={formData.adaptation_capacity}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Décrivez la capacité d'adaptation du formateur..."
              />
            </div>
            
            <div>
              <label htmlFor="evaluation_skills" className="block text-sm font-medium text-gray-700 mb-1">
                Compétences en évaluation des acquis des apprenants
              </label>
              <textarea
                id="evaluation_skills"
                name="evaluation_skills"
                value={formData.evaluation_skills}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Décrivez les compétences en évaluation du formateur..."
              />
            </div>
            
            <div>
              <label htmlFor="continuous_improvement" className="block text-sm font-medium text-gray-700 mb-1">
                Engagement dans une démarche d'amélioration continue
              </label>
              <textarea
                id="continuous_improvement"
                name="continuous_improvement"
                value={formData.continuous_improvement}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Décrivez l'engagement du formateur dans l'amélioration continue..."
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {trainer ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </div>
      </form>
      
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

export { TrainerForm };
export default TrainerForm; 