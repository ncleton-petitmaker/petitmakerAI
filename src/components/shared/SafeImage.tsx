import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  SignatureService, 
  SignatureResult,
  addCacheBuster,
  validateSealUrl,
  optimizeSealUrl,
  verifyAndOptimizeSignatureUrl,
  optimizeOrganizationSealUrl
} from '../../utils/SignatureUtils';
import { 
  SignatureType, 
  DocumentType 
} from '../../types/SignatureTypes';

// Au début du fichier, après les imports, ajouter le système de cache avec timestamp
// Système de cache global pour les URLs avec timestamp
type ImageCacheEntry = {
  url: string;
  timestamp: number;
  lastAttempt: number;
};

// Cache global pour les URLs d'images traitées avec limites de temps
const GLOBAL_IMAGE_URL_CACHE: Map<string, ImageCacheEntry> = new Map();

// Durée de validité du cache en ms (30 secondes)
const CACHE_VALIDITY_DURATION = 30000;

// Durée minimale entre deux tentatives de chargement de la même image
const MIN_RETRY_INTERVAL = 3000;

// Fonction pour récupérer une URL depuis le cache ou null si expirée
const getFromImageCache = (originalUrl: string): string | null => {
  if (!originalUrl) return null;
  
  // Générer une clé normalisée (sans paramètres de timestamp)
  const baseUrl = originalUrl.split('?')[0];
  const entry = GLOBAL_IMAGE_URL_CACHE.get(baseUrl);
  
  if (!entry) return null;
  
  const now = Date.now();
  
  // Si l'entrée est toujours valide, la retourner
  if (now - entry.timestamp < CACHE_VALIDITY_DURATION) {
    return entry.url;
  }
  
  // Sinon supprimer l'entrée expirée
  GLOBAL_IMAGE_URL_CACHE.delete(baseUrl);
  return null;
};

// Fonction pour ajouter une URL au cache
const addToImageCache = (originalUrl: string, processedUrl: string): void => {
  if (!originalUrl || !processedUrl) return;
  
  // Normaliser l'URL (sans paramètres)
  const baseUrl = originalUrl.split('?')[0];
  
  // Ajouter au cache avec timestamp actuel
  GLOBAL_IMAGE_URL_CACHE.set(baseUrl, {
    url: processedUrl,
    timestamp: Date.now(),
    lastAttempt: Date.now()
  });
};

// Fonction pour vérifier si une nouvelle tentative est autorisée
const canRetryImage = (originalUrl: string): boolean => {
  if (!originalUrl) return true;
  
  const baseUrl = originalUrl.split('?')[0];
  const entry = GLOBAL_IMAGE_URL_CACHE.get(baseUrl);
  
  if (!entry) return true;
  
  const now = Date.now();
  
  // Si la dernière tentative est trop récente, interdire une nouvelle tentative
  if (now - entry.lastAttempt < MIN_RETRY_INTERVAL) {
    return false;
  }
  
  // Mettre à jour le timestamp de dernière tentative
  GLOBAL_IMAGE_URL_CACHE.set(baseUrl, { 
    ...entry,
    lastAttempt: now
  });
  
  return true;
};

// Fonction utilitaire pour désactiver la plupart des logs côté apprenant
function shouldLog(): boolean {
  // Vérifier si nous sommes côté client
  if (typeof window === 'undefined') return true;
  
  // Vérifier l'URL pour déterminer si nous sommes en mode admin/CRM
  const path = window.location.pathname;
  const isAdminOrCRM = path.includes('/admin') || 
                     path.includes('/crm') || 
                     path.includes('/dashboard');
  
  // En développement, toujours logger
  const isDev = process.env.NODE_ENV === 'development';
  
  // Logger seulement en dev ou côté admin/CRM
  return isDev || isAdminOrCRM;
}

// Remplacer les appels console.log par cette fonction pour éviter les logs inutiles
function safeLog(...args: any[]): void {
  if (shouldLog()) {
    console.log(...args);
  }
}

