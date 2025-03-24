/**
 * Utilitaire de gestion des logs avec filtrage par contexte
 * 
 * Ce fichier permet de gérer les logs de manière conditionnelle:
 * - Affiche tous les logs côté CRM/admin
 * - Affiche seulement les erreurs critiques côté apprenant
 */

// Niveaux de log - du plus critique au plus détaillé
export const LOG_LEVELS = {
  ERROR: 0,   // Erreurs critiques uniquement
  WARN: 1,    // Avertissements importants
  INFO: 2,    // Informations essentielles
  DEBUG: 3,   // Informations de débogage détaillées
  VERBOSE: 4  // Logs très détaillés
};

// Niveau de log actuel - modifier cette valeur pour voir plus ou moins de logs
export const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;

/**
 * Détermine si le contexte actuel est CRM/admin ou apprenant
 * @returns {boolean} true si admin/CRM, false si apprenant
 */
export const isAdminOrCRM = (): boolean => {
  // Vérifier si nous sommes en mode admin/CRM vs étudiant
  const isClientSide = typeof window !== 'undefined';
  if (!isClientSide) return true; // Par défaut en mode admin si SSR
  
  // Vérifier l'URL pour déterminer si nous sommes en mode admin/CRM
  const path = window.location.pathname;
  const isAdmin = path.includes('/admin') || 
                path.includes('/crm') || 
                path.includes('/dashboard');
  return isAdmin;
};

/**
 * Journalise un message de façon conditionnelle selon le contexte et le niveau
 * @param level Niveau de log (ERROR, WARN, INFO, DEBUG, VERBOSE)
 * @param type Type de message pour le regroupement visuel
 * @param message Message principal à afficher
 * @param data Données optionnelles à journaliser (automatiquement converti en JSON si objet)
 */
export const conditionalLog = (level: number, type: string, message: string, data?: any): void => {
  // Déterminer si nous sommes en mode développement ou en mode CRM
  const shouldLog = isAdminOrCRM() || level <= LOG_LEVELS.ERROR;
  
  // Ne pas afficher les logs en mode étudiant sauf si ce sont des erreurs critiques
  if (!shouldLog) {
    return;
  }
  
  // Si le niveau est suffisant pour le log actuel
  if (level <= CURRENT_LOG_LEVEL) {
    if (data !== undefined) {
      // Convertir automatiquement les objets en chaînes JSON pour éviter les erreurs de type
      if (typeof data === 'object' && data !== null) {
        try {
          const jsonData = JSON.stringify(data);
          console.log(`${type} ${message}`, jsonData);
        } catch (error) {
          // En cas d'erreur de conversion JSON, utiliser toString()
          console.log(`${type} ${message}`, String(data));
        }
      } else {
        // Données primitives
        console.log(`${type} ${message}`, data);
      }
    } else {
      console.log(`${type} ${message}`);
    }
  }
};

// Fonctions d'aide pour les différents niveaux de log
export const logError = (type: string, message: string, data?: any): void => 
  conditionalLog(LOG_LEVELS.ERROR, `❌ [${type}]`, message, data);

export const logWarn = (type: string, message: string, data?: any): void => 
  conditionalLog(LOG_LEVELS.WARN, `⚠️ [${type}]`, message, data);

export const logInfo = (type: string, message: string, data?: any): void => 
  conditionalLog(LOG_LEVELS.INFO, `ℹ️ [${type}]`, message, data);

export const logDebug = (type: string, message: string, data?: any): void => 
  conditionalLog(LOG_LEVELS.DEBUG, `🔍 [${type}]`, message, data);

export const logVerbose = (type: string, message: string, data?: any): void => 
  conditionalLog(LOG_LEVELS.VERBOSE, `🔎 [${type}]`, message, data); 