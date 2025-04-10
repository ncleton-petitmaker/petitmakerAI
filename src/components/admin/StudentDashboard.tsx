import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { handleSupabaseError } from '../../../utils/supabaseErrorHandler';
import { Helmet } from 'react-helmet';
import { RefreshCw, User, LogOut } from 'react-feather';
import { motion } from 'framer-motion';
import Loader from '../common/Loader';
import TrainingTimeline from './TrainingTimeline';
import UserProfileManagementModal from './UserProfileManagementModal';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showProfileManagement, setShowProfileManagement] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showingDocument, setShowingDocument] = useState(false);
  const [training, setTraining] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setFetchError(null);
        setIsRefreshing(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('No user found');
        }

        // Fetch user profile with training data
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          const errorMessage = handleSupabaseError(profileError);
          throw new Error(errorMessage);
        }

        console.log("Profile data received:", profileData);

        if (profileData) {
          // Vérifier si le profil est complet
          if (!profileData.first_name || !profileData.last_name || !profileData.company) {
            console.log('Profile incomplete, redirecting to profile form');
            navigate('/espace-stagiaires');
            return;
          }

          setProfile(profileData);

          // Fetch training data if training_id exists
          if (profileData.training_id) {
            console.log("Fetching training data for ID:", profileData.training_id);
            const { data: trainingData, error: trainingError } = await supabase
              .from('trainings')
              .select(`
                *,
                training_days,
                companies (
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
              .eq('id', profileData.training_id)
              .single();

            if (trainingError) {
              console.error("Error fetching training data:", trainingError);
              setFetchError("Erreur lors du chargement des données de formation");
            } else if (trainingData) {
              console.log("Training data found:", trainingData);
              setTraining(trainingData);
            }
          }

          // Afficher le questionnaire de positionnement si non complété
          if (!profileData.questionnaire_completed) {
            setShowQuestionnaire(true);
          }
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <Loader className="text-white w-12 h-12 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center text-red-400">
          <p>Erreur de chargement: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center text-gray-400">
          <p>Aucun profil trouvé. Vous allez être redirigé...</p>
        </div>
      </div>
    );
  }
  
  // Ajout d'un log juste avant le rendu de TrainingTimeline
  console.log("🔍 [StudentDashboard RENDER] Passing training data to TrainingTimeline:", training);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-200 p-4 sm:p-8">
      <Helmet>
        <title>Espace Stagiaire - {profile.first_name} {profile.last_name}</title>
      </Helmet>

      {/* Portails pour les modales de documents */}
      <div id="attendance-sheet-portal" className="portal-container"></div>
      <div id="training-agreement-portal" className="portal-container"></div>
      <div id="completion-certificate-portal" className="portal-container"></div>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-4 sm:mb-0">
            Bonjour {profile.first_name}!
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Rafraîchir les données"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowProfileManagement(true)}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors"
              title="Gérer mon profil"
            >
              <User className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-red-700/20 text-red-400 hover:text-red-300 transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-gray-300">Votre parcours de formation</h2>
            
            {fetchError && (
              <div className="mb-4 p-4 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400">
                {fetchError}
              </div>
            )}
            
            {training ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-gray-800/50 p-4 sm:p-6 rounded-xl border border-gray-700 shadow-lg"
              >
                {!showingDocument && (
                  <TrainingTimeline 
                    questionnaireCompleted={profile?.questionnaire_completed || false} 
                    training={training}
                    refreshTrigger={refreshTrigger}
                    onDocumentOpen={() => setShowingDocument(true)}
                    onDocumentClose={() => setShowingDocument(false)}
                  />
                )}
              </motion.div>
            ) : !fetchError && (
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 shadow-lg text-center">
                <Loader className="text-white w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Chargement des informations de la formation...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showProfileManagement && (
        <UserProfileManagementModal
          isOpen={showProfileManagement}
          onClose={() => setShowProfileManagement(false)}
          userId={profile.id}
          onProfileUpdate={() => setRefreshTrigger(prev => prev + 1)} // Rafraîchir après mise à jour
        />
      )}
    </div>
  );
};

export default StudentDashboard;