// Remplacer les appels console.error par cette fonction (toujours afficher les erreurs)
function safeError(...args: any[]): void {
  console.error(...args);
}

// Remplacer les appels console.warn par cette fonction
function safeWarn(...args: any[]): void {
  if (shouldLog()) {
    console.warn(...args);
  }
}

// Cache global pour les images déjà chargées avec succès
// Cela permet d'éviter les rechargements inutiles qui causent des clignotements
const loadedImagesCache = new Map<string, boolean>();

interface SafeImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  id?: string;
  onLoad?: () => void;
  onError?: () => void;
  // Pour les signatures et tampons
  signatureType?: SignatureType;
  documentType?: DocumentType;
  trainingId?: string;
  userId?: string;
  companyId?: string;
  // Pour toutes les autres props
  [key: string]: any;
}

/**
 * Extrait le bucket et le chemin du fichier à partir d'une URL Supabase
 * @param url URL Supabase complète
 * @returns Informations sur le bucket et le chemin, ou null si ce n'est pas une URL Supabase
 */
const extractSupabasePath = (url: string): { bucket: string, path: string } | null => {
  try {
    if (!url || !url.includes('supabase.co/storage/v1/object/public/')) return null;
    
    // Nettoyer l'URL des paramètres de requête
    const cleanUrl = url.split('?')[0];
    
    // Format: https://xxx.supabase.co/storage/v1/object/public/BUCKET/PATH
    const parts = cleanUrl.split('/storage/v1/object/public/');
    if (parts.length !== 2) return null;
    
    const pathParts = parts[1].split('/', 1);
    if (pathParts.length === 0) return null;
    
    const bucket = pathParts[0];
    const path = parts[1].substring(bucket.length + 1);
    
    return { bucket, path };
  } catch (error) {
    safeError('Erreur lors de l\'extraction du chemin Supabase:', error);
    return null;
  }
};

/**
 * Version simplifiée pour vérifier l'existence d'un tampon d'organisation
 * @returns Promise<string | null> L'URL du tampon ou null si non trouvé
 */
