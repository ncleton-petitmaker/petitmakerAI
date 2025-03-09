@@ .. @@
   const [showQuestionnaire, setShowQuestionnaire] = useState(false);
   const [showProfileManagement, setShowProfileManagement] = useState(false);
   const [refreshTrigger, setRefreshTrigger] = useState(0);
   const [showingDocument, setShowingDocument] = useState(false);
+  const [training, setTraining] = useState<any>(null);
+  const [fetchError, setFetchError] = useState<string | null>(null);
+  const [isRefreshing, setIsRefreshing] = useState(false);
 
   useEffect(() => {
     const fetchUserData = async () => {
      try {
        setLoading(true);
+        setFetchError(null);
+        setIsRefreshing(true);
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

+          // Fetch training data if training_id exists
+          if (profileData.training_id) {
+            console.log("Fetching training data for ID:", profileData.training_id);
+            const { data: trainingData, error: trainingError } = await supabase
+              .from('trainings')
+              .select(`
+                *,
+                companies (
+                  id,
+                  name,
+                  address,
+                  postal_code,
+                  city,
+                  country,
+                  phone,
+                  email,
+                  siret
+                )
+              `)
+              .eq('id', profileData.training_id)
+              .single();

+            if (trainingError) {
+              console.error("Error fetching training data:", trainingError);
+              setFetchError("Erreur lors du chargement des données de formation");
+            } else if (trainingData) {
+              console.log("Training data found:", trainingData);
+              setTraining(trainingData);
+            }
+          }

          // Afficher le questionnaire de positionnement si non complété
          if (!profileData.questionnaire_completed) {
            setShowQuestionnaire(true);
          }
        }
      }
    };
  }, []);
@@ .. @@
                  {!showingDocument && (
                    <TrainingTimeline 
                      questionnaireCompleted={profile?.questionnaire_completed || false} 
+                      training={training}
                      refreshTrigger={refreshTrigger}
                      onDocumentOpen={() => setShowingDocument(true)}
                      onDocumentClose={() => setShowingDocument(false)}
                    />
                  )}
@@ .. @@