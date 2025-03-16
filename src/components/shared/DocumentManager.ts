import { supabase } from '../../lib/supabase';
import { isValidImageUrl } from '../../utils/SignatureUtils';

/**
 * Gestionnaire centralisé pour les documents et signatures
 * 
 * Cette classe fournit une interface unifiée pour gérer les documents et signatures
 * partagés entre l'interface CRM et l'interface apprenant.
 */
export class DocumentManager {
  /**
   * Sauvegarde une signature pour un document
   * 
   * @param signatureDataUrl URL de données de la signature
   * @param documentType Type de document ('convention', 'attestation', 'autre')
   * @param params Paramètres supplémentaires
   * @returns URL publique de la signature
   */
  static async saveSignature(
    signatureDataUrl: string,
    documentType: 'convention' | 'attestation' | 'emargement',
    params: {
      training_id: string;
      user_id: string;
      created_by: string;
      type: 'participant' | 'representative' | 'trainer';
    }
  ): Promise<string> {
    try {
      console.log('🔍 [DEBUG] Sauvegarde de signature pour', documentType, 'par', params.type);
      
      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const fileName = `${params.type}_signature_${params.training_id}_${timestamp}.png`;
      
      // Convertir l'URL de données en Blob
      const res = await fetch(signatureDataUrl);
      const blob = await res.blob();
      
      // Télécharger la signature dans le bucket Supabase
      const { data: fileData, error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (uploadError) {
        console.error('🔍 [DEBUG] Erreur lors du téléchargement de la signature:', uploadError);
        throw uploadError;
      }
      
      // Obtenir l'URL publique de la signature
      const { data: urlData } = await supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);
      
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Impossible d\'obtenir l\'URL publique de la signature');
      }
      
      console.log('🔍 [DEBUG] URL publique de la signature:', urlData.publicUrl);
      
      // Sauvegarder la référence à la signature dans la base de données
      const title = params.type === 'participant' 
        ? `Signature du participant pour ${documentType}`
        : params.type === 'representative' 
          ? `Signature du représentant pour ${documentType}`
          : `Signature du formateur pour ${documentType}`;
          
      // Convertir le type 'emargement' en 'autre' pour respecter la contrainte de la base de données
      const dbDocumentType = documentType === 'emargement' ? 'autre' : documentType;
      
