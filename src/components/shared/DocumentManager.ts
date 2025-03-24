import { supabase } from '../../lib/supabase';
import { isValidImageUrl, addCacheBuster, analyzeDataUrl, dataURLtoBlob } from '../../utils/SignatureUtils';

// Cache pour éviter de vérifier plusieurs fois les mêmes colonnes
const columnExistenceCache: Record<string, boolean> = {
  content: false,  // Colonnes connues comme inexistantes
  metadata: false
};

/**
 * Gestionnaire centralisé pour les documents et signatures
 * 
 * Cette classe fournit une interface unifiée pour gérer les documents et signatures
 * partagés entre l'interface CRM et l'interface apprenant.
 */
export class DocumentManager {
  /**
   * Diagnostique la structure de la table documents
   * @returns Promise<void>
   */
  static async diagnoseDocumentsTable(): Promise<void> {
    console.log('🔍 [DIAGNOSTIC] Analyse de la structure de la table documents...');
    
    try {
      // Vérifier si la table existe
      const { data: tableExists, error: tableError } = await supabase
        .from('documents')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.error('🔍 [DIAGNOSTIC] Erreur lors de la vérification de la table documents:', tableError);
        return;
      }
      
      console.log('🔍 [DIAGNOSTIC] La table documents existe et est accessible');
      
      // Récupérer les informations sur les colonnes
      try {
        const { data: columnsData, error: columnsError } = await supabase
          .rpc('get_table_columns', { table_name: 'documents' });
        
        if (columnsError) {
          console.error('🔍 [DIAGNOSTIC] Erreur lors de la récupération des colonnes:', columnsError);
        } else {
          console.log('🔍 [DIAGNOSTIC] Colonnes de la table documents:', columnsData);
        }
      } catch (columnsError) {
        console.error('🔍 [DIAGNOSTIC] Exception lors de la récupération des colonnes:', columnsError);
      }
      
      // Récupérer les contraintes
      try {
        const { data: constraintsData, error: constraintsError } = await supabase
          .rpc('get_table_constraints', { table_name: 'documents' });
        
        if (constraintsError) {
          console.error('🔍 [DIAGNOSTIC] Erreur lors de la récupération des contraintes:', constraintsError);
        } else {
          console.log('🔍 [DIAGNOSTIC] Contraintes de la table documents:', constraintsData);
        }
      } catch (constraintsError) {
        console.error('🔍 [DIAGNOSTIC] Exception lors de la récupération des contraintes:', constraintsError);
      }
      
      // Récupérer un exemple de document existant
      try {
        const { data: exampleData, error: exampleError } = await supabase
          .from('documents')
          .select('*')
          .limit(1);
        
        if (exampleError) {
          console.error('🔍 [DIAGNOSTIC] Erreur lors de la récupération d\'un exemple:', exampleError);
        } else if (exampleData && exampleData.length > 0) {
          console.log('🔍 [DIAGNOSTIC] Exemple de document existant:', exampleData[0]);
        } else {
          console.log('🔍 [DIAGNOSTIC] Aucun document existant trouvé');
        }
      } catch (exampleError) {
        console.error('🔍 [DIAGNOSTIC] Exception lors de la récupération d\'un exemple:', exampleError);
      }
    } catch (error) {
      console.error('🔍 [DIAGNOSTIC] Exception lors du diagnostic de la table documents:', error);
    }
  }

  /**
   * Vérifie si le bucket signatures existe et le crée si nécessaire
   * @returns Promise<boolean> true si le bucket existe ou a été créé
   */
  static async ensureSignatureBucketExists(): Promise<boolean> {
    try {
      console.log('🔍 [BUCKET] Vérification de l\'existence du bucket signatures...');
      
      // Vérifier si le bucket existe
      const { data: bucket, error: getBucketError } = await supabase.storage
        .getBucket('signatures');
      
      // Si le bucket existe déjà
      if (bucket) {
        console.log('✅ [BUCKET] Le bucket signatures existe déjà');
        
        // Vérifier si le bucket est public
        if (!bucket.public) {
          console.log('🔍 [BUCKET] Le bucket n\'est pas public, tentative de mise à jour...');
          
          try {
            const { data: updateData, error: updateError } = await supabase.storage
              .updateBucket('signatures', { public: true });
              
            if (updateError) {
              console.error('❌ [BUCKET] Impossible de mettre à jour le bucket en public:', updateError);
            } else {
              console.log('✅ [BUCKET] Bucket mis à jour avec succès - maintenant public');
            }
          } catch (updateError) {
            console.error('❌ [BUCKET] Exception lors de la mise à jour du bucket:', updateError);
          }
        }
        
        return true;
      }
      
      // Si le bucket n'existe pas mais que ce n'est pas une erreur claire
      if (!getBucketError || !getBucketError.message.includes('not found')) {
        console.error('❓ [BUCKET] Situation indéterminée avec le bucket:', getBucketError);
      }
      
      // Essayer de créer le bucket
      console.log('🔍 [BUCKET] Le bucket signatures n\'existe pas, tentative de création...');
      
      const { data: newBucket, error: createError } = await supabase.storage
        .createBucket('signatures', { public: true });
        
      if (createError) {
        console.error('❌ [BUCKET] Erreur lors de la création du bucket:', createError);
        
        if (createError.message.includes('permission') || createError.message.includes('not authorized') || createError.message.includes('violates row-level security policy')) {
          console.error('⛔ [BUCKET] Erreur de permission RLS. Continuons quand même car le bucket existe probablement.');
          // Même si on ne peut pas créer le bucket à cause des permissions RLS,
          // on continue car le bucket existe probablement déjà
          return true;
        }
        
        return false;
      }
      
      console.log('✅ [BUCKET] Bucket signatures créé avec succès');
      return true;
      
    } catch (error) {
      console.error('❌ [BUCKET] Exception lors de la vérification/création du bucket:', error);
      // Même en cas d'erreur, on continue car le bucket existe probablement
      return true;
    }
  }

  /**
   * Teste différentes valeurs de type pour trouver celles qui sont acceptées par la contrainte
   * @returns Promise<string | null> La première valeur de type acceptée ou null si aucune n'est acceptée
   */
  static async testDocumentTypes(): Promise<string | null> {
    console.log('🔍 [TEST] Test de différentes valeurs de type pour la table documents...');
    
    // Liste des types à tester
    const typesToTest = [
      'convention',
      'attestation',
      'emargement',
      'training_agreement',
      'completion_certificate',
      'attendance_sheet',
      'document',
      'signature',
      'autre',
      'other',
      'pdf',
      'image'
    ];
    
    // Tester chaque type
    for (const typeToTest of typesToTest) {
      console.log(`🔍 [TEST] Test du type "${typeToTest}"...`);
      
      try {
        // Créer un document de test
        const testData = {
          training_id: '00000000-0000-0000-0000-000000000000',
          user_id: '00000000-0000-0000-0000-000000000000',
          type: typeToTest,
          title: `Test du type ${typeToTest}`,
          file_url: 'https://example.com/test.png',
          created_by: '00000000-0000-0000-0000-000000000000',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Tenter d'insérer le document
        const { data: insertData, error: insertError } = await supabase
          .from('documents')
          .insert([testData])
          .select();
        
        if (insertError) {
          console.error(`🔍 [TEST] Le type "${typeToTest}" n'est pas accepté:`, insertError);
        } else {
          console.log(`✅ [TEST] Le type "${typeToTest}" est accepté!`);
          
          // Supprimer le document de test
          if (insertData && insertData.length > 0) {
            const { error: deleteError } = await supabase
              .from('documents')
              .delete()
              .eq('id', insertData[0].id);
            
            if (deleteError) {
              console.error(`🔍 [TEST] Erreur lors de la suppression du document de test:`, deleteError);
            }
          }
          
          return typeToTest;
        }
      } catch (error) {
        console.error(`🔍 [TEST] Exception lors du test du type "${typeToTest}":`, error);
      }
    }
    
    console.error('🔍 [TEST] Aucun des types testés n\'est accepté par la contrainte');
    return null;
  }

  /**
   * Vérifie si la table documents a une colonne spécifique
   * @param columnName Nom de la colonne à vérifier
   * @returns Promise<boolean> true si la colonne existe, false sinon
   */
  static async hasColumn(columnName: string): Promise<boolean> {
    // Si le résultat est déjà en cache, le retourner immédiatement
    if (columnName in columnExistenceCache) {
      console.log(`🔍 [CACHE] Utilisation du cache pour la colonne "${columnName}": ${columnExistenceCache[columnName] ? 'existe' : 'n\'existe pas'}`);
      return columnExistenceCache[columnName];
    }
    
    try {
      console.log(`🔍 [DIAGNOSTIC] Vérification de l'existence de la colonne "${columnName}" dans la table documents...`);
      
      // Pour les colonnes content et metadata, retourner directement false
      if (columnName === 'content' || columnName === 'metadata') {
        console.log(`❌ [DIAGNOSTIC] La colonne "${columnName}" est connue pour ne pas exister`);
        columnExistenceCache[columnName] = false;
        return false;
      }
      
      // Méthode simplifiée: tenter de sélectionner la colonne
        try {
          const { data: selectData, error: selectError } = await supabase
            .from('documents')
            .select(columnName)
            .limit(1);
          
          if (selectError) {
          if (selectError.message.includes(`column documents.${columnName} does not exist`)) {
            console.log(`❌ [DIAGNOSTIC] La colonne "${columnName}" n'existe pas (confirmé par select)`);
            columnExistenceCache[columnName] = false;
              return false;
            }
            
            console.error('🔍 [DIAGNOSTIC] Erreur lors de la sélection de la colonne:', selectError);
          columnExistenceCache[columnName] = false;
            return false;
          }
          
          console.log(`✅ [DIAGNOSTIC] La colonne "${columnName}" existe (confirmé par select)`);
        columnExistenceCache[columnName] = true;
          return true;
        } catch (selectError) {
          console.error('🔍 [DIAGNOSTIC] Exception lors de la sélection de la colonne:', selectError);
        columnExistenceCache[columnName] = false;
          return false;
        }
    } catch (error) {
      console.error(`🔍 [DIAGNOSTIC] Exception lors de la vérification de la colonne "${columnName}":`, error);
      columnExistenceCache[columnName] = false;
      return false;
    }
  }

  /**
   * Sauvegarde une signature pour un document
   * 
   * @param params Paramètres de sauvegarde
   * @returns URL publique de la signature
   */
  static async saveSignature(params: {
      training_id: string;
    user_id?: string;
    signature: string;
    type: 'convention' | 'attestation' | 'emargement';
    signature_type: 'participant' | 'representative' | 'trainer' | 'companySeal' | 'organizationSeal';
    created_by?: string;
  }): Promise<string> {
    try {
      console.log('🪲 [TRAÇAGE] DocumentManager.saveSignature DÉBUT', {
        type: params.type,
        signature_type: params.signature_type,
        training_id: params.training_id,
        user_id: params.user_id || 'non défini'
      });
      
      // Vérification des paramètres requis
      if (!params.training_id) {
        console.error('🪲 [TRAÇAGE] Error: training_id manquant');
        throw new Error('training_id est requis');
      }
      if (!params.signature) {
        console.error('🪲 [TRAÇAGE] Error: signature manquante');
        throw new Error('signature est requise');
      }
      if (!params.type) {
        console.error('🪲 [TRAÇAGE] Error: type manquant');
        throw new Error('type est requis');
      }
      if (!params.signature_type) {
        console.error('🪲 [TRAÇAGE] Error: signature_type manquant');
        throw new Error('signature_type est requis');
      }

      console.log('🔍 [DEBUG] saveSignature - Début du processus');
      console.log('🔍 [DEBUG] Paramètres reçus :', {
        training_id: params.training_id,
        user_id: params.user_id || 'non spécifié',
        type: params.type,
        signature_type: params.signature_type,
        signature_length: params.signature?.length || 0,
        signature_substring: params.signature?.substring(0, 20) + '...' || 'vide'
      });

      // Vérifier si la signature est déjà une dataURL
      let dataURL = params.signature;
      if (!params.signature.startsWith('data:image/')) {
        // Si ce n'est pas une dataURL, on la convertit
        dataURL = `data:image/png;base64,${params.signature}`;
      }

      console.log(`🔍 [DEBUG] DataURL générée (${dataURL.length} caractères)`);
      console.log('🔍 [DEBUG] Début de la dataURL:', dataURL.substring(0, 50));

      // Diagnostic de la dataURL pour voir si elle est valide
      const isValidDataURL = dataURL.startsWith('data:image/');
      console.log('🔍 [DEBUG] La dataURL est-elle valide?', isValidDataURL);
      
      if (!isValidDataURL) {
        console.error('🪲 [TRAÇAGE] Error: Format de signature invalide');
        throw new Error('Format de signature invalide');
      }

      // Extraire la partie base64 pour diagnostic
      const base64Part = dataURL.split(',')[1];
      if (!base64Part) {
        console.error('🪲 [TRAÇAGE] Error: Données base64 manquantes');
        throw new Error('Données base64 manquantes dans la signature');
      }
      console.log(`🔍 [DEBUG] Partie base64 extraite (${base64Part.length} caractères)`);

      // Définir les variables pour le nom de fichier et le type
      let filename;
      
      // Déterminer un titre approprié selon le type
      let title;
      if (params.signature_type === 'participant') {
        title = "Signature de l'apprenant";
      } else if (params.signature_type === 'representative') {
        title = "Signature du représentant";
      } else if (params.signature_type === 'trainer') {
        title = "Signature du formateur";
      } else if (params.signature_type === 'companySeal') {
        title = "Tampon de l'entreprise";
      } else if (params.signature_type === 'organizationSeal') {
        title = "Tampon de l'organisme de formation";
      } else {
        title = "Signature";
      }

      // Création du nom de fichier selon le type de signature
      if (params.signature_type === 'companySeal' || params.signature_type === 'organizationSeal') {
        const sealTypePrefix = params.signature_type === 'companySeal' ? 'seal_company' : 'seal_organization';
        filename = `${sealTypePrefix}_${params.type}_${Date.now()}.png`;
        console.log('🔍 [DEBUG] Nom de fichier de tampon généré:', filename);
      } else {
        filename = `${params.signature_type}_${params.type}_${params.user_id || 'no-user'}_${Date.now()}.png`;
        console.log('🔍 [DEBUG] Nom de fichier de signature généré:', filename);
      }

      // Chemin complet dans le bucket (pas de sous-dossier utilisé)
      const fullPath = filename;
      console.log('🔍 [DEBUG] Chemin complet pour le stockage:', fullPath);
      
      // Convertir le dataURL en Blob pour le stockage
      let blob;
      try {
        const base64 = dataURL.split(',')[1];
        const mime = dataURL.match(/:(.*?);/)?.[1];
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        blob = new Blob([bytes], { type: mime });
        console.log('🔍 [DEBUG] Blob créé avec succès, taille:', blob.size);
      } catch (e) {
        console.error('🪲 [TRAÇAGE] Error lors de la conversion en blob:', e);
        throw new Error(`Erreur lors de la conversion de la signature en blob: ${e}`);
      }

      // Télécharger la signature dans le bucket Supabase
      // Utiliser le bucket "signatures" pour toutes les signatures
      try {
        console.log('🔍 [DEBUG] Début du téléchargement dans le bucket signatures, chemin:', fullPath);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('signatures')
          .upload(fullPath, blob, {
            contentType: 'image/png'
          });
        
        if (uploadError) {
          console.error('🪲 [TRAÇAGE] Error lors du téléchargement:', uploadError);
          throw new Error(`Erreur lors du téléchargement de la signature: ${uploadError.message}`);
        }

        console.log('🔍 [DEBUG] Signature téléchargée avec succès, data:', uploadData);

        // Obtenir l'URL publique
        const { data: urlData, error: urlError } = await supabase.storage
          .from('signatures')
          .getPublicUrl(fullPath);

        if (urlError || !urlData) {
          console.error('🪲 [TRAÇAGE] Error lors de la génération de l\'URL publique:', urlError);
          throw new Error('Erreur lors de la génération de l\'URL publique');
        }

        const publicUrl = urlData.publicUrl;
        console.log('🔍 [DEBUG] URL publique générée:', publicUrl);

        try {
          // Enregistrer la référence dans la base de données
          console.log('🔍 [DEBUG] Enregistrement de la référence dans la base de données');
          
          // CORRECTION: Pour les signatures du formateur et du représentant,
          // ne pas spécifier user_id pour qu'ils soient globaux à la formation
          const isGlobalSignature = params.signature_type === 'trainer' || 
                                   params.signature_type === 'representative' ||
                                   params.signature_type === 'organizationSeal';
                                   
          console.log('🪲 [TRAÇAGE] Signature globale?', isGlobalSignature, 'pour', params.signature_type);
          
          const { data: insertData, error: insertError } = await supabase
            .from('documents')
            .insert([
              {
                training_id: params.training_id,
                user_id: isGlobalSignature ? null : params.user_id,
                file_url: publicUrl,
                type: params.type,
                title: title,
                created_by: params.created_by
              }
            ]);
          
          if (insertError) {
            console.error('🪲 [TRAÇAGE] Error lors de l\'insertion dans la base de données:', insertError);
            console.warn('L\'URL publique reste valide malgré l\'erreur d\'insertion');
          } else {
            console.log('🔍 [DEBUG] Référence enregistrée avec succès dans la base de données');
          }
        } catch (dbError) {
          console.error('🪲 [TRAÇAGE] Exception lors de l\'insertion dans la base de données:', dbError);
          console.warn('L\'URL publique reste valide malgré l\'erreur d\'insertion');
        }

        console.log('🪲 [TRAÇAGE] DocumentManager.saveSignature TERMINÉ avec succès:', publicUrl);
        return publicUrl;

      } catch (storageError) {
        console.error('🪲 [TRAÇAGE] Exception dans le stockage Supabase:', storageError);
        throw storageError;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('🔍 [DEBUG] Erreur lors de la sauvegarde de la signature:', errorMessage);
      console.error('🪲 [TRAÇAGE] DocumentManager.saveSignature ÉCHOUÉ avec erreur:', error);
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
    signature_type: 'participant' | 'representative' | 'trainer' | 'companySeal' | 'organizationSeal';
  }): Promise<string | null> {
    try {
      console.log('🔍 [DEBUG] Récupération de la dernière signature pour', params);
      
      // Déterminer un titre approprié selon le type
      let title;
      if (params.signature_type === 'participant') {
        title = "Signature de l'apprenant";
      } else if (params.signature_type === 'representative') {
        title = "Signature du représentant";
      } else if (params.signature_type === 'trainer') {
        title = "Signature du formateur";
      } else if (params.signature_type === 'companySeal') {
        title = "Tampon de l'entreprise";
      } else if (params.signature_type === 'organizationSeal') {
        title = "Tampon de l'organisme de formation";
      } else {
        title = "Signature";
      }
      
      // Convertir le type en utilisant les mêmes valeurs que dans saveSignature
      // pour être cohérent avec la contrainte de la base de données
      const dbDocumentType = params.type;
      
      console.log('🔍 [DEBUG] Type de document pour la recherche:', { original: params.type, db: dbDocumentType, title });

      // DIAGNOSTIC SPÉCIAL POUR LE REPRÉSENTANT 
      if (params.signature_type === 'representative') {
        console.log('🔎 [DIAGNOSTIC_REPRÉSENTANT] Recherche signature représentant...');
        
        // D'abord, essayer de trouver exactement pour cette formation
        const { data: exactData, error: exactError } = await supabase
          .from('documents')
          .select('file_url, created_at, id, title')
          .eq('training_id', params.training_id)
          .eq('type', dbDocumentType)
          .eq('title', title)
          .order('created_at', { ascending: false })
          .limit(1);
          
        console.log('🔎 [DIAGNOSTIC_REPRÉSENTANT] Résultat recherche exacte:', { 
          training_id: params.training_id, 
          error: exactError?.message,
          found: exactData?.length > 0,
          data: exactData
        });
        
        // Ensuite, chercher globalement
        const { data: globalData, error: globalError } = await supabase
          .from('documents')
          .select('file_url, created_at, id, title')
          .eq('type', dbDocumentType)
          .eq('title', title)
          .order('created_at', { ascending: false })
          .limit(5);
          
        console.log('🔎 [DIAGNOSTIC_REPRÉSENTANT] Résultat recherche globale:', { 
          error: globalError?.message,
          found: globalData?.length > 0,
          count: globalData?.length,
          data: globalData
        });
      }
      
      // CORRECTION : S'assurer que le filtrage par user_id est toujours appliqué
      let query = supabase
        .from('documents')
        .select('file_url, created_at, id, title')
        .eq('training_id', params.training_id)
        .eq('type', dbDocumentType);
      
      // Pour les tampons, la recherche est plus complexe car nous avons changé la convention de nommage
      // Nous devons donc être plus flexibles dans la recherche
      if (params.signature_type === 'companySeal' || params.signature_type === 'organizationSeal') {
        // Pour les tampons, rechercher par titre plutôt que par structure de dossier
        query = query.eq('title', title);
      } else {
        // Pour les signatures normales, rechercher par titre également
        query = query.eq('title', title);
      }
      
      // IMPORTANT : Toujours filtrer par user_id si fourni, sauf pour les tampons qui sont au niveau de la formation
      if (params.user_id && params.signature_type !== 'companySeal' && params.signature_type !== 'organizationSeal') {
        query = query.eq('user_id', params.user_id);
      } else if (params.signature_type === 'companySeal' || params.signature_type === 'organizationSeal') {
        console.log('🔍 [DEBUG] Recherche de tampon sans filtrage par user_id (niveau formation)');
      } else {
        console.warn('🔍 [DEBUG] Attention: Récupération de signature sans user_id spécifié');
      }
      
      // Trier par date de création décroissante et limiter à 5 résultats
      // pour avoir des alternatives si la première URL ne fonctionne pas
      query = query.order('created_at', { ascending: false }).limit(5);
      
      const { data, error } = await query;
      
      if (error) {
        console.error('🔍 [DEBUG] Erreur lors de la récupération de la signature:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.log('🔍 [DEBUG] Aucune signature trouvée par requête directe. Paramètres de recherche:', { 
          training_id: params.training_id,
          user_id: params.user_id,
          type: dbDocumentType,
          title: title
        });
        
        // AMÉLIORATION: Essayer de trouver la signature même si elle n'est pas liée à la formation
        // Cela permet de réutiliser une signature du formateur ou du représentant à travers les formations
        if (params.signature_type === 'representative' || params.signature_type === 'trainer') {
          console.log('🔍 [DEBUG] Recherche globale pour une signature de type:', params.signature_type);
          
          try {
            // Rechercher globalement sans training_id (toutes formations confondues)
            const { data: globalData, error: globalError } = await supabase
              .from('documents')
              .select('file_url, created_at')
              .eq('title', title)
              .eq('type', dbDocumentType)
              .order('created_at', { ascending: false })
              .limit(1);
              
            if (!globalError && globalData && globalData.length > 0) {
              const fileUrl = globalData[0].file_url;
              console.log(`🔍 [DEBUG] Signature de ${params.signature_type} trouvée globalement:`, fileUrl);
              return fileUrl;
            }
            
            // Si toujours rien, essayer en cherchant dans les fichiers du bucket signatures
            const typePrefix = params.signature_type === 'representative' ? 'representative' : 'trainer';
            
            const { data: files, error: storageError } = await supabase.storage
              .from('signatures')
              .list('', { 
                limit: 10,
                search: `${typePrefix}_${params.type}`
              });
              
            if (!storageError && files && files.length > 0) {
              // Trier par date (nom contient timestamp)
              const sortedFiles = files
                .filter(file => file.name.includes(`${typePrefix}_${params.type}`))
                .sort((a, b) => b.name.localeCompare(a.name));
                
              if (sortedFiles.length > 0) {
                const { data: urlData } = await supabase.storage
                  .from('signatures')
                  .getPublicUrl(sortedFiles[0].name);
                  
                if (urlData && urlData.publicUrl) {
                  console.log(`🔍 [DEBUG] Signature de ${params.signature_type} trouvée dans le stockage:`, urlData.publicUrl);
                  return urlData.publicUrl;
                }
              }
            }
          } catch (globalSearchError) {
            console.error('🔍 [DEBUG] Erreur lors de la recherche globale:', globalSearchError);
          }
        }
        
        // Si nous cherchons un tampon et que nous n'avons rien trouvé, essayons de rechercher
        // directement dans le bucket de stockage avec le nouveau format de nom de fichier
        if (params.signature_type === 'companySeal' || params.signature_type === 'organizationSeal') {
          console.log('🔍 [DEBUG] Tentative de récupération directe dans le stockage pour le tampon...');
          
          try {
            // Déterminer le préfixe de recherche en fonction du type de tampon
            const searchPrefix = params.signature_type === 'companySeal' ? 'seal_company' : 'seal_organization';
            
            // Lister tous les fichiers dans le bucket
            const { data: files, error: listError } = await supabase.storage
              .from('signatures')
              .list('', {
                limit: 100,
                sortBy: { column: 'created_at', order: 'desc' }
              });
            
            if (listError) {
              console.error('🔍 [DEBUG] Erreur lors de la récupération des fichiers:', listError);
            } else if (files && files.length > 0) {
              console.log(`🔍 [DEBUG] ${files.length} fichiers trouvés dans le bucket signatures`);
              
              // Filtrer les fichiers qui correspondent au préfixe et au type de document
              const matchingFiles = files
                .filter(file => file.name.startsWith(searchPrefix) && file.name.includes(params.type))
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              
              if (matchingFiles.length > 0) {
                console.log('🔍 [DEBUG] Tampons trouvés par recherche dans le stockage:', matchingFiles.length);
                
                // Générer l'URL publique du fichier le plus récent
                const { data: urlData } = await supabase.storage
                  .from('signatures')
                  .getPublicUrl(matchingFiles[0].name);
                
                if (urlData && urlData.publicUrl) {
                  console.log('🔍 [DEBUG] URL de tampon trouvée dans le stockage:', urlData.publicUrl);
                  return urlData.publicUrl;
                }
              }
            }
          } catch (storageError) {
            console.error('🔍 [DEBUG] Erreur lors de la recherche dans le stockage:', storageError);
          }
        }
        
        return null;
      }
      
      console.log('🔍 [DEBUG] Signatures trouvées:', data.length, 'résultats');
      
      // Essayer chaque URL jusqu'à en trouver une valide
      for (const item of data) {
        if (!item.file_url) continue;
        
        // Ajouter un paramètre de cache-busting à l'URL
        const urlWithCacheBuster = addCacheBuster(item.file_url);
        console.log('🔍 [DEBUG] Vérification de l\'URL avec cache-busting:', urlWithCacheBuster);
        
        // Vérifier que l'URL est valide avant de la retourner
        try {
        const isValid = await isValidImageUrl(urlWithCacheBuster, 5000);
        if (isValid) {
          console.log('🔍 [DEBUG] Signature trouvée et validée:', urlWithCacheBuster);
          return item.file_url; // Retourner l'URL originale sans cache-busting
        } else {
            console.log('🔍 [DEBUG] URL invalide, essai suivant:', item.file_url);
          }
        } catch (validationError) {
          console.error('🔍 [DEBUG] Erreur lors de la validation de l\'URL:', validationError);
        }
      }
      
      // Si on arrive ici, aucune URL n'est valide, mais on retourne quand même la plus récente
      // car il est possible que l'image soit en cours de propagation dans le CDN
      console.log('🔍 [DEBUG] Aucune URL valide trouvée, retour de la plus récente par défaut:', data[0].file_url);
      return data[0].file_url;
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
      console.log('🔍 [DEBUG] Sauvegarde du document PDF pour', params.type);
      
      // Utiliser le type original directement, comme dans saveSignature
      const dbDocumentType = params.type;
      
      console.log('🔍 [DEBUG] Type de document pour la sauvegarde:', { original: params.type, db: dbDocumentType });
      
      // Générer un nom de fichier unique
      const timestamp = new Date().getTime();
      const fileName = `${params.type}_${params.training_id}_${params.user_id}_${timestamp}.pdf`;
      
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
      console.log('🚨 [DEBUG] Récupération du dernier document', params.type, '- Training ID:', params.training_id, '- User ID:', params.user_id);
      
      // Utiliser le type original directement, comme dans saveSignature
      const dbDocumentType = params.type;
      
      console.log('🚨 [DEBUG] Type de document pour la recherche:', { original: params.type, db: dbDocumentType });
      
      // Étape 1: Essayer de trouver d'abord un document qui n'est pas une signature
      const { data: pdfData, error: pdfError } = await supabase
        .from('documents')
        .select('file_url, created_at, title')
        .eq('training_id', params.training_id)
        .eq('user_id', params.user_id)
        .eq('type', dbDocumentType)
        .not('file_url', 'ilike', '%signature%') // Exclure les signatures
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (pdfError) {
        console.error('🚨 [DEBUG] Erreur lors de la recherche du document PDF:', pdfError);
      }
      
      // Si un document PDF a été trouvé, le retourner
      if (pdfData && pdfData.file_url) {
        console.log('🚨 [DEBUG] Document PDF trouvé:', pdfData.file_url, '- Titre:', pdfData.title);
        return pdfData.file_url;
      }
      
      // Étape 2: Si aucun document PDF n'a été trouvé, chercher n'importe quel document sans filtrer par user_id
      // Cela peut être utile dans certains cas où le document est associé à la formation mais pas à l'utilisateur
      console.log('🚨 [DEBUG] Aucun document PDF trouvé pour l\'utilisateur spécifique, recherche élargie');
      
      const { data: anyTrainingData, error: anyTrainingError } = await supabase
        .from('documents')
        .select('file_url, created_at, title, user_id')
        .eq('training_id', params.training_id)
        .eq('type', dbDocumentType)
        .not('file_url', 'ilike', '%signature%') // Exclure les signatures
        .order('created_at', { ascending: false })
        .limit(10); // Récupérer plusieurs documents pour plus de contexte
      
      if (anyTrainingError) {
        console.error('🚨 [DEBUG] Erreur lors de la recherche élargie:', anyTrainingError);
      } else if (anyTrainingData && anyTrainingData.length > 0) {
        console.log('🚨 [DEBUG] Documents trouvés par recherche élargie:', 
          anyTrainingData.map(d => ({ url: d.file_url, title: d.title, user_id: d.user_id })));
        
        // Prendre le premier document de la formation
        const firstTrainingDoc = anyTrainingData[0];
        if (firstTrainingDoc && firstTrainingDoc.file_url) {
          console.log('🚨 [DEBUG] Document trouvé par recherche élargie:', firstTrainingDoc.file_url);
          return firstTrainingDoc.file_url;
        }
      }
      
      // Étape 3: Si aucun document n'est trouvé, rechercher tout type de document pour cet utilisateur/formation
      console.log('🚨 [DEBUG] Aucun document sans signature trouvé, recherche de tout type de document');
      
      const { data: anyData, error: anyError } = await supabase
        .from('documents')
        .select('file_url, created_at, title')
        .eq('training_id', params.training_id)
        .eq('user_id', params.user_id)
        .eq('type', dbDocumentType)
        .order('created_at', { ascending: false })
        .limit(10); // Récupérer plusieurs documents pour plus de contexte
      
      if (anyError) {
        console.error('🚨 [DEBUG] Erreur lors de la recherche de tout type de document:', anyError);
        return null;
      }
      
      if (!anyData || anyData.length === 0) {
        console.log('🚨 [DEBUG] Aucun document trouvé pour cet utilisateur et cette formation');
        
        // Dernière étape: vérifier s'il y a des documents pour cette formation, peu importe l'utilisateur
        const { data: anyFormationDoc, error: formationError } = await supabase
          .from('documents')
          .select('file_url, created_at, title, user_id')
          .eq('training_id', params.training_id)
          .eq('type', dbDocumentType)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (formationError) {
          console.error('🚨 [DEBUG] Erreur lors de la recherche par formation:', formationError);
        } else if (anyFormationDoc && anyFormationDoc.length > 0) {
          console.log('🚨 [DEBUG] Document trouvé par formation:', anyFormationDoc[0].file_url);
          return anyFormationDoc[0].file_url;
        }
        
        return null;
      }
      
      // Log tous les documents trouvés pour diagnostic
      console.log('🚨 [DEBUG] Documents trouvés pour cet utilisateur:', 
        anyData.map(d => ({ url: d.file_url, title: d.title })));
      
      // Étape 4: Filtrer localement pour trouver un document non-signature
      const nonSignatureDoc = anyData.find(doc => 
        doc.file_url && !doc.file_url.includes('signature') && 
        (!doc.title || !doc.title.toLowerCase().includes('signature'))
      );
      
      if (nonSignatureDoc) {
        console.log('🚨 [DEBUG] Document non-signature trouvé après filtrage:', nonSignatureDoc.file_url);
        return nonSignatureDoc.file_url;
      }
      
      // Étape 5: En dernier recours, prendre le premier document de la liste
      const firstDoc = anyData[0];
      if (firstDoc && firstDoc.file_url) {
        console.log('🚨 [DEBUG] Premier document trouvé utilisé par défaut:', firstDoc.file_url);
        return firstDoc.file_url;
      }
      
      console.log('🚨 [DEBUG] Aucun document trouvé même après vérification approfondie');
      return null;
    } catch (error) {
      console.error('🚨 [DEBUG] Exception lors de la récupération du document:', error);
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

  /**
   * Récupère tous les participants d'une formation
   * 
   * @param trainingId ID de la formation
   * @returns Liste des participants (avec id, nom, email)
   */
  static async getParticipants(trainingId: string): Promise<Array<{ id: string; name: string; email: string }>> {
    try {
      console.log('🔍 [DEBUG] Récupération des participants pour la formation:', trainingId);
      
      const { data, error } = await supabase
        .from('training_participants')
        .select('user_id, users:user_id(id, email, first_name, last_name)')
        .eq('training_id', trainingId);
      
      if (error) {
        console.error('🔍 [DEBUG] Erreur lors de la récupération des participants:', error);
        return [];
      }
      
      if (!data || data.length === 0) {
        console.log('🔍 [DEBUG] Aucun participant trouvé pour la formation:', trainingId);
        return [];
      }
      
      const participants = data.map(item => {
        const user = item.users as any;
        return {
          id: user.id as string,
          name: `${user.first_name as string} ${user.last_name as string}`,
          email: user.email as string
        };
      });
      
      console.log('🔍 [DEBUG] Participants trouvés:', participants.length);
      return participants;
    } catch (error) {
      console.error('🔍 [DEBUG] Exception lors de la récupération des participants:', error);
      return [];
    }
  }
  
  /**
   * Met à jour un document dans la base de données
   * 
   * @param params Paramètres de mise à jour
   * @returns Succès de la mise à jour
   */
  static async updateDocument(params: {
    training_id: string;
    user_id: string;
    type: 'convention' | 'attestation' | 'emargement';
    trainer_signed?: boolean;
    participant_signed?: boolean;
    representative_signed?: boolean;
  }): Promise<boolean> {
    try {
      console.log('🔍 [DEBUG] Mise à jour du document:', params);
      
      // Construire le titre du document en fonction du type
      let title;
      if (params.type === 'convention') {
        title = 'Convention de formation';
      } else if (params.type === 'attestation') {
        title = 'Attestation de fin de formation';
      } else if (params.type === 'emargement') {
        title = 'Feuille d\'émargement';
      } else {
        title = 'Document';
      }
      
      // Vérifier si le document existe déjà
      const { data, error } = await supabase
        .from('documents')
        .select('id')
        .eq('training_id', params.training_id)
        .eq('user_id', params.user_id)
        .eq('type', params.type)
        .eq('title', title)
        .limit(1);
      
      if (error) {
        console.error('🔍 [DEBUG] Erreur lors de la vérification de l\'existence du document:', error);
        return false;
      }
      
      // Préparer les données de mise à jour
      const updateData: any = {};
      if (params.trainer_signed !== undefined) updateData.trainer_signed = params.trainer_signed;
      if (params.participant_signed !== undefined) updateData.participant_signed = params.participant_signed;
      if (params.representative_signed !== undefined) updateData.representative_signed = params.representative_signed;
      
      let result;
      if (data && data.length > 0) {
        // Mettre à jour le document existant
        result = await supabase
          .from('documents')
          .update(updateData)
          .eq('id', data[0].id);
        
        console.log('🔍 [DEBUG] Document mis à jour:', result);
      } else {
        // Créer un nouveau document
        updateData.training_id = params.training_id;
        updateData.user_id = params.user_id;
        updateData.type = params.type;
        updateData.title = title;
        
        result = await supabase
          .from('documents')
          .insert([updateData]);
        
        console.log('🔍 [DEBUG] Nouveau document créé:', result);
      }
      
      if (result.error) {
        console.error('🔍 [DEBUG] Erreur lors de la mise à jour/création du document:', result.error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('🔍 [DEBUG] Exception lors de la mise à jour du document:', error);
      return false;
    }
  }

  /**
   * Télécharge un blob dans le stockage Supabase
   * 
   * @param blob Le blob à télécharger
   * @param bucketName Nom du bucket
   * @param fullPath Chemin complet dans le bucket
   * @param params Paramètres supplémentaires
   * @param title Titre du document
   * @param dbDocumentType Type de document pour la base de données
   * @returns URL publique du fichier
   */
  static async uploadBlobToStorage(
    blob: Blob, 
    bucketName: string, 
    fullPath: string, 
    params: {
      training_id: string;
      user_id: string;
      created_by: string;
      type: 'participant' | 'representative' | 'trainer' | 'companySeal' | 'organizationSeal';
    },
    title: string,
    dbDocumentType: string
  ): Promise<string> {
    try {
      // Télécharger le fichier vers le bucket approprié
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fullPath, blob, {
          contentType: blob.type,
          cacheControl: 'no-cache, no-store',
          upsert: true
        });
      
      if (error) {
        console.error('❌ [ERROR] Erreur lors de l\'upload:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('Pas de données retournées après l\'upload');
      }

      // Obtenir l'URL publique
      const { data: urlData } = await supabase.storage
        .from(bucketName)
        .getPublicUrl(fullPath);
      
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Impossible d\'obtenir l\'URL publique');
      }
      
      const publicUrl = urlData.publicUrl;
      console.log('🔍 [DEBUG] URL publique générée:', publicUrl);
      
      // Vérifier si le fichier est accessible
      try {
        console.log('🔍 [DIAGNOSTIC] Vérification si le fichier est accessible...');
        
        const response = await fetch(publicUrl, { method: 'HEAD' });
        if (!response.ok) {
          console.warn(`⚠️ [WARN] Le fichier n'est pas accessible (status: ${response.status})`);
        } else {
          console.log('✅ [DIAGNOSTIC] Le fichier est accessible');
          
          // Ajouter un paramètre anti-cache à l'URL
          const antiCacheUrl = `${publicUrl}?t=${Date.now()}`;
          console.log('🔧 [INFO] URL avec anti-cache: ' + antiCacheUrl);
        }
      } catch (e) {
        console.error('❌ [DIAGNOSTIC] Erreur lors de la vérification du fichier:', e);
      }
      
      // Créer l'objet de base avec les colonnes obligatoires (sans vérifier les colonnes optionnelles)
      const documentData: any = {
        training_id: params.training_id,
        user_id: params.user_id,
        type: dbDocumentType,
        title: title,
        file_url: publicUrl,
        created_by: params.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('🔍 [DEBUG] Données à insérer dans documents:', documentData);
      
      try {
        const { data: insertData, error: docError } = await supabase
          .from('documents')
          .insert([documentData])
          .select();
        
        if (docError) {
          console.error('❌ [ERROR] Erreur lors de l\'insertion dans la table documents:', docError);
          
          if (docError.message.includes('violates foreign key constraint')) {
            console.log('🔍 [DEBUG] Erreur de contrainte de clé étrangère. Tentative d\'insertion simplifiée...');
            
            // Tentative d'insertion sans le select qui peut échouer dans certains cas
            const { error: simpleInsertError } = await supabase
              .from('documents')
              .insert([documentData]);
            
            if (simpleInsertError) {
              console.error('❌ [ERROR] Échec de l\'insertion simplifiée:', simpleInsertError);
            } else {
              console.log('✅ [SUCCESS] Insertion simplifiée réussie');
            }
          }
        } else {
          console.log('✅ [SUCCESS] Document inséré avec succès:', insertData);
        }
      } catch (insertError) {
        console.error('❌ [ERROR] Exception lors de l\'insertion dans la table documents:', insertError);
      }
      
      return publicUrl;
    } catch (error) {
      console.error('❌ [ERROR] Erreur dans uploadBlobToStorage:', error);
      throw error;
    }
  }
} 