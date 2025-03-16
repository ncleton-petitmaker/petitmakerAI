/**
 * Utilitaires pour la gestion des signatures
 */

/**
 * Vérifie si une URL d'image est valide en essayant de la charger
 * @param url URL de l'image à vérifier
 * @param timeout Délai maximum d'attente en ms (défaut: 5000ms)
 * @returns Promise<boolean> true si l'image est valide, false sinon
 */
export const isValidImageUrl = (url: string | null | undefined, timeout = 5000): Promise<boolean> => {
  if (!url) return Promise.resolve(false);
  
  return new Promise((resolve) => {
    const img = new Image();
    
    // Timeout pour éviter d'attendre indéfiniment
    const timer = setTimeout(() => {
      console.log(`Timeout atteint pour la validation de l'URL: ${url}`);
      resolve(false);
    }, timeout);
    
    img.onload = () => {
      clearTimeout(timer);
      console.log(`URL d'image valide: ${url}`);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timer);
      console.log(`URL d'image invalide: ${url}`);
      resolve(false);
    };
    
    img.src = url;
  });
};

/**
 * Précharge une liste d'images et retourne celles qui sont valides
 * @param urls Liste des URLs d'images à précharger
 * @param timeout Délai maximum d'attente par image en ms
 * @returns Promise<string[]> Liste des URLs valides
 */
export const preloadImages = async (
  urls: (string | null | undefined)[],
  timeout = 5000
): Promise<string[]> => {
  if (!urls || urls.length === 0) return [];
  
  const validUrls: string[] = [];
  
  // Filtrer les URLs null ou undefined
  const filteredUrls = urls.filter((url): url is string => !!url);
  
  // Vérifier chaque URL en parallèle
  const results = await Promise.all(
    filteredUrls.map(async (url) => {
      const isValid = await isValidImageUrl(url, timeout);
      return { url, isValid };
    })
  );
  
  // Ne garder que les URLs valides
  results.forEach((result) => {
    if (result.isValid) {
      validUrls.push(result.url);
    }
  });
  
  return validUrls;
}; 