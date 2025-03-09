// Ce script peut être exécuté dans la console du navigateur pour déboguer fetchTrainers

// Fonction pour tester la récupération des formateurs
async function testFetchTrainers() {
  console.log("Test de récupération des formateurs...");
  
  try {
    // Récupérer l'instance Supabase
    const supabase = window.supabaseClient;
    
    if (!supabase) {
      console.error("Client Supabase non disponible dans la fenêtre");
      return;
    }
    
    console.log("Exécution de la requête pour récupérer les formateurs...");
    
    // Exécuter la requête
    const { data, error } = await supabase
      .from('trainers')
      .select('id, full_name, email')
      .order('full_name', { ascending: true });
    
    if (error) {
      console.error('Erreur lors du chargement des formateurs:', error);
      console.error('Code d\'erreur:', error.code);
      console.error('Message d\'erreur:', error.message);
      console.error('Détails:', error.details);
      return;
    }
    
    console.log("Formateurs récupérés avec succès:", data);
    console.log("Nombre de formateurs récupérés:", data ? data.length : 0);
    
    if (data && data.length > 0) {
      console.log("Premier formateur:", data[0]);
      
      // Afficher tous les formateurs
      data.forEach((trainer, index) => {
        console.log(`Formateur ${index + 1}:`, trainer);
      });
    } else {
      console.warn("Aucun formateur trouvé dans la base de données");
    }
    
    // Vérifier l'utilisateur actuel
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', userError);
    } else {
      console.log('Utilisateur actuel:', userData);
    }
    
    return data;
  } catch (error) {
    console.error('Exception lors du test de récupération des formateurs:', error);
    if (error instanceof Error) {
      console.error('Message d\'erreur:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Exécuter le test
testFetchTrainers().then(trainers => {
  console.log("Test terminé. Résultat final:", trainers);
}); 