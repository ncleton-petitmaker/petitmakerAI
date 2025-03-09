import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, LogOut } from 'lucide-react';
import { ProfileManagement } from './ProfileManagement';
import { ProfilePhoto } from './ProfilePhoto';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface ProfileMenuProps {
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    company: string;
  };
  onSignOut: () => void;
  onProfileUpdate: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ profile, onSignOut, onProfileUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileManagement, setShowProfileManagement] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local storage
      window.localStorage.removeItem('petitmaker-auth');
      window.localStorage.removeItem('supabase.auth.token');
      
      // Navigate to login page
      navigate('/espace-stagiaires');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Une erreur est survenue lors de la déconnexion.');
    }
  };

  const fullName = `${profile.first_name} ${profile.last_name}`.trim() || 'Utilisateur';

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
        >
          <ProfilePhoto userId={profile.id} size="sm" />
          <span className="hidden md:inline">{fullName}</span>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-lg overflow-hidden z-50"
            >
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowProfileManagement(true);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-800 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Gérer mon profil
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-800 transition-colors text-red-400"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showProfileManagement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-gray-900 rounded-xl p-8 max-w-lg w-full"
            >
              <ProfileManagement
                profile={profile}
                onUpdate={() => {
                  onProfileUpdate();
                  setShowProfileManagement(false);
                }}
              />
              <button
                onClick={() => setShowProfileManagement(false)}
                className="mt-6 w-full px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};