const getOrganizationSealUrl = async (): Promise<string | null> => {
  try {
    safeLog('🔍', 'Récupération du tampon d\'organisation');
    
    // Utiliser le nouveau service de signatures
    const sealResult = await SignatureService.findSignature({
      training_id: 'default',
      signature_type: SignatureType.ORGANIZATION_SEAL,
      type: DocumentType.CONVENTION
    });
    
    if (sealResult.found) {
      safeLog('✅', 'Tampon d\'organisation trouvé via le service:', sealResult.url);
      const timestamp = Date.now();
      return `${sealResult.url}?t=${timestamp}`;
    }
    
    // Méthode de secours: recherche directe dans le bucket
    safeLog('🔍', 'Recherche du tampon dans le bucket signatures');
    
    const { data: files, error: listError } = await supabase.storage
      .from('signatures')
      .list('', { sortBy: { column: 'created_at', order: 'desc' } });
      
    if (!listError && files && files.length > 0) {
      // Filtrer pour trouver les fichiers de tampon d'organisation
      const sealFiles = files.filter(file => 
        file.name.includes('organization_seal') && !file.name.endsWith('/')
      );
      
      if (sealFiles.length > 0) {
        // Prendre le plus récent (ils sont déjà triés)
        const latestFile = sealFiles[0];
        safeLog('🔍', 'Tampon trouvé dans signatures:', latestFile.name);
        
        // Générer l'URL
        const { data: sealData } = await supabase.storage
          .from('signatures')
          .getPublicUrl(latestFile.name);
          
        if (sealData && sealData.publicUrl) {
          // Ajouter le tampon trouvé au système
          try {
            await SignatureService.saveSignature(
              sealData.publicUrl,
              {
                signature_type: SignatureType.ORGANIZATION_SEAL,
                type: DocumentType.CONVENTION,
                training_id: 'default',
                user_id: 'default',
                signature_data: sealData.publicUrl
              }
            );
            safeLog('✅', 'Tampon d\'organisation migré vers le nouveau système');
          } catch (migrationError) {
            safeLog('⚠️', 'Erreur lors de la migration du tampon:', migrationError);
          }
          
          const timestamp = Date.now();
          const urlWithCacheBuster = `${sealData.publicUrl}?t=${timestamp}`;
          safeLog('✅', 'Tampon d\'organisation obtenu avec succès:', urlWithCacheBuster);
          return urlWithCacheBuster;
        }
      }
    }
    
    // Dernière tentative: rechercher dans les paramètres de l'organisation
    safeLog('🔍', 'Recherche du tampon dans les paramètres de l\'organisation');
    
    const { data: settings, error: settingsError } = await supabase
      .from('organization_settings')
      .select('organization_seal_url, organization_seal_path')
      .limit(1);
    
    if (!settingsError && settings && settings.length > 0 && settings[0].organization_seal_url) {
      const sealUrl = settings[0].organization_seal_url;
      safeLog('🔍', 'Tampon trouvé dans les paramètres:', sealUrl);
      
      // Vérifier que l'URL est accessible
      try {
        const response = await fetch(sealUrl, { method: 'HEAD' });
        if (response.ok) {
          // Ajouter le tampon trouvé au système
          try {
            await SignatureService.saveSignature(
              sealUrl,
              {
                signature_type: SignatureType.ORGANIZATION_SEAL,
                type: DocumentType.CONVENTION,
                training_id: 'default',
                user_id: 'default',
                signature_data: sealUrl
              }
            );
            safeLog('✅', 'Tampon d\'organisation des paramètres migré vers le nouveau système');
          } catch (migrationError) {
            safeLog('⚠️', 'Erreur lors de la migration du tampon des paramètres:', migrationError);
          }
          
          const timestamp = Date.now();
          const urlWithCacheBuster = `${sealUrl}?t=${timestamp}`;
          safeLog('✅', 'Tampon d\'organisation obtenu depuis les paramètres:', urlWithCacheBuster);
          return urlWithCacheBuster;
        }
      } catch (fetchError) {
        safeLog('❌', 'Erreur lors du test d\'accès au tampon:', fetchError);
      }
    }
    
    safeLog('⚠️', 'Aucun tampon d\'organisation trouvé');
    return null;
  } catch (error) {
    safeLog('❌', 'Erreur lors de la récupération du tampon d\'organisation:', error);
    return null;
  }
};

/**
 * Vérifie si un fichier existe dans un bucket Supabase
 * @param bucket Nom du bucket
 * @param path Chemin du fichier dans le bucket
 * @returns Promise<boolean> true si le fichier existe, false sinon
 */
