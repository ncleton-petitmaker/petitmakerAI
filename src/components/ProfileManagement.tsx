import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Settings, Trash2, Save, X, Mail } from 'lucide-react';
import { ProfilePhoto } from './ProfilePhoto';

interface ProfileManagementProps {
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    company: string;
    job_position?: string;
  };
  onUpdate: () => void;
}

export const ProfileManagement: React.FC<ProfileManagementProps> = ({ profile, onUpdate }) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    company: profile.company || '',
    job_position: profile.job_position || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          company: formData.company,
          job_position: formData.job_position,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onUpdate();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Une erreur est survenue lors de la mise à jour du profil.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRequest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create deletion request
      const { error: requestError } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: user.id,
          processed: false,
          reason: 'Demande de suppression via l\'interface utilisateur'
        });

      if (requestError) throw requestError;

      // Sign out and clear local storage
      await supabase.auth.signOut();
      window.localStorage.clear();

      // Navigate to home page
      navigate('/');
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      // Rediriger vers le support par email si la création de la demande échoue
      window.location.href = 'mailto:nicolas.cleton@petitmaker.fr?subject=Demande de suppression de compte&body=Bonjour, je souhaite supprimer mon compte.';
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold">Gestion du profil</h2>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Modifier
          </button>
        )}
      </div>

      <div className="flex flex-col items-center mb-6">
        <ProfilePhoto userId={profile.id} size="lg" onUpdate={onUpdate} />
        <p className="mt-2 text-sm text-gray-400">Cliquez sur la photo pour la modifier</p>
      </div>

      {isEditing ? (
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label htmlFor="first_name" className="block text-base font-medium text-white mb-2">
              Prénom
            </label>
            <input
              type="text"
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              className="w-full px-4 py-2 text-lg rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="last_name" className="block text-base font-medium text-white mb-2">
              Nom
            </label>
            <input
              type="text"
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              className="w-full px-4 py-2 text-lg rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-base font-medium text-white mb-2">
              Entreprise
            </label>
            <input
              type="text"
              id="company"
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              className="w-full px-4 py-2 text-lg rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="job_position" className="block text-base font-medium text-white mb-2">
              Fonction
            </label>
            <input
              type="text"
              id="job_position"
              value={formData.job_position}
              onChange={(e) => setFormData(prev => ({ ...prev, job_position: e.target.value }))}
              className="w-full px-4 py-2 text-lg rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
            />
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
              disabled={isLoading}
            >
              <Save className="w-5 h-5" />
              {isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-base text-white mb-1">Prénom</p>
            <p className="text-lg font-medium text-white">{profile.first_name || 'Non renseigné'}</p>
          </div>

          <div>
            <p className="text-base text-white mb-1">Nom</p>
            <p className="text-lg font-medium text-white">{profile.last_name || 'Non renseigné'}</p>
          </div>

          <div>
            <p className="text-base text-white mb-1">Entreprise</p>
            <p className="text-lg font-medium text-white">{profile.company || 'Non renseignée'}</p>
          </div>

          <div>
            <p className="text-base text-white mb-1">Fonction</p>
            <p className="text-lg font-medium text-white">{profile.job_position || 'Non renseignée'}</p>
          </div>

          <div className="border-t border-gray-800 pt-6 mt-6">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Supprimer mon compte
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <div className="bg-gray-900 rounded-xl p-8 max-w-md mx-4">
            <h3 className="text-xl font-semibold mb-4">Supprimer votre compte</h3>
            <p className="text-gray-300 mb-6">
              Pour supprimer votre compte, veuillez contacter notre support. Nous traiterons votre demande dans les plus brefs délais.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Annuler
              </button>
              <a
                href="mailto:nicolas.cleton@petitmaker.fr?subject=Demande de suppression de compte&body=Bonjour, je souhaite supprimer mon compte."
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
                onClick={() => {
                  handleDeleteRequest();
                  setShowDeleteConfirm(false);
                }}
              >
                <Mail className="w-5 h-5" />
                Contacter le support
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};