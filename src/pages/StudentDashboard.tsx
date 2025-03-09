import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { ProfileMenu } from '../components/ProfileMenu';
import { PositioningQuestionnaire } from '../components/PositioningQuestionnaire';
import { ProfileManagement } from '../components/ProfileManagement';
import { TrainingTimeline } from '../components/TrainingTimeline';
import { QuestionnaireList } from '../components/QuestionnaireList';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../lib/supabase';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
  job_position?: string;
  training_start: string | null;
  training_end: string | null;
  progress: number;
  questionnaire_completed: boolean;
  photo_url?: string | null;
  google_photo_url?: string | null;
}

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showProfileManagement, setShowProfileManagement] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showingDocument, setShowingDocument] = useState(false);
  const [training, setTraining] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
        .select('*, training_id')
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
          
        // Fetch training data separately if training_id exists
        if (profileData.training_id) {
          console.log("Fetching training data for ID:", profileData.training_id);
          const { data: trainingData, error: trainingError } = await supabase
            .from('trainings')
            .select(`
              *,
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
        } else {
          // Si l'utilisateur n'a pas de formation assignée, chercher la première formation disponible
          console.log("No training assigned to user, fetching first available training");
          const { data: availableTrainings, error: trainingsError } = await supabase
            .from('trainings')
            .select(`
              *,
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
            .limit(1);

          if (trainingsError) {
            console.error("Error fetching available trainings:", trainingsError);
            setFetchError("Erreur lors du chargement des formations disponibles");
          } else if (availableTrainings && availableTrainings.length > 0) {
            console.log("Using first available training:", availableTrainings[0]);
            setTraining(availableTrainings[0]);
            
            // Mettre à jour le profil de l'utilisateur avec cette formation
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({ training_id: availableTrainings[0].id })
              .eq('id', user.id);
              
            if (updateError) {
              console.error("Error updating user profile with training:", updateError);
            } else {
              console.log("User profile updated with training ID:", availableTrainings[0].id);
              // Mettre à jour le profil local
              setProfile({
                ...profileData,
                training_id: availableTrainings[0].id
              });
            }
          } else {
            console.log("No trainings available");
            setFetchError("Aucune formation disponible");
          }
        }
          
        // Afficher le questionnaire de positionnement si non complété
        if (!profileData.questionnaire_completed) {
          setShowQuestionnaire(true);
        }
      } else {
        // Create a new profile if none exists
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email,
            created_at: new Date().toISOString()
          })
          .select('*')
          .single();

        if (createError) throw createError;
          
        // Rediriger vers le formulaire de profil pour les nouveaux utilisateurs
        console.log('New profile created, redirecting to profile form');
        navigate('/espace-stagiaires');
        return;
      }
    } catch (error) {
      const isConnectionError = error instanceof Error && error.message.includes('Failed to fetch');
      setError(error instanceof Error ? error.message : 'Une erreur est survenue lors du chargement des données.');
      if (!isConnectionError) {
        navigate('/espace-stagiaires');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [navigate]);

  // Ajouter un effet pour rafraîchir périodiquement les données
  useEffect(() => {
    // Rafraîchir les données toutes les 10 secondes
    const intervalId = setInterval(() => {
      console.log("Auto-refreshing dashboard data");
      setRefreshTrigger(prev => prev + 1);
    }, 10000);

    // Nettoyer l'intervalle lorsque le composant est démonté
    return () => clearInterval(intervalId);
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/espace-stagiaires');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Une erreur est survenue lors de la déconnexion.');
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) throw new Error('No profile found');

      setProfile(profileData);
      console.log("Refreshing questionnaire list after profile update");
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Une erreur est survenue lors de la mise à jour du profil.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-gray-400">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <ErrorDisplay
        message={error}
        onRetry={() => {
          setError(null);
          setLoading(true);
          fetchUserData();
        }}
        onBack={() => navigate('/espace-stagiaires')}
        isConnectionError={error.includes('connexion')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link 
                to="/"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-2 text-lg"
              >
                <ArrowLeft className="w-5 h-5" />
                Retour au site
              </Link>
              <h1 className="text-4xl font-bold text-white">Tableau de bord</h1>
            </div>
            {profile && (
              <ProfileMenu 
                profile={profile}
                onSignOut={handleSignOut}
                onProfileUpdate={handleProfileUpdate}
              />
            )}
          </div>

          {/* Main Content */}
          {profile ? (
            <>
              {/* Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Column - Quick Access */}
                <div className="lg:col-span-1">
                  <div className="grid grid-cols-1 gap-4">
                    <Link
                      to="/espace-stagiaires/ressources"
                      className="bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition-colors group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                          <BookOpen className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-white">Ressources</h2>
                          <p className="text-lg text-white">Accéder aux supports de formation</p>
                        </div>
                      </div>
                    </Link>

                    <a
                      href="mailto:nicolas.cleton@petitmaker.fr"
                      className="bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition-colors group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                          <MessageSquare className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-white">Support</h2>
                          <p className="text-lg text-white">Contacter le formateur</p>
                        </div>
                      </div>
                    </a>
                  </div>
                </div>

                {/* Center Column - Timeline */}
                <div className="lg:col-span-3">
                  {!showingDocument && (
                    <TrainingTimeline 
                      questionnaireCompleted={profile?.questionnaire_completed || false} 
                      training={training}
                      refreshTrigger={refreshTrigger}
                      onDocumentOpen={() => {
                        console.log('onDocumentOpen called - hiding timeline');
                        setShowingDocument(true);
                      }}
                      onDocumentClose={() => {
                        console.log('onDocumentClose called - showing timeline');
                        setShowingDocument(false);
                      }}
                    />
                  )}
                  
                  {/* Questionnaire List */}
                  <div className="mt-6">
                    <QuestionnaireList refreshTrigger={refreshTrigger} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-white">
                Une erreur est survenue lors du chargement de votre profil.
                Veuillez vous reconnecter.
              </p>
              <button
                onClick={handleSignOut}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-lg text-white"
              >
                Se reconnecter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showQuestionnaire && (
        <PositioningQuestionnaire 
          onClose={() => {
            setShowQuestionnaire(false);
            setRefreshTrigger(prev => prev + 1);
          }} 
          onSubmitSuccess={handleProfileUpdate}
        />
      )}

      {showProfileManagement && profile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl p-8 max-w-lg w-full">
            <ProfileManagement
              profile={profile}
              onUpdate={() => {
                handleProfileUpdate();
                setShowProfileManagement(false);
              }}
            />
            <button
              onClick={() => setShowProfileManagement(false)}
              className="mt-6 w-full px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};