const checkFileExists = async (bucket: string, path: string): Promise<boolean> => {
  try {
    // Nettoyer les paramètres de requête du chemin
    const cleanPath = path.split('?')[0];
    
    // Extraire le nom de fichier du chemin
    const fileName = cleanPath.split('/').pop();
    
    if (!fileName) {
      safeError(`🔍 [DIAGNOSTIC] Nom de fichier invalide dans le chemin: ${path}`);
      return false;
    }
    
    // Obtenir le dossier parent (tout ce qui précède le nom de fichier)
    const folder = cleanPath.substring(0, cleanPath.length - fileName.length) || '';
    
    safeLog(`🔍 [DIAGNOSTIC] Vérification d'existence de ${fileName} dans ${bucket}/${folder}`);
    
    // 1. Essayer d'abord avec list()
    const { data: listData, error: listError } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: 100,
        search: fileName
      });
    
    if (listError) {
      safeError(`🔍 [DIAGNOSTIC] Erreur lors de la recherche avec list():`, listError);
    } else if (listData && listData.length > 0) {
      const fileExists = listData.some(item => item.name === fileName);
      if (fileExists) {
        safeLog(`✅ [DIAGNOSTIC] Fichier ${fileName} trouvé dans ${bucket}/${folder} (méthode list)`);
        return true;
      }
    }
    
    // 2. Si list() échoue ou ne trouve pas le fichier, essayer avec download()
    try {
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(cleanPath);
      
      if (downloadError) {
        safeError(`🔍 [DIAGNOSTIC] Erreur lors de la recherche avec download():`, downloadError);
      } else if (downloadData !== null) {
        safeLog(`✅ [DIAGNOSTIC] Fichier ${fileName} trouvé dans ${bucket}/${folder} (méthode download)`);
        return true;
      }
    } catch (downloadException) {
      safeError(`🔍 [DIAGNOSTIC] Exception lors de la vérification par download:`, downloadException);
    }
    
    // 3. Si c'est un tampon d'organisation, chercher dans le bucket organization-seals
    if (bucket === 'signatures' && (path.includes('organization_seal') || path.includes('organization-seal'))) {
      safeLog(`🔍 [DIAGNOSTIC] Tentative de recherche dans organization-seals`);
      
      try {
        const { data: orgSealsData, error: orgSealsError } = await supabase.storage
          .from('organization-seals')
          .list('', {
            limit: 10
          });
        
        if (orgSealsError) {
          safeError(`🔍 [DIAGNOSTIC] Erreur lors de la recherche dans organization-seals:`, orgSealsError);
        } else if (orgSealsData && orgSealsData.length > 0) {
          safeLog(`✅ [DIAGNOSTIC] Tampon trouvé dans organization-seals:`, orgSealsData[0]);
          return true;
        }
      } catch (orgSealsException) {
        safeError(`🔍 [DIAGNOSTIC] Exception lors de la recherche dans organization-seals:`, orgSealsException);
      }
    }
    
    // 4. Si toutes les méthodes échouent, essayer une dernière fois avec getPublicUrl
    try {
      const { data: urlData } = await supabase.storage
        .from(bucket)
        .getPublicUrl(path);
      
      if (urlData?.publicUrl) {
        // Vérifier si l'URL est accessible
        const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
        if (response.ok) {
          safeLog(`✅ [DIAGNOSTIC] Fichier ${fileName} accessible via getPublicUrl`);
          return true;
        }
      }
    } catch (urlException) {
      safeError(`🔍 [DIAGNOSTIC] Exception lors de la vérification par getPublicUrl:`, urlException);
    }
    
    console.error(`❌ [DIAGNOSTIC] Aucune méthode n'a permis de trouver le fichier ${fileName} dans ${bucket}/${folder}`);
    return false;
    
  } catch (error) {
    console.error(`❌ [DIAGNOSTIC] Exception générale lors de la vérification du fichier:`, error);
    return false;
  }
};

/**
 * Vérifier si une image a du contenu visible ou est potentiellement vide/corrupted
 * @param imageUrl L'URL de l'image à vérifier
 * @returns Promise<boolean> true si l'image semble avoir du contenu, false sinon
 */
