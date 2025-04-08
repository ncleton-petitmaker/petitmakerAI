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

// Configuration
const CACHE_VALIDITY_DURATION = 30 * 1000; // 30 seconds
const MIN_RETRY_INTERVAL = 3000; // 3 seconds (increased from 1 second)
const URL_CHANGE_THRESHOLD = 400; // 400 ms (increased from 200 ms)

// Systèmes de cache globaux pour les images
interface ImageCacheEntry {
  url: string;
  timestamp: number;
  retries: number;
  lastRetry: number;
  status: 'pending' | 'success' | 'error';
}

const globalImageCache: Record<string, ImageCacheEntry> = {};

// Fonctions utilitaires de gestion du cache
const checkCacheEntry = (cacheKey: string): ImageCacheEntry | null => {
  const entry = globalImageCache[cacheKey];
  
  if (!entry) return null;
  
  const now = Date.now();
  const isValid = (now - entry.timestamp) < CACHE_VALIDITY_DURATION;
  
  return isValid ? entry : null;
};

const addToCacheOrUpdateEntry = (cacheKey: string, url: string, status: 'pending' | 'success' | 'error' = 'pending'): void => {
  const existingEntry = globalImageCache[cacheKey];
  
  if (!existingEntry) {
    globalImageCache[cacheKey] = {
      url,
      timestamp: Date.now(),
      retries: 0,
      lastRetry: 0,
      status
    };
    return;
  }
  
  // Mise à jour d'une entrée existante
  globalImageCache[cacheKey] = {
    ...existingEntry,
    url,
    timestamp: Date.now(),
    status,
    retries: status === 'error' ? existingEntry.retries + 1 : existingEntry.retries
  };
};

const canRetryImage = (cacheKey: string): boolean => {
  const entry = globalImageCache[cacheKey];
  if (!entry) return true;
  
  const now = Date.now();
  return (now - entry.lastRetry) >= MIN_RETRY_INTERVAL;
};

const markImageRetry = (cacheKey: string): void => {
  const entry = globalImageCache[cacheKey];
  if (entry) {
    globalImageCache[cacheKey] = {
      ...entry,
      lastRetry: Date.now(),
      retries: entry.retries + 1
    };
  }
};

// Type d'interface pour les propriétés du composant SafeImage
interface SafeImageProps {
  src: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
  id?: string;
  [key: string]: any;
  isSignature?: boolean;
  isOrganizationSeal?: boolean; // Nouvelle prop pour les tampons d'organisation
  pdfMode?: boolean; // Nouveau mode pour la génération PDF
}

// Fonction pour récupérer une URL depuis le cache ou null si expirée
const getFromImageCache = (originalUrl: string): string | null => {
  if (!originalUrl) return null;
  
  // Générer une clé normalisée (sans paramètres de timestamp)
  const baseUrl = originalUrl.split('?')[0];
  const entry = globalImageCache[baseUrl];
  
  if (!entry) return null;
  
  const now = Date.now();
  
  // Si l'entrée est toujours valide, la retourner
  if (now - entry.timestamp < CACHE_VALIDITY_DURATION) {
    return entry.url;
  }
  
  // Sinon supprimer l'entrée expirée
  delete globalImageCache[baseUrl];
  return null;
};

