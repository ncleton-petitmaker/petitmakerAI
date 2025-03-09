import { useState, useEffect } from 'react';
import { TrainingTimeline } from './TrainingTimeline';
import { supabase } from '../lib/supabase';

export const StudentDashboard = () => {
  const [showingDocument, setShowingDocument] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [training, setTraining] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        const { data: trainingData } = await supabase
          .from('trainings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        setProfile(profileData);
        setTraining(trainingData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [refreshTrigger]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
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
                // Déclencher un rafraîchissement du profil et des questionnaires
                setRefreshTrigger(prev => prev + 1);
              }}
            />
          )}
        </div> 
      </div>
    </div>
  );
}; 