      const documentData = {
        training_id: params.training_id,
        user_id: params.user_id,
        type: dbDocumentType,
        title: title,
        file_url: urlData.publicUrl,
        created_by: params.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('🔍 [DEBUG] Données à insérer dans documents:', documentData);
      
      const { data: insertData, error: docError } = await supabase
        .from('documents')
        .insert([documentData])
        .select();
      
      if (docError) {
        console.error('🔍 [DEBUG] Erreur lors de la sauvegarde de la signature dans la base de données:', docError);
        throw docError;
      }
      
      console.log('🔍 [DEBUG] Signature sauvegardée avec succès:', insertData);
      
      // Si c'est une signature d'apprenant, mettre également à jour le profil
      if (params.type === 'participant') {
        if (documentType === 'convention') {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              has_signed_agreement: true,
              agreement_signature_url: urlData.publicUrl,
              agreement_signature_date: new Date().toISOString()
            })
            .eq('id', params.user_id);
            
          if (updateError) {
            console.error('🔍 [DEBUG] Erreur lors de la mise à jour du profil utilisateur:', updateError);
            // Ne pas bloquer le processus pour cette erreur
          }
        } else if (documentType === 'emargement') {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              has_signed_attendance: true,
              attendance_signature_url: urlData.publicUrl,
              attendance_signature_date: new Date().toISOString()
            })
            .eq('id', params.user_id);
            
          if (updateError) {
            console.error('🔍 [DEBUG] Erreur lors de la mise à jour du profil utilisateur:', updateError);
            // Ne pas bloquer le processus pour cette erreur
          }
        }
      }
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('🔍 [DEBUG] Erreur lors de la sauvegarde de la signature:', error);
      throw error;
    }
  }
  
  /**
   * Récupère la dernière signature pour un document
   * 
   * @param params Paramètres de recherche
   * @returns URL de la signature ou null si non trouvée
   */
  static async getLastSignature(params: {
    training_id: string;
    user_id?: string;
    type: 'convention' | 'attestation' | 'emargement';
    signature_type: 'participant' | 'representative' | 'trainer';
  }): Promise<string | null> {
    try {
      console.log('🔍 [DEBUG] Récupération de la dernière signature pour', params);
      
      const title = params.signature_type === 'participant' 
        ? `Signature du participant pour ${params.type}`
        : params.signature_type === 'representative' 
          ? `Signature du représentant pour ${params.type}`
          : `Signature du formateur pour ${params.type}`;
      
      // Convertir le type 'emargement' en 'autre' pour respecter la contrainte de la base de données
      const dbDocumentType = params.type === 'emargement' ? 'autre' : params.type;
      
      // CORRECTION : S'assurer que le filtrage par user_id est toujours appliqué
      let query = supabase
        .from('documents')
        .select('file_url')
        .eq('training_id', params.training_id)
        .eq('type', dbDocumentType)
        .eq('title', title);
      
      // IMPORTANT : Toujours filtrer par user_id si fourni
      if (params.user_id) {
        query = query.eq('user_id', params.user_id);
      } else {
        console.warn('🔍 [DEBUG] Attention: Récupération de signature sans user_id spécifié');
      }
      
      // Trier par date de création décroissante et limiter à 1 résultat
      query = query.order('created_at', { ascending: false }).limit(1);
      
      const { data, error } = await query.maybeSingle();
      
      if (error) {
        console.error('🔍 [DEBUG] Erreur lors de la récupération de la signature:', error);
        return null;
      }
      
      if (!data || !data.file_url) {
        console.log('🔍 [DEBUG] Aucune signature trouvée');
        return null;
      }
      
      // Vérifier que l'URL est valide avant de la retourner
      const isValid = await isValidImageUrl(data.file_url, 5000);
      if (!isValid) {
        console.log('🔍 [DEBUG] URL de signature trouvée mais invalide:', data.file_url);
        return null;
      }
      
      console.log('🔍 [DEBUG] Signature trouvée et validée:', data.file_url);
      return data.file_url;
    } catch (error) {
      console.error('🔍 [DEBUG] Exception lors de la récupération de la signature:', error);
      return null;
    }
  }
  
  /**
   * Sauvegarde un document PDF dans Supabase
   * 
   * @param pdfBlob Blob du document PDF
   * @param params Paramètres du document
   * @returns URL publique du document
   */
  static async saveDocument(
    pdfBlob: Blob,
    params: {
      training_id: string;
      user_id: string;
      created_by: string;
      type: 'convention' | 'attestation' | 'emargement';
      participant_name: string;
    }
  ): Promise<string> {
    try {
      console.log('🔍 [DEBUG] Sauvegarde de document', params.type);
      
      // Créer un nom de fichier sanitisé
      const timestamp = Date.now();
      const sanitizedName = params.participant_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const fileName = `${params.type}_${sanitizedName}_${timestamp}.pdf`;
      
      // Déterminer le bucket en fonction du type de document
      const bucket = params.type === 'convention' 
        ? 'agreements' 
        : params.type === 'attestation'
          ? 'certificates'
          : 'attendance-sheets';
      
      // Télécharger le document dans le bucket approprié
      const { data: fileData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });
      
      if (uploadError) {
        console.error('🔍 [DEBUG] Erreur lors du téléchargement du document:', uploadError);
        throw uploadError;
      }
      
      // Obtenir l'URL publique du document
      const { data: urlData } = await supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);
      
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Impossible d\'obtenir l\'URL publique du document');
      }
      
      console.log('🔍 [DEBUG] URL publique du document:', urlData.publicUrl);
      
      // Déterminer le titre du document
      let documentTitle = '';
      switch (params.type) {
        case 'convention':
          documentTitle = `Convention de formation signée - ${params.participant_name}`;
          break;
        case 'attestation':
          documentTitle = `Attestation de fin de formation - ${params.participant_name}`;
          break;
        case 'emargement':
          documentTitle = `Feuille d'émargement - ${params.participant_name}`;
          break;
      }
      
      // Convertir le type 'emargement' en 'autre' pour respecter la contrainte de la base de données
      const dbDocumentType = params.type === 'emargement' ? 'autre' : params.type;
      
      // Sauvegarder la référence au document dans la base de données
      const documentData = {
        training_id: params.training_id,
        user_id: params.user_id,
        type: dbDocumentType,
        title: documentTitle,
        file_url: urlData.publicUrl,
        created_by: params.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('🔍 [DEBUG] Données à insérer dans documents:', documentData);
      
      const { data: insertData, error: docError } = await supabase
        .from('documents')
        .insert([documentData])
        .select();
      
      if (docError) {
        console.error('🔍 [DEBUG] Erreur lors de la sauvegarde du document dans la base de données:', docError);
        throw docError;
      }
      
      console.log('🔍 [DEBUG] Document sauvegardé avec succès:', insertData);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('🔍 [DEBUG] Erreur lors de la sauvegarde du document:', error);
      throw error;
    }
  }
  
  /**
   * Récupère le dernier document signé
   * 
   * @param params Paramètres de recherche
   * @returns URL du document ou null si non trouvé
   */
  static async getLastDocument(params: {
    training_id: string;
    user_id: string;
    type: 'convention' | 'attestation' | 'emargement';
  }): Promise<string | null> {
    try {
      console.log('🔍 [DEBUG] Récupération du dernier document', params.type);
      
      // Convertir le type 'emargement' en 'autre' pour respecter la contrainte de la base de données
      const dbDocumentType = params.type === 'emargement' ? 'autre' : params.type;
      
      const { data, error } = await supabase
        .from('documents')
        .select('file_url')
        .eq('training_id', params.training_id)
        .eq('user_id', params.user_id)
        .eq('type', dbDocumentType)
        .not('file_url', 'ilike', '%signature%') // Exclure les signatures
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('🔍 [DEBUG] Erreur lors de la récupération du document:', error);
        return null;
      }
      
      if (!data || !data.file_url) {
        console.log('🔍 [DEBUG] Aucun document trouvé');
        return null;
      }
      
      console.log('🔍 [DEBUG] Document trouvé:', data.file_url);
      return data.file_url;
    } catch (error) {
      console.error('🔍 [DEBUG] Exception lors de la récupération du document:', error);
      return null;
    }
  }
  
  /**
   * Vérifie si une URL d'image est valide
   * 
   * @param url URL à vérifier
   * @returns Promise<boolean> true si l'URL est valide, false sinon
   * @deprecated Utiliser isValidImageUrl de SignatureUtils.ts à la place
   */
  static async isValidImageUrl(url: string | null): Promise<boolean> {
    return isValidImageUrl(url, 3000);
  }
} 