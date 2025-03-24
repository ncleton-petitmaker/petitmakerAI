/**
 * Hook pour la gestion des signatures
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  DocumentType, 
  SignatureType,
  SignatureSearchOptions,
  SignatureSaveOptions 
} from '../types/SignatureTypes';
import { SignatureService, SignatureResult } from '../utils/SignatureUtils';

export interface UseSignatureProps {
  trainingId?: string;
  userId?: string;
  documentType?: DocumentType;
  signatureType?: SignatureType;
}

export interface UseSignatureResult {
  signature: SignatureResult | null;
  loading: boolean;
  error: Error | null;
  findSignature: (options: SignatureSearchOptions) => Promise<SignatureResult>;
  saveSignature: (data: string | File, options: SignatureSaveOptions) => Promise<SignatureResult>;
  deleteSignature: (signatureType: SignatureType, documentType: DocumentType, trainingId: string, userId?: string) => Promise<boolean>;
  shareRepresentativeSignature: (trainingId: string, userId: string, companyId: string) => Promise<boolean>;
}

/**
 * Hook pour gérer les signatures dans les composants React
 */
export const useSignature = (props?: UseSignatureProps): UseSignatureResult => {
  const [signature, setSignature] = useState<SignatureResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Recherche une signature avec les options fournies
   */
  const findSignature = useCallback(async (options: SignatureSearchOptions): Promise<SignatureResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await SignatureService.findSignature(options);
      
      if (result.found) {
        setSignature(result);
      } else {
        setSignature(null);
      }
      
      setLoading(false);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur lors de la recherche de signature');
      setError(error);
      setLoading(false);
      throw error;
    }
  }, []);

  /**
   * Enregistre une signature
   */
  const saveSignature = useCallback(async (data: string | File, options: SignatureSaveOptions): Promise<SignatureResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await SignatureService.saveSignature(data, options);
      setSignature(result);
      setLoading(false);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur lors de l\'enregistrement de la signature');
      setError(error);
      setLoading(false);
      throw error;
    }
  }, []);

  /**
   * Supprime une signature
   */
  const deleteSignature = useCallback(async (
    signatureType: SignatureType, 
    documentType: DocumentType, 
    trainingId: string, 
    userId?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await SignatureService.deleteSignature(
        signatureType,
        documentType,
        trainingId,
        userId
      );
      
      if (result) {
        setSignature(null);
      }
      
      setLoading(false);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur lors de la suppression de la signature');
      setError(error);
      setLoading(false);
      throw error;
    }
  }, []);

  /**
   * Partage une signature de représentant avec tous les apprenants de la même entreprise
   */
  const shareRepresentativeSignature = useCallback(async (
    trainingId: string,
    userId: string,
    companyId: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await SignatureService.shareRepresentativeSignature(
        trainingId,
        userId,
        companyId
      );
      
      setLoading(false);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur lors du partage de la signature');
      setError(error);
      setLoading(false);
      throw error;
    }
  }, []);

  // Chargement initial si les props sont fournies
  const initialLoad = useCallback(async () => {
    if (props?.trainingId && (props?.signatureType || props?.documentType)) {
      const options: SignatureSearchOptions = {
        training_id: props.trainingId,
        signature_type: props.signatureType,
        type: props.documentType
      };
      
      if (props.userId) {
        options.user_id = props.userId;
      }
      
      await findSignature(options);
    }
  }, [props, findSignature]);

  // Auto-chargement si les props changent
  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  return {
    signature,
    loading,
    error,
    findSignature,
    saveSignature,
    deleteSignature,
    shareRepresentativeSignature
  };
};

export default useSignature; 