export interface SignatureCacheEntry {
  participantSig: string | null;
  companySeal: string | null;
  organizationSeal?: string | null;
  timestamp?: number;
}

export class SignatureCache {
  private cache: Map<string, SignatureCacheEntry> = new Map();

  constructor() {
    this.loadFromLocalStorage();
  }

  private getCacheKey(trainingId: string, userId: string): string {
    return `signatureCache_${trainingId}_${userId}`;
  }

  private loadFromLocalStorage(): void {
    try {
      // Parcourir tous les éléments du localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('signatureCache_')) {
          const value = localStorage.getItem(key);
          if (value) {
            const entry = JSON.parse(value) as SignatureCacheEntry;
            this.cache.set(key, entry);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du cache depuis localStorage:', error);
    }
  }

  getCache(trainingId: string, userId: string): SignatureCacheEntry | null {
    const key = this.getCacheKey(trainingId, userId);
    const entry = this.cache.get(key);
    return entry || null;
  }

  getAll(): Record<string, SignatureCacheEntry> {
    const result: Record<string, SignatureCacheEntry> = {};
    this.cache.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  setCache(trainingId: string, userId: string, data: {
    participantSig: string | null;
    companySeal: string | null;
    organizationSeal?: string | null;
    timestamp?: number;
  }): void {
    // Log diagnostique pour vérifier si organizationSeal est présent
    console.log('🔐 [CACHE_SET] Mise à jour du cache avec organizationSeal:', data.organizationSeal ? '✓ Présent' : '✗ Absent');
    
    const key = this.getCacheKey(trainingId, userId);
    const entry: SignatureCacheEntry = {
      participantSig: data.participantSig,
      companySeal: data.companySeal,
      organizationSeal: data.organizationSeal || null,
      timestamp: data.timestamp || Date.now()
    };
    
    // Mise à jour du cache en mémoire
    this.cache.set(key, entry);
    
    // Mise à jour du localStorage
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du cache dans localStorage:', error);
    }
  }

  clearCache(trainingId: string, userId: string): void {
    const key = this.getCacheKey(trainingId, userId);
    this.cache.delete(key);
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Erreur lors de la suppression du cache dans localStorage:', error);
    }
  }
}

// Exporter une instance unique pour toute l'application
export const GLOBAL_SIGNATURE_CACHE = new SignatureCache(); 