const checkImageHasContent = async (imageUrl: string): Promise<boolean> => {
  try {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        // Augmenter le seuil minimum de taille pour considérer une image comme vide
        if (img.width < 5 || img.height < 5) {
          console.warn('🔍 [DIAGNOSTIC] Image détectée comme potentiellement vide (dimensions trop petites):', imageUrl);
          resolve(false);
          return;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.width, 100); // Augmenter la zone d'analyse
        canvas.height = Math.min(img.height, 100);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(true);
          return;
        }
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = imageData.data;
          
          let nonTransparentPixels = 0;
          let totalPixels = pixels.length / 4;
          
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 10) { // Réduire le seuil d'opacité
              nonTransparentPixels++;
            }
          }
          
          // Considérer l'image comme ayant du contenu si au moins 0.5% des pixels sont non transparents
          const hasContent = (nonTransparentPixels / totalPixels) > 0.005;
          
          if (!hasContent) {
            console.warn('🔍 [DIAGNOSTIC] Image détectée comme vide (peu de pixels opaques):', imageUrl);
          }
          
          resolve(hasContent);
        } catch (error) {
          console.error('🔍 [DIAGNOSTIC] Erreur lors de l\'analyse de l\'image:', error);
          resolve(true);
        }
      };
      
      img.onerror = () => {
        console.warn('🔍 [DIAGNOSTIC] Erreur lors du chargement de l\'image pour analyse:', imageUrl);
        resolve(true); // En cas d'erreur, on suppose que l'image est bonne
      };
      
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
    });
  } catch (error) {
    console.error('🔍 [DIAGNOSTIC] Erreur lors de la vérification du contenu de l\'image:', error);
    return true;
  }
};

/**
 * Prépare l'URL de l'image avec vérification et optimisation
 */
const prepareSrcUrl = async (src: string | null | undefined, 
                           signatureType?: SignatureType,
                           documentType?: DocumentType,
                           trainingId?: string,
                           userId?: string,
                           companyId?: string): Promise<string | null> => {
  try {
    // S'assurer que src est string ou null (pas undefined)
    const sourceSrc = src ?? null;
    if (!sourceSrc) return null;
    
    // Vérifier d'abord le cache
    const cachedUrl = getFromImageCache(sourceSrc);
    if (cachedUrl) {
      console.log('📋 [IMAGE] URL trouvée dans le cache:', `${cachedUrl.substring(0, 50)}...`);
      return cachedUrl;
    }
    
    // Si c'est déjà une URL complète, on la retourne avec un paramètre anti-cache
    if (sourceSrc.startsWith('http')) {
      // Optimiser l'URL
      const cleanSrc = sourceSrc.split('?')[0]; // Supprimer tous les paramètres existants
      const timestamp = Date.now();
      const optimizedUrl = `${cleanSrc}?t=${timestamp}&forcereload=true`;
      
      // Ajouter au cache
      addToImageCache(sourceSrc, optimizedUrl);
      
      console.log('✅ [IMAGE] URL préparée pour', `${signatureType || 'image'}:`, optimizedUrl);
      return optimizedUrl;
    }
    
    // Cas pour data:image
    if (sourceSrc.startsWith('data:image')) {
      return sourceSrc; // Pas besoin de modifier cette URL
    }
    
    // Si c'est un chemin relatif, essayer de reconstruire l'URL complète
    if (sourceSrc.startsWith('/')) {
      // ...le reste du code inchangé...
    }
    
    // Rechercher la signature si les paramètres sont fournis
    if (signatureType && documentType) {
      // ...le reste du code inchangé...
    }
    
    // Si aucune des stratégies ci-dessus n'a fonctionné, retourner la source originale
    console.warn('⚠️ [IMAGE] Impossible d\'optimiser l\'URL, utilisation de la source originale:', sourceSrc);
    return sourceSrc;
  } catch (error) {
    console.error('❌ [IMAGE] Erreur lors de la préparation de l\'URL:', error);
    return src ?? null;
  }
};

/**
 * Composant SafeImage amélioré avec gestion des erreurs et optimisations
 */