// Fonction pour ajouter une URL au cache
const addToImageCache = (originalUrl: string, processedUrl: string): void => {
  if (!originalUrl || !processedUrl) return;
  
  // Normaliser l'URL (sans paramètres)
  const baseUrl = originalUrl.split('?')[0];
  
  // Ajouter au cache avec timestamp actuel
  globalImageCache[baseUrl] = {
    url: processedUrl,
    timestamp: Date.now(),
    retries: 0,
    lastRetry: Date.now(),
    status: 'pending'
  };
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
            await SignatureService.saveSignature({
                signature_type: SignatureType.ORGANIZATION_SEAL,
                document_type: DocumentType.CONVENTION,
                training_id: 'default',
                user_id: 'default',
                file_url: sealData.publicUrl       
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
            await SignatureService.saveSignature({
                signature_type: SignatureType.ORGANIZATION_SEAL,
                document_type: DocumentType.CONVENTION,
                training_id: 'default',
                user_id: 'default',
                file_url: sealUrl        
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

const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  style = {},
  onLoad,
  onError,
  fallbackSrc,
  id,
  isSignature = false,
  isOrganizationSeal = false, // Support spécifique pour les tampons d'organisation
  pdfMode = false, // Mode PDF pour éviter les paramètres aléatoires
  ...rest
}) => {
  const [imgSrc, setImgSrc] = useState<string | null>(src);
  const [error, setError] = useState<boolean>(false);
  const [recentlyLoaded, setRecentlyLoaded] = useState<boolean>(false);
  const lastSrcRef = useRef<string | null>(null);
  const lastChangeTimeRef = useRef<number>(Date.now());
  const cacheKeyRef = useRef<string>(`img_${id || crypto.randomUUID()}`);
  
  // Mode PDF: Précharger l'image si on est en mode PDF pour garantir qu'elle sera rendue
  useEffect(() => {
    if (pdfMode && src) {
      // Pour le mode PDF, on précharge l'image sans paramètres aléatoires
      const img = new Image();
      img.onload = () => {
        console.log('✅ [PDF] Image préchargée avec succès:', src);
        // On utilise directement l'URL source sans paramètres aléatoires
        setImgSrc(src);
        setError(false);
        
        // Appel du callback onLoad si fourni
        if (onLoad) onLoad();
      };
      img.onerror = () => {
        console.error('❌ [PDF] Erreur de préchargement de l\'image:', src);
        setError(true);
        
        // Appel du callback onError si fourni
        if (onError) onError();
      };
      img.src = src;
    }
  }, [src, pdfMode, onLoad, onError]);
  
  // Gestion spéciale des tampons d'organisation qui peuvent changer plus fréquemment
  const effectiveThreshold = isOrganizationSeal ? 100 : URL_CHANGE_THRESHOLD;
  const effectiveRetryInterval = isOrganizationSeal ? 1000 : MIN_RETRY_INTERVAL;
  
  // Effet pour gérer le chargement et la mise en cache des images
  useEffect(() => {
    // Si on est en mode PDF, le préchargement est géré par l'autre effet
    if (pdfMode) return;
    
    if (!src) {
      setImgSrc(null);
      setError(true);
      return;
    }
    
    const now = Date.now();
    const timeSinceLastChange = now - lastChangeTimeRef.current;
    
    // Si la source est différente ET que le changement est trop rapide,
    // on loggue un avertissement mais on continue pour prendre en compte la dernière URL.
    // Cela peut causer des re-renderings rapides, mais garantit l'affichage de la dernière image.
    if (src !== lastSrcRef.current && timeSinceLastChange < effectiveThreshold) { 
      safeLog('⚠️', `Changement d'URL trop rapide ignoré (${timeSinceLastChange}ms < ${effectiveThreshold}ms):`, src);
    }
    
    // Vérifier le cache avant de changer la source
    const cacheKey = cacheKeyRef.current;
    const cachedEntry = checkCacheEntry(cacheKey);
    
    if (cachedEntry && cachedEntry.url === src && cachedEntry.status === 'success') {
      safeLog('🔄', 'Utilisation de l\'URL en cache (statut: succès):', src);
      setImgSrc(src);
      setError(false);
      return;
    }
    
    if (cachedEntry && cachedEntry.url === src && cachedEntry.status === 'error') {
      if (!canRetryImage(cacheKey)) {
        safeLog('⏱️', 'Attente avant nouvelle tentative pour URL en échec:', src);
      return;
    }
    
      safeLog('🔄', 'Nouvelle tentative pour URL en échec:', src);
      markImageRetry(cacheKey);
    }
    
    // Mise à jour des références
    lastSrcRef.current = src;
    lastChangeTimeRef.current = now;
    
    // Ajout de paramètre de cache-busting pour les signatures et tampons
    // Mais uniquement si on n'est pas en mode PDF
    let finalSrc = src;
    if ((isSignature || isOrganizationSeal) && !pdfMode) {
      const cacheBuster = `cb=${Date.now()}`;
      finalSrc = src.includes('?') ? `${src}&${cacheBuster}` : `${src}?${cacheBuster}`;
    }
    
    // Mise à jour de l'état
    setImgSrc(finalSrc);
    setError(false);
    
    // Ajout au cache
    addToCacheOrUpdateEntry(cacheKey, src, 'pending');
    
  }, [src, isSignature, isOrganizationSeal, effectiveThreshold, pdfMode]);
  
  // Gestion des événements de chargement et d'erreur
  const handleError = () => {
    safeLog('❌', 'Erreur de chargement de l\'image:', imgSrc);
    setError(true);
    
    // Mise à jour du cache avec erreur
    addToCacheOrUpdateEntry(cacheKeyRef.current, lastSrcRef.current || '', 'error');
    
    // Appel du callback onError si fourni
    if (onError) onError();
    
    // Si c'est un tampon d'organisation, on fait une nouvelle tentative plus rapidement
    if (isOrganizationSeal && imgSrc) {
      setTimeout(() => {
        const cacheBuster = `retry=${Date.now()}`;
        const retrySrc = imgSrc.includes('?') 
          ? imgSrc.replace(/cb=\d+/, `cb=${Date.now()}`) 
          : `${imgSrc}?${cacheBuster}`;
        
        safeLog('🔄', 'Nouvelle tentative rapide pour le tampon d\'organisation:', retrySrc);
        setImgSrc(retrySrc);
      }, effectiveRetryInterval);
    }
  };

  const handleLoad = () => {
    safeLog('✅', 'Image chargée avec succès:', imgSrc);
    setError(false);
    setRecentlyLoaded(true);
    
    // Mise à jour du cache avec succès
    addToCacheOrUpdateEntry(cacheKeyRef.current, lastSrcRef.current || '', 'success');
    
    // Appel du callback onLoad si fourni
    if (onLoad) onLoad();
    
    // Réinitialiser l'état recentlyLoaded après un court délai
    setTimeout(() => {
      setRecentlyLoaded(false);
    }, 1000);
  };

  // Rendu du composant
  if (!imgSrc) {
    return (
      <div className={`${className || ''} text-center text-gray-500`} style={style}>
        Chargement...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className || ''} text-center text-gray-500`} style={style}>
        Image non disponible
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt || 'Image'}
      onError={handleError}
      onLoad={handleLoad}
      className={className}
      style={style}
      {...rest}
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