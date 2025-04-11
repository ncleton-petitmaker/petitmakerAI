import { supabase } from '../../../supabase-tools/supabase-client';

/**
 * Créer un nouveau fichier
 * @param {Object} fileData - Les données du fichier (name, url)
 * @returns {Promise} - La réponse de l'API
 */
export async function createFile(fileData) {
  try {
    const { data, error } = await supabase
      .from('files')
      .insert(fileData)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de la création du fichier:', error);
    return { success: false, error };
  }
}

/**
 * Récupérer un fichier par son ID
 * @param {string} fileId - L'ID du fichier
 * @returns {Promise} - La réponse de l'API
 */
export async function getFile(fileId) {
  try {
    const { data, error } = await supabase
      .from('files')
      .select()
      .eq('id', fileId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de la récupération du fichier:', error);
    return { success: false, error };
  }
}

/**
 * Supprimer un fichier
 * @param {string} fileId - L'ID du fichier
 * @returns {Promise} - La réponse de l'API
 */
export async function deleteFile(fileId) {
  try {
    // Vérifier si le fichier est utilisé par un modèle d'email
    const { data: emailTemplates, error: templateError } = await supabase
      .from('email_templates')
      .select('id')
      .eq('file_id', fileId);

    if (templateError) throw templateError;

    // Si le fichier est utilisé, ne pas le supprimer
    if (emailTemplates && emailTemplates.length > 0) {
      return { 
        success: false, 
        error: { 
          message: 'Ce fichier est utilisé par un ou plusieurs modèles d\'email et ne peut pas être supprimé.' 
        } 
      };
    }

    // Supprimer le fichier de la base de données
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la suppression du fichier:', error);
    return { success: false, error };
  }
}

/**
 * Récupérer la liste de tous les fichiers
 * @returns {Promise} - La réponse de l'API
 */
export async function listFiles() {
  try {
    const { data, error } = await supabase
      .from('files')
      .select()
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de la récupération des fichiers:', error);
    return { success: false, error };
  }
}

/**
 * Télécharger un fichier vers le bucket Supabase Storage
 * @param {File} file - Le fichier à télécharger
 * @param {string} path - Le chemin dans le bucket (ex: 'email-attachments')
 * @returns {Promise} - La réponse de l'API avec l'URL du fichier
 */
export async function uploadFile(file, path = 'email-attachments') {
  try {
    // Génération d'un nom de fichier unique
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
    const filePath = `${path}/${fileName}`;
    
    // Téléchargement du fichier vers Supabase Storage
    const { data, error } = await supabase.storage
      .from('files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    
    // Récupération de l'URL publique du fichier
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(filePath);
    
    // Enregistrement du fichier dans la base de données
    const fileRecord = {
      name: file.name,
      url: publicUrl
    };
    
    const { data: dbFile, error: dbError } = await supabase
      .from('files')
      .insert(fileRecord)
      .select();
    
    if (dbError) throw dbError;
    
    return { success: true, data: dbFile[0] };
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error);
    return { success: false, error };
  }
} 