const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  id,
  onLoad,
  onError,
  signatureType,
  documentType,
  trainingId,
  userId,
  companyId,
  ...props
}) => {
  // État pour stocker l'URL de l'image à afficher
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  // État pour gérer le chargement
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Compteur d'erreurs pour limiter les tentatives
  const [errorCount, setErrorCount] = useState<number>(0);
  // URL finale à afficher après préparation
  const [finalSrc, setFinalSrc] = useState<string | null>(null);
  // État de verrouillage pour éviter les rechargements multiples
  const [imageLocked, setImageLocked] = useState<boolean>(false);
  // Référence pour stocker le timestamp du dernier changement d'URL
  const lastUrlChangeTimestamp = useRef<number>(Date.now());
  // Référence pour stocker le composant démonté
  const unmountedRef = useRef<boolean>(false);

  /**
   * Prépare l'URL de l'image en fonction du contexte
   */
  const prepareImage = async () => {
    if (!src) {
      setFinalSrc(null);
      setIsLoading(false);
      return;
    }
    
    try {
      // Vérifier si on peut réessayer (pour limiter le nombre de tentatives)
      if (!canRetryImage(src)) {
        console.log(`⏱️ [IMAGE] Tentative trop rapide pour ${alt}, ignorée`);
        return;
      }
      
      setIsLoading(true);
      
      // Préparation de l'URL
      const preparedSrc = await prepareSrcUrl(
        src,
        signatureType,
        documentType,
        trainingId,
        userId,
        companyId
      );
      
      // Si l'URL n'a pas changé ou si le composant est démonté, ne rien faire
      if (unmountedRef.current) return;
      
      if (preparedSrc) {
        console.log('✅ [IMAGE] URL préparée pour', `${alt}:`, preparedSrc);
        
        // Vérifier si l'URL a changé depuis la dernière préparation
        if (preparedSrc !== finalSrc) {
          setFinalSrc(preparedSrc);
          setImageUrl(preparedSrc);
        }
      } else {
        console.warn('⚠️ [IMAGE] Impossible de préparer l\'URL pour', alt);
        setFinalSrc(null);
      }
    } catch (error) {
      console.error('❌ [IMAGE] Erreur lors de la préparation de l\'image:', error);
      setFinalSrc(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Vérifie si un tampon existe et tente de trouver une alternative si nécessaire
   */
  const checkSealAndFallback = async (sealUrl: string, type?: SignatureType): Promise<string | null> => {
    try {
      // Extraire le chemin Supabase pour vérifier l'existence du fichier
      const pathInfo = extractSupabasePath(sealUrl);
      
      if (pathInfo) {
        const { bucket, path } = pathInfo;
        
        // Vérifier si le fichier existe
        const exists = await checkFileExists(bucket, path);
        
        if (exists) {
          // Le fichier existe, ajouter un anti-cache
          const timestamp = Date.now();
          return addCacheBuster(sealUrl);
        } else {
          console.warn(`⚠️ [IMAGE] Tampon non trouvé: ${sealUrl}`);
          
          // Si c'est un tampon d'organisation, essayer de trouver une alternative
          if (type === SignatureType.ORGANIZATION_SEAL || sealUrl.includes('organization')) {
            console.log(`🔍 [IMAGE] Recherche d'un tampon d'organisation alternatif`);
            return await getOrganizationSealUrl();
          }
          
          // Pour les autres tampons, essayer d'optimiser l'URL
          if (type === SignatureType.COMPANY_SEAL || sealUrl.includes('company') || sealUrl.includes('seal')) {
            console.log(`🔍 [IMAGE] Tentative d'optimisation du tampon d'entreprise`);
            return optimizeSealUrl(sealUrl);
          }
        }
      }
      
      // Si nous ne pouvons pas vérifier ou le fichier n'existe pas, retourner l'URL d'origine
      return sealUrl;
    } catch (error) {
      console.error(`❌ [IMAGE] Erreur lors de la vérification du tampon:`, error);
      return sealUrl;
    }
  };

  /**
   * Gère les erreurs de chargement d'image
   */
  const handleError = () => {
    // Incrementer le compteur d'erreurs
    const newErrorCount = errorCount + 1;
    setErrorCount(newErrorCount);
    
    console.log('❌', 'Erreur de chargement pour', `${alt} (tentative ${newErrorCount}): ${finalSrc}`);
    
    // Si nous avons moins de 3 tentatives, essayer à nouveau avec une autre stratégie
    if (newErrorCount < 3 && finalSrc) {
      // Si c'est une URL Supabase, tenter d'ajouter un nouveau paramètre anti-cache
      if (finalSrc.includes('supabase.co')) {
        const timestamp = Date.now();
        const newUrl = addCacheBuster(finalSrc);
        console.log('🔄', 'Nouvelle tentative avec URL anti-cache:', newUrl);
        setImageUrl(newUrl);
        setFinalSrc(newUrl);
        lastUrlChangeTimestamp.current = timestamp;
      }
    }
    
    // Appeler le gestionnaire d'erreur externe si fourni
    if (onError) {
      onError();
    }
  };

  /**
   * Gère le chargement réussi de l'image
   */
  const handleLoad = () => {
    console.log('✅', 'Chargement réussi pour', `${alt}: ${finalSrc}`);
    
    // Marquer cette image comme chargée dans le cache global
    if (finalSrc) {
      loadedImagesCache.set(finalSrc, true);
      // Verrouiller l'image pour éviter les rechargements inutiles
      setImageLocked(true);
    }
    
    // Appeler le gestionnaire de chargement externe si fourni
    if (onLoad) {
      onLoad();
    }
  };

  // Effet pour initialiser et nettoyer le composant
  useEffect(() => {
    // Réinitialiser l'état de démontage au montage du composant
    unmountedRef.current = false;
    
    // Nettoyage lors du démontage du composant
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  // Effet pour préparer l'image au chargement initial ou lorsque src change
  useEffect(() => {
    // Si l'image est verrouillée et que l'URL n'a pas changé, ne rien faire
    if (imageLocked && src === finalSrc) {
      return;
    }
    
    // Réinitialiser le verrouillage si la source change
    if (src !== finalSrc) {
      setImageLocked(false);
    }
    
    // Vérifier le cache pour éviter les rechargements inutiles
    if (src) {
      const cachedUrl = getFromImageCache(src);
      if (cachedUrl && cachedUrl === finalSrc) {
        console.log(`🔒 [IMAGE] Utilisation de l'URL en cache pour ${alt}`);
        return;
      }
    }
    
    // Limiter la fréquence des mises à jour pour éviter les clignotements
    const now = Date.now();
    if (now - lastUrlChangeTimestamp.current < 200) {
      console.log(`⏱️ [IMAGE] Modification d'URL trop rapide pour ${alt}, ignorée`);
      return;
    }
    
    // Mettre à jour le timestamp de dernière modification
    lastUrlChangeTimestamp.current = now;
    
    // Préparer l'image
    prepareImage();
  }, [src, signatureType, documentType, trainingId, userId, companyId]);

  // Rendu du composant
  if (isLoading) {
    return <div className={`flex items-center justify-center ${className}`}>Chargement...</div>;
  }

  if (!finalSrc) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="text-gray-400 italic text-sm">Image non disponible</span>
      </div>
    );
  }

  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      id={id}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
};

/**
 * Fonction pour charger directement le tampon d'organisme
 * @returns URL du tampon d'organisme ou null
 */
export const loadOrganizationSealDirectly = async (): Promise<string | null> => {
  try {
    console.log("Searching for organization seal in various sources...");
    
    let sealUrl: string | null = null;
    
    // 1. Vérifier dans le bucket signatures sous le dossier seals
    try {
      const { data: sealsList, error: sealsError } = await supabase.storage
        .from('signatures')
        .list('seals', {
          limit: 10,
          search: 'organization_seal'
        });
        
      if (!sealsError && sealsList && sealsList.length > 0) {
        // Trouver le fichier le plus récent qui correspond au pattern
        const organizationSealFile = sealsList
          .filter(file => file.name.includes('organization_seal'))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        
        if (organizationSealFile) {
          const { data: urlData } = await supabase.storage
            .from('signatures')
            .getPublicUrl(`seals/${organizationSealFile.name}`);
            
          if (urlData && urlData.publicUrl) {
            console.log('✅ Tampon trouvé dans le sous-dossier seals:', urlData.publicUrl);
            sealUrl = urlData.publicUrl;
            return sealUrl;
          }
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la recherche dans le sous-dossier seals:', error);
    }
    
    // 2. Vérifier à la racine du bucket signatures
    try {
      const { data: rootList, error: rootError } = await supabase.storage
        .from('signatures')
        .list('', {
          limit: 100,
          search: 'organization_seal'
        });
        
      if (!rootError && rootList && rootList.length > 0) {
        // Trouver le fichier le plus récent qui correspond au pattern
        const organizationSealFile = rootList
          .filter(file => file.name.includes('organization_seal'))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        
        if (organizationSealFile) {
          const { data: urlData } = await supabase.storage
            .from('signatures')
            .getPublicUrl(organizationSealFile.name);
            
          if (urlData && urlData.publicUrl) {
            console.log('✅ Tampon trouvé dans le bucket signatures:', urlData.publicUrl);
            sealUrl = urlData.publicUrl;
            return sealUrl;
          }
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la recherche à la racine du bucket signatures:', error);
    }
    
    // 3. Vérifier la table document_signatures
    try {
      const { data: sigData, error: sigError } = await supabase
        .from('document_signatures')
        .select('signature_url')
        .eq('signature_type', 'organization')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (!sigError && sigData && sigData.length > 0 && sigData[0].signature_url) {
        console.log('✅ Tampon trouvé dans document_signatures:', sigData[0].signature_url);
        sealUrl = sigData[0].signature_url;
        return sealUrl;
      }
    } catch (error) {
      console.error('❌ Erreur lors de la recherche dans document_signatures:', error);
    }
    
    // 4. En dernier recours, vérifier dans le bucket organization-seals
    try {
      const { data: orgSealsList, error: orgSealsError } = await supabase.storage
        .from('organization-seals')
        .list('', {
          limit: 10
        });
        
      if (!orgSealsError && orgSealsList && orgSealsList.length > 0) {
        // Prendre le premier fichier disponible (ou le plus récent si disponible)
        const sealFile = orgSealsList.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        if (sealFile) {
          const { data: urlData } = await supabase.storage
            .from('organization-seals')
            .getPublicUrl(sealFile.name);
            
          if (urlData && urlData.publicUrl) {
            console.log('✅ Tampon trouvé dans le bucket organization-seals:', urlData.publicUrl);
            sealUrl = urlData.publicUrl;
            return sealUrl;
          }
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la recherche dans le bucket organization-seals:', error);
    }
    
    // 5. En tout dernier recours, vérifier la table system_settings
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'organization_seal_url')
        .single();
      
      if (!settingsError && settingsData && settingsData.value) {
        console.log('✅ Tampon trouvé dans system_settings:', settingsData.value);
        sealUrl = settingsData.value;
        return sealUrl;
      }
    } catch (error) {
      console.error('❌ Erreur lors de la recherche dans system_settings:', error);
    }
    
    // Ajout de la vérification dans le chemin /logos
    try {
      const { data: pathData } = await supabase.storage
        .from('signatures')
        .getPublicUrl('logos/organization_seal.png');
      
      if (pathData && pathData.publicUrl) {
        console.log('✅ Tampon trouvé dans logos/organization_seal.png:', pathData.publicUrl);
        sealUrl = pathData.publicUrl;
        return sealUrl;
      }
    } catch (error) {
      console.error('❌ Erreur lors de la recherche dans le chemin logos:', error);
    }
    
    // Si aucun tampon n'a été trouvé après toutes ces recherches
    console.log('⚠️ Aucun tampon trouvé dans toutes les sources');
    return null;
    
  } catch (error) {
    console.error('❌ Erreur lors de la recherche du tampon:', error);
    return null;
  }
};

export default SafeImage;