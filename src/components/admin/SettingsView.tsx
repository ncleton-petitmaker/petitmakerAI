import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Save, 
  User, 
  Building2, 
  FileText, 
  Mail, 
  Phone, 
  MapPin,
  Globe,
  AlertTriangle,
  Upload,
  Loader2,
  Database
} from 'lucide-react';

// Storage bucket constants
const STORAGE_BUCKETS = {
  LOGOS: 'logos',
  SIGNATURES: 'signatures',
  ORGANIZATION_SEALS: 'signatures', // Utiliser le bucket signatures pour les tampons
  INTERNAL_RULES: 'internal-rules'
};

export const SettingsView = () => {
  const [formData, setFormData] = useState({
    company_name: 'PETITMAKER',
    siret: '928 386 044 00012',
    training_number: '32 59 13116 59',
    address: '2 rue Héraclès',
    city: 'Villeneuve-d\'Ascq',
    postal_code: '59650',
    country: 'France',
    email: 'nicolas.cleton@petitmaker.fr',
    phone: '07 60 17 72 67',
    website: 'https://petitmaker.fr',
    logo_url: '',
    signature_url: '',
    organization_seal_url: '',
    internal_rules_url: '',
    internal_rules_filename: '',
    logo_path: '',
    signature_path: '',
    organization_seal_path: '',
    internal_rules_path: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreatingBucket, setIsCreatingBucket] = useState(false);
  const [bucketMessage, setBucketMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('🔍 [DEBUG] Erreur lors de la récupération de l\'utilisateur:', userError);
        }
        
        if (user) {
          setUserId(user.id);
          console.log('🔍 [DEBUG] Utilisateur connecté:', { 
            id: user.id, 
            email: user.email,
            role: user.role,
            app_metadata: user.app_metadata,
            user_metadata: user.user_metadata,
            aud: user.aud, // Audience - important pour vérifier les autorisations
            confirmed_at: user.confirmed_at
          });
          
          // Vérifier la session active
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.error('🔍 [DEBUG] Erreur lors de la récupération de la session:', sessionError);
          } else {
            console.log('🔍 [DEBUG] Détails de la session:', {
              aud: sessionData?.session?.access_token ? JSON.parse(atob(sessionData.session.access_token.split('.')[1])).aud : null,
              exp: sessionData?.session?.expires_at ? new Date(sessionData.session.expires_at * 1000).toISOString() : null,
              tokenDetails: sessionData?.session?.access_token ? 
                { 
                  longueur: sessionData.session.access_token.length,
                  début: sessionData.session.access_token.substring(0, 10) + '...'
                } : null
            });
          }
          
          // Vérifier si l'utilisateur est un admin
          const { data: userData, error: userDataError } = await supabase
            .from('auth.users')
            .select('role')
            .eq('id', user.id)
            .single();
            
          if (userDataError) {
            console.error('🔍 [DEBUG] Erreur lors de la vérification du rôle utilisateur:', userDataError);
          }
            
          if (userData && userData.role === 'admin') {
            setIsAdmin(true);
            console.log('🔍 [DEBUG] L\'utilisateur est un administrateur');
          } else {
            // Vérifier directement les métadonnées de l'utilisateur
            if (user.app_metadata && user.app_metadata.role === 'admin') {
              setIsAdmin(true);
              console.log('🔍 [DEBUG] L\'utilisateur est un administrateur (via app_metadata)');
            }
          }
        } else {
          console.error('🔍 [DEBUG] Aucun utilisateur connecté!');
        }

        // Vérifier l'existence des buckets, notamment "organization-seals"
        console.log('🔍 [DEBUG] Vérification des buckets disponibles...');
        try {
          // Essayer avec une approche différente pour obtenir les buckets
          console.log('🔍 [DEBUG] Tentative directe d\'accès aux buckets connus...');
          const testBuckets = ['logos', 'signatures', 'organization-seals', 'internal-rules'];
          
          for (const bucketName of testBuckets) {
            const { data: filesList, error: listError } = await supabase.storage
              .from(bucketName)
              .list();
              
            console.log(`🔍 [DEBUG] Test d'accès au bucket "${bucketName}":`, {
              succès: !listError,
              erreur: listError ? listError.message : null,
              fichiers: filesList ? filesList.length : 0
            });
          }
          
          // Liste complète des buckets
          const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
          if (bucketsError) {
            console.error('🔍 [DEBUG] Erreur détaillée lors de la récupération des buckets:', {
              message: bucketsError.message,
              name: bucketsError.name,
              // Utiliser un cast sécurisé pour accéder aux propriétés potentiellement existantes
              ...(bucketsError as any)
            });
          } else {
            console.log('🔍 [DEBUG] Tous les buckets disponibles (détaillé):', buckets);
            console.log('🔍 [DEBUG] Noms des buckets disponibles:', buckets?.map(b => b.name) || []);
            
            // Vérifier si le bucket "organization-seals" existe
            const organizationSealsExists = buckets?.some(b => b.name === 'organization-seals') || false;
            console.log('🔍 [DEBUG] Le bucket "organization-seals" existe:', organizationSealsExists);
            
            // Vérifier si des noms similaires existent (casse différente, etc.)
            const similarBuckets = buckets?.filter(b => 
              b.name.toLowerCase().includes('organization') || 
              b.name.toLowerCase().includes('seal')
            ) || [];
            if (similarBuckets.length > 0) {
              console.log('🔍 [DEBUG] Buckets avec noms similaires:', similarBuckets.map(b => b.name));
            }
          }
        } catch (bucketsError) {
          console.error('🔍 [DEBUG] Exception lors de la vérification des buckets:', bucketsError);
        }
        
        // Fetch settings from Supabase
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .single();
          
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        if (data) {
          console.log('🔍 [DEBUG] Données récupérées depuis la table settings:', data);
          
          // Vérifie si organization_seal_path existe dans les données
          console.log('🔍 [DEBUG] Champ organization_seal_path présent:', 'organization_seal_path' in data);
          if ('organization_seal_path' in data && data.organization_seal_path) {
            console.log('🔍 [DEBUG] Valeur de organization_seal_path:', data.organization_seal_path);
          }
          
          // Get public URLs for files
          let organizationSealUrl = null;
          if (data.organization_seal_path) {
            try {
              organizationSealUrl = await getPublicUrl(STORAGE_BUCKETS.SIGNATURES, data.organization_seal_path);
              console.log('🔍 [DEBUG] URL du tampon récupérée:', organizationSealUrl);
            } catch (sealError) {
              console.error('Erreur lors de la récupération de l\'URL du tampon:', sealError);
            }
          }
          
          const [logoUrl, signatureUrl, internalRulesUrl] = await Promise.all([
            data.logo_path ? getPublicUrl(STORAGE_BUCKETS.LOGOS, data.logo_path) : null,
            data.signature_path ? getPublicUrl(STORAGE_BUCKETS.SIGNATURES, data.signature_path) : null,
            data.internal_rules_path ? getPublicUrl(STORAGE_BUCKETS.INTERNAL_RULES, data.internal_rules_path) : null
          ]);

          setFormData({
            ...formData,
            ...data,
            logo_url: logoUrl || '',
            signature_url: signatureUrl || '',
            organization_seal_url: organizationSealUrl || '',
            internal_rules_url: internalRulesUrl || '',
            internal_rules_filename: data.internal_rules_path ? data.internal_rules_path.split('/').pop() || '' : ''
          });
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching settings:', error);
        setError('Une erreur est survenue lors du chargement des paramètres.');
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  const getPublicUrl = async (bucket: string, path: string) => {
    try {
      console.log(`🔍 [DEBUG] Récupération de l'URL publique pour le bucket "${bucket}", chemin: "${path}"`);
      const { data } = await supabase.storage
        .from(bucket)
        .getPublicUrl(path);
      
      return data.publicUrl;
    } catch (error) {
      console.error(`Exception lors de la récupération de l'URL publique (bucket: ${bucket}, path: ${path}):`, error);
      return null;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear success/error messages when form is edited
    setSuccess(null);
    setError(null);
  };

  const sanitizeFilename = (filename: string): string => {
    // Remove accents
    const withoutAccents = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Replace spaces with underscores and remove special characters
    return withoutAccents
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9._-]/g, '');
  };

  const handleFileUpload = async (file: File, bucket: string, type: 'logo' | 'signature' | 'organization_seal' | 'internal_rules') => {
    try {
      console.log(`🔍 [DEBUG] Début de l'upload pour le type "${type}" vers le bucket "${bucket}"`);
      console.log(`🔍 [DEBUG] Détails du fichier:`, {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(2)} KB`
      });
      
      // Vérifier l'état de l'authentification
      const { data: { session } } = await supabase.auth.getSession();
      console.log(`🔍 [DEBUG] État de la session:`, {
        authentifié: !!session,
        expirationToken: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A'
      });
      
      setUploadProgress({ ...uploadProgress, [type]: 0 });
      
      // Validate file
      if (type === 'internal_rules' && file.type !== 'application/pdf') {
        throw new Error('Le règlement intérieur doit être au format PDF');
      }
      
      if ((type === 'logo' || type === 'signature' || type === 'organization_seal') && !file.type.startsWith('image/')) {
        throw new Error('Le fichier doit être une image');
      }
      
      // Max file size: 5MB
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Le fichier ne doit pas dépasser 5MB');
      }

      // Sanitize filename
      const fileExt = file.name.split('.').pop();
      let fileName = type === 'internal_rules' 
        ? sanitizeFilename(file.name)
        : `${Date.now()}.${fileExt}`;
      
      // Pour le tampon d'organisation, utiliser un nom plus descriptif avec timestamp
      if (type === 'organization_seal') {
        const timestamp = Date.now();
        fileName = `organization_seal_${timestamp}.${fileExt}`;
        console.log(`🔧 [CORRECTION] Stockage du tampon à la racine du bucket "signatures" pour éviter les problèmes d'accès`);
        console.log(`🔍 [DEBUG] Nom de fichier du tampon d'organisation: ${fileName}`);
      }
      
      console.log(`🔍 [DEBUG] Nom de fichier après traitement: "${fileName}"`);
      
      // Vérification de l'image avant upload (pour tous les types d'images)
      if (type === 'logo' || type === 'signature' || type === 'organization_seal') {
        try {
          // Créer une promesse pour vérifier que l'image peut être chargée
          await new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              console.log(`🔍 [DEBUG] Validation d'image réussie: largeur=${img.width}, hauteur=${img.height}`);
              if (img.width === 0 || img.height === 0) {
                reject(new Error("L'image a une taille de 0x0 pixels"));
              } else {
                resolve();
              }
            };
            img.onerror = () => reject(new Error("Impossible de charger l'image"));
            
            // Créer une URL temporaire pour tester l'image
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;
            // Nettoyer l'URL après utilisation
            setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
          });
          console.log(`🔍 [DEBUG] L'image est valide, poursuite de l'upload`);
        } catch (error) {
          // Typer l'erreur correctement
          const imgError = error as Error;
          console.error(`🔍 [DEBUG] Erreur lors de la validation de l'image:`, imgError);
          throw new Error(`Le fichier n'est pas une image valide: ${imgError.message}`);
        }
      }

      // Upload file avec essai multiple en cas d'échec
      console.log(`🔍 [DEBUG] Tentative d'upload vers le bucket "${bucket}"...`);
      let uploadAttempt = 0;
      let uploadSuccess = false;
      let lastError = null;
      
      while (uploadAttempt < 3 && !uploadSuccess) {
        uploadAttempt++;
        console.log(`🔍 [DEBUG] Tentative d'upload #${uploadAttempt}...`);
        
        try {
          const { error: uploadError, data } = await supabase.storage
            .from(bucket)
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: true,
              // @ts-ignore // Ignorer l'erreur de typage pour le callback onUploadProgress
              onUploadProgress: (progress: { loaded: number; total: number }) => {
                const percent = Math.round((progress.loaded * 100) / (progress.total || 1));
                setUploadProgress({ ...uploadProgress, [type]: percent });
                console.log(`🔍 [DEBUG] Progression de l'upload: ${percent}%`);
              }
            });

          if (uploadError) {
            console.error(`🔍 [DEBUG] Erreur lors de l'upload (tentative ${uploadAttempt}):`, uploadError);
            lastError = uploadError;
            
            // Vérifier si c'est une erreur de "bucket not found"
            if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('bucket not found')) {
              console.error('🔍 [DEBUG] Erreur de bucket non trouvé, tentative de création...');
              
              // On essaie de créer le bucket à la volée
              if (type === 'organization_seal' && isAdmin) {
                try {
                  // Tentative rapide de création du bucket sans attendre
                  console.log('🔍 [DEBUG] Tentative de création du bucket à la volée...');
                  await supabase.storage.createBucket('organization-seals', { public: true });
                  console.log('✅ [DEBUG] Bucket créé à la volée avec succès!');
                  
                  // Tentative de création des politiques (sans attendre la réponse)
                  try {
                    await supabase.rpc('execute_sql', {
                      sql: `
                        CREATE POLICY "Les utilisateurs peuvent ajouter des tampons"
                        ON storage.objects FOR INSERT
                        WITH CHECK (bucket_id = 'organization-seals');
                        
                        CREATE POLICY "Tout le monde peut voir les tampons"
                        ON storage.objects FOR SELECT
                        USING (bucket_id = 'organization-seals');
                      `
                    });
                    console.log('✅ Politiques créées à la volée');
                  } catch (policyError) {
                    console.error('⚠️ Erreur lors de la création des politiques:', policyError);
                  }
                  
                  // On continue sans attendre
                } catch (createError) {
                  console.error('⚠️ Échec de création du bucket à la volée:', createError);
                }
              }
            }
            
            // Attendre un peu avant la prochaine tentative
            if (uploadAttempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } else {
            console.log(`🔍 [DEBUG] Upload réussi:`, data);
            uploadSuccess = true;
          }
        } catch (error) {
          console.error(`🔍 [DEBUG] Exception lors de l'upload (tentative ${uploadAttempt}):`, error);
          lastError = error;
          
          // Attendre un peu avant la prochaine tentative
          if (uploadAttempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (!uploadSuccess) {
        const errorMessage = lastError instanceof Error ? lastError.message : 'Erreur inconnue';
        
        // Si l'erreur concerne un bucket introuvable, donnons des instructions spécifiques
        if (errorMessage.includes('Bucket not found')) {
          console.error(`🔍 [DEBUG] Erreur de bucket introuvable:`, lastError);
          throw new Error(
            `Le bucket "${bucket}" n'a pas été trouvé. Si vous êtes administrateur, utilisez le bouton "Créer bucket organization-seals" en haut de la page. Sinon, contactez votre administrateur.`
          );
        }
        
        throw lastError || new Error('Échec de l\'upload après plusieurs tentatives');
      }

      // Get public URL
      console.log(`🔍 [DEBUG] Récupération de l'URL publique...`);
      const { data: urlData } = await supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log(`🔍 [DEBUG] URL publique récupérée:`, urlData.publicUrl);

      // Update form data with new URL and path
      if (type === 'logo') {
        setFormData(prev => ({
          ...prev,
          logo_url: urlData.publicUrl,
          logo_path: fileName
        }));
      } else if (type === 'signature') {
        setFormData(prev => ({
          ...prev,
          signature_url: urlData.publicUrl,
          signature_path: fileName
        }));
      } else if (type === 'organization_seal') {
        console.log(`🔍 [DEBUG] Mise à jour du tampon d'organisation dans le formulaire`, {
          url: urlData.publicUrl,
          path: fileName
        });
        setFormData(prev => ({
          ...prev,
          organization_seal_url: urlData.publicUrl,
          organization_seal_path: fileName
        }));
      } else if (type === 'internal_rules') {
        setFormData(prev => ({
          ...prev,
          internal_rules_url: urlData.publicUrl,
          internal_rules_path: fileName,
          internal_rules_filename: file.name
        }));
      }

      setUploadProgress({ ...uploadProgress, [type]: 100 });
      console.log(`🔍 [DEBUG] Upload terminé avec succès pour le type "${type}"`);
      setTimeout(() => {
        setUploadProgress({ ...uploadProgress, [type]: 0 });
      }, 1000);

    } catch (error: unknown) {
      console.error('Error uploading file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(`Erreur lors de l'upload : ${errorMessage}`);
      setUploadProgress({ ...uploadProgress, [type]: 0 });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature' | 'organization_seal' | 'internal_rules') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Si c'est une image, et particulièrement un tampon d'organisation, prétraiter l'image
      if (type === 'organization_seal' || type === 'logo') {
        console.log(`🔍 [DEBUG] Prétraitement de l'image ${type} avant upload...`);
        
        // Créer un canvas pour redimensionner et optimiser l'image
        const optimizedFile = await new Promise<File>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            // Vérifier les dimensions de l'image
            console.log(`🔍 [DEBUG] Dimensions de l'image originale: ${img.width}x${img.height}`);
            
            // Si l'image est trop petite ou trop grande, la redimensionner
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              console.error('Impossible de créer le contexte 2D');
              resolve(file); // Utiliser le fichier original
              return;
            }
            
            // Définir les dimensions maximales souhaitées
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            
            // Calculer les nouvelles dimensions tout en préservant le ratio
            let width = img.width;
            let height = img.height;
            
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
            
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
            
            // Définir la taille du canvas
            canvas.width = width;
            canvas.height = height;
            
            // Dessiner l'image redimensionnée
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            console.log(`🔍 [DEBUG] Image optimisée: ${width}x${height}`);
            
            // Convertir le canvas en blob (PNG pour meilleure qualité des tampons)
            canvas.toBlob((blob) => {
              if (!blob) {
                console.error('Échec de conversion du canvas en blob');
                resolve(file); // Utiliser le fichier original
                return;
              }
              
              // Créer un nouveau fichier avec le blob optimisé
              const optimizedFile = new File([blob], file.name, {
                type: 'image/png',
                lastModified: Date.now()
              });
              
              console.log(`🔍 [DEBUG] Image optimisée créée avec succès: ${(optimizedFile.size / 1024).toFixed(2)} KB`);
              resolve(optimizedFile);
            }, 'image/png', 0.95);
          };
          
          img.onerror = () => {
            console.error('Erreur lors du chargement de l\'image pour prétraitement');
            reject(new Error('Format d\'image non valide'));
          };
          
          // Charger l'image
          const reader = new FileReader();
          reader.onload = (e) => {
            img.src = e.target?.result as string;
          };
          reader.onerror = () => {
            reject(new Error('Erreur de lecture du fichier'));
          };
          reader.readAsDataURL(file);
        });
        
        // Utiliser le fichier optimisé pour l'upload
        console.log(`🔍 [DEBUG] Utilisation du fichier optimisé pour l'upload de ${type}`);
        const bucket = type === 'logo' ? STORAGE_BUCKETS.LOGOS : STORAGE_BUCKETS.SIGNATURES;
        await handleFileUpload(optimizedFile, bucket, type);
        return;
      }
    } catch (error) {
      console.error(`🔍 [DEBUG] Erreur lors du prétraitement de l'image:`, error);
      setError(`Erreur lors du prétraitement de l'image: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      return;
    }

    // Déterminer le bucket en fonction du type de fichier
    let bucket: string;
    
    switch (type) {
      case 'logo':
        bucket = STORAGE_BUCKETS.LOGOS;
        break;
      case 'signature':
        bucket = STORAGE_BUCKETS.SIGNATURES;
        break;
      case 'organization_seal':
        bucket = STORAGE_BUCKETS.SIGNATURES;
        break;
      case 'internal_rules':
        bucket = STORAGE_BUCKETS.INTERNAL_RULES;
        break;
      default:
        bucket = STORAGE_BUCKETS.SIGNATURES;
        break;
    }
    
    console.log(`🔍 [DEBUG] Type de fichier: ${type}, Bucket sélectionné: ${bucket}`);
    await handleFileUpload(file, bucket, type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSaving(true);
    setSuccess(null);
    setError(null);
    
    try {
      console.log('🔍 [DEBUG] Début de l\'enregistrement des paramètres...');
      console.log('🔍 [DEBUG] Données à enregistrer:', {
        ...formData,
        logo_path: formData.logo_path,
        signature_path: formData.signature_path,
        organization_seal_path: formData.organization_seal_path,
        internal_rules_path: formData.internal_rules_path
      });
      
      // Save settings to Supabase
      const { error: saveError, data } = await supabase
        .from('settings')
        .upsert({
          id: 1, // Use a fixed ID for the single settings record
          company_name: formData.company_name,
          siret: formData.siret,
          training_number: formData.training_number,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postal_code,
          country: formData.country,
          email: formData.email,
          phone: formData.phone,
          website: formData.website,
          logo_path: formData.logo_path,
          signature_path: formData.signature_path,
          organization_seal_path: formData.organization_seal_path,
          internal_rules_path: formData.internal_rules_path,
          updated_at: new Date().toISOString()
        });
        
      if (saveError) {
        console.error('🔍 [DEBUG] Erreur lors de l\'enregistrement:', saveError);
        throw saveError;
      }
      
      console.log('🔍 [DEBUG] Paramètres enregistrés avec succès:', data);
      setSuccess('Les paramètres ont été enregistrés avec succès.');
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Une erreur est survenue lors de l\'enregistrement des paramètres.');
    } finally {
      setIsSaving(false);
    }
  };

  // Fonction pour créer le bucket organization-seals
  const handleCreateBucket = async () => {
    try {
      setBucketMessage(null);
      setIsCreatingBucket(true);
      console.log('🔍 [DEBUG] Début de la création du bucket organization-seals...');
      
      // Vérifier si le bucket existe déjà
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('🔍 [DEBUG] Erreur lors de la vérification des buckets:', bucketsError);
        throw bucketsError;
      }
      
      console.log('🔍 [DEBUG] Liste des buckets existants:', buckets?.map(b => b.name) || []);
      const bucketExists = buckets?.some(b => b.name === 'organization-seals') || false;
      
      if (bucketExists) {
        console.log('🔍 [DEBUG] Le bucket organization-seals existe déjà');
        setBucketMessage('Le bucket organization-seals existe déjà.');
      } else {
        // Créer le bucket
        console.log('🔍 [DEBUG] Création du bucket organization-seals...');
        const createResult = await supabase.storage.createBucket('organization-seals', {
          public: true
        });
        
        console.log('🔍 [DEBUG] Résultat de la création du bucket:', createResult);
        
        if (createResult.error) {
          console.error('🔍 [DEBUG] Erreur lors de la création du bucket:', createResult.error);
          
          // Si erreur avec l'API, essayer la méthode SQL
          console.log('🔍 [DEBUG] Tentative de création via SQL après échec de l\'API...');
          return handleCreateBucketWithSQL();
        }
        
        console.log('🔍 [DEBUG] Bucket organization-seals créé avec succès');
        setBucketMessage('Bucket organization-seals créé avec succès.');
      }
      
      // Appliquer directement les politiques du bucket
      console.log('🔍 [DEBUG] Configuration des politiques pour le bucket...');
      
      try {
        // 1. Créer la politique pour permettre aux administrateurs d'ajouter des tampons
        const adminInsertResult = await supabase.rpc('execute_sql', {
          sql: `
            CREATE POLICY "Les administrateurs peuvent ajouter des tampons"
            ON storage.objects FOR INSERT
            WITH CHECK (
              bucket_id = 'organization-seals'
              AND (auth.role() = 'authenticated' AND EXISTS (
                SELECT 1 FROM auth.users
                WHERE auth.users.id = auth.uid() 
                AND auth.users.role = 'admin'
              ))
            );
          `
        });
        console.log('🔍 [DEBUG] Résultat création politique admin insert:', adminInsertResult);
        
        // 2. Créer la politique pour permettre aux utilisateurs authentifiés d'ajouter des tampons
        const userInsertResult = await supabase.rpc('execute_sql', {
          sql: `
            CREATE POLICY "Les utilisateurs peuvent ajouter des tampons"
            ON storage.objects FOR INSERT
            WITH CHECK (
              bucket_id = 'organization-seals'
              AND auth.role() = 'authenticated'
            );
          `
        });
        console.log('🔍 [DEBUG] Résultat création politique user insert:', userInsertResult);
        
        // 3. Créer la politique pour permettre à tout le monde de voir les tampons
        const selectResult = await supabase.rpc('execute_sql', {
          sql: `
            CREATE POLICY "Tout le monde peut voir les tampons"
            ON storage.objects FOR SELECT
            USING (
              bucket_id = 'organization-seals'
            );
          `
        });
        console.log('🔍 [DEBUG] Résultat création politique select:', selectResult);
        
        console.log('🔍 [DEBUG] Politiques configurées avec succès');
        setBucketMessage((prev) => `${prev || ''} Politiques configurées avec succès.`);
      } catch (policyError) {
        console.error('🔍 [DEBUG] Erreur lors de la configuration des politiques (méthode directe):', policyError);
        
        // Essayer avec la fonction RPC comme alternative
        try {
          console.log('🔍 [DEBUG] Tentative d\'utilisation de la fonction RPC...');
          const { error: policiesError } = await supabase.rpc('configure_organization_seals_policies');
          
          if (policiesError) {
            console.error('🔍 [DEBUG] Erreur lors de la configuration des politiques via RPC:', policiesError);
            setBucketMessage((prev) => `${prev || ''} Erreur lors de la configuration des politiques. Veuillez exécuter le script SQL manuellement.`);
          } else {
            console.log('🔍 [DEBUG] Politiques configurées avec succès via RPC');
            setBucketMessage((prev) => `${prev || ''} Politiques configurées avec succès.`);
          }
        } catch (rpcError) {
          console.error('🔍 [DEBUG] Exception lors de l\'appel RPC:', rpcError);
          setBucketMessage((prev) => `${prev || ''} Erreur lors de la configuration des politiques. Le bucket a été créé mais les politiques doivent être configurées manuellement.`);
        }
      }
      
      // Vérifier que le bucket a bien été créé
      const { data: updatedBuckets } = await supabase.storage.listBuckets();
      if (updatedBuckets) {
        console.log('🔍 [DEBUG] Liste des buckets après création:', updatedBuckets.map(b => b.name));
        const bucketNowExists = updatedBuckets.some(b => b.name === 'organization-seals');
        console.log('🔍 [DEBUG] Le bucket organization-seals existe maintenant:', bucketNowExists);
      } else {
        console.error('🔍 [DEBUG] Impossible de récupérer la liste des buckets après création');
      }
      
    } catch (error) {
      console.error('Erreur lors de la création du bucket:', error);
      setBucketMessage(`Erreur: ${error instanceof Error ? error.message : 'Une erreur est survenue'}`);
    } finally {
      setIsCreatingBucket(false);
    }
  };

  // Fonction pour créer le bucket organization-seals avec SQL direct
  const handleCreateBucketWithSQL = async () => {
    try {
      setBucketMessage(null);
      setIsCreatingBucket(true);
      console.log('🔍 [DEBUG] Tentative de création du bucket via SQL direct (méthode simplifiée)...');
      
      // Afficher l'utilisateur pour le debug
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 [DEBUG] Utilisateur pour la création du bucket:', user?.id);
      
      // Tentative avec une requête SQL très simple
      const { data: sqlResult, error: sqlError } = await supabase.rpc('create_bucket_organization_seals');
      
      console.log('🔍 [DEBUG] Résultat de l\'appel RPC:', {
        data: sqlResult,
        error: sqlError ? {
          message: sqlError.message,
          name: sqlError.name,
          code: (sqlError as any).code
        } : null
      });
      
      if (sqlError) {
        // Essayons une autre méthode - insertion directe via une requête simple
        console.log('🔍 [DEBUG] Erreur RPC, tentative avec SQL normal...');
        const { data: directResult, error: directError } = await supabase
          .from('storage_buckets_manual')
          .insert({
            name: 'organization-seals',
            owner: user?.id,
            public: true,
            file_size_limit: 5242880, // 5MB en octets
          });
          
        console.log('🔍 [DEBUG] Résultat insert direct:', {
          data: directResult,
          error: directError ? {
            message: directError.message, 
            code: (directError as any).code
          } : null
        });
        
        if (directError) {
          console.error('🔍 [DEBUG] Échec avec les deux méthodes');
          throw directError;
        }
        
        console.log('🔍 [DEBUG] Création directe réussie');
        setBucketMessage('Bucket "organization-seals" créé avec succès via SQL direct. Veuillez rafraîchir la page.');
      } else {
        console.log('🔍 [DEBUG] Création RPC réussie');
        setBucketMessage('Bucket "organization-seals" créé avec succès via RPC. Veuillez rafraîchir la page et réessayer l\'upload.');
      }
      
      // Vérifier que le bucket a bien été créé
      const { data: updatedBuckets } = await supabase.storage.listBuckets();
      if (updatedBuckets) {
        console.log('🔍 [DEBUG] Liste des buckets après création SQL:', updatedBuckets.map(b => b.name));
        const bucketNowExists = updatedBuckets.some(b => b.name === 'organization-seals');
        console.log('🔍 [DEBUG] Le bucket organization-seals existe maintenant:', bucketNowExists);
      }
      
    } catch (error) {
      console.error('Erreur lors de la création du bucket via SQL:', error);
      setBucketMessage(`Erreur lors de la création via SQL: ${error instanceof Error ? error.message : 'Une erreur est survenue'}. Contactez l'administrateur système pour résoudre ce problème de permission.`);
    } finally {
      setIsCreatingBucket(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Paramètres</h2>
        
        {/* Bouton administrateur pour créer le bucket */}
        {isAdmin && (
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleCreateBucket}
              disabled={isCreatingBucket}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingBucket ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                  Création du bucket...
                </>
              ) : (
                <>
                  <Database className="-ml-1 mr-2 h-5 w-5" />
                  Créer bucket organization-seals
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={handleCreateBucketWithSQL}
              disabled={isCreatingBucket}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Essayer de créer le bucket directement avec une requête SQL si la méthode standard ne fonctionne pas"
            >
              {isCreatingBucket ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" />
                  Création via SQL...
                </>
              ) : (
                <>
                  <Database className="-ml-1 mr-2 h-5 w-5" />
                  Méthode SQL directe
                </>
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Message de création du bucket */}
      {bucketMessage && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
          {bucketMessage}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {success}
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
        
        {/* Organization Information */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <Building2 className="mr-2 h-5 w-5 text-indigo-500" />
                Informations de l'organisme
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Ces informations apparaîtront sur les documents générés.
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                  Nom de l'organisme
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="company_name"
                    id="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="siret" className="block text-sm font-medium text-gray-700">
                  SIRET
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="siret"
                    id="siret"
                    value={formData.siret}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="training_number" className="block text-sm font-medium text-gray-700">
                  Numéro d'organisme de formation (DA)
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="training_number"
                    id="training_number"
                    value={formData.training_number}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Adresse
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="address"
                    id="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  Ville
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="city"
                    id="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                  Code postal
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="postal_code"
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                  Pays
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="country"
                    id="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Téléphone
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                  Site web
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Globe className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="website"
                    id="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Document Templates */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <FileText className="mr-2 h-5 w-5 text-indigo-500" />
                Modèles de documents
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Personnalisez les modèles de documents générés.
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="logo" className="block text-sm font-medium text-gray-700">
                  Logo
                </label>
                <div className="mt-1 flex items-center">
                  <div className="h-12 w-12 overflow-hidden rounded-md bg-gray-100 flex items-center justify-center">
                    {formData.logo_url ? (
                      <img src={formData.logo_url} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="ml-4 flex">
                    <div className="relative bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm flex items-center cursor-pointer hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <label
                        htmlFor="logo-upload"
                        className="relative text-sm font-medium text-indigo-600 pointer-events-none"
                      >
                        <span>{formData.logo_url ? 'Changer' : 'Ajouter'}</span>
                        <span className="sr-only"> le logo</span>
                      </label>
                      <input
                        id="logo-upload"
                        name="logo-upload"
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => handleFileChange(e, 'logo')}
                      />
                    </div>
                    {uploadProgress.logo > 0 && uploadProgress.logo < 100 && (
                      <div className="ml-4 flex items-center">
                        <Loader2 className="animate-spin h-5 w-5 text-indigo-500" />
                        <span className="ml-2 text-sm text-gray-500">{uploadProgress.logo}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="signature" className="block text-sm font-medium text-gray-700">
                  Signature
                </label>
                <div className="mt-1 flex items-center">
                  <div className="h-12 w-24 overflow-hidden rounded-md bg-gray-100 flex items-center justify-center">
                    {formData.signature_url ? (
                      <img src={formData.signature_url} alt="Signature" className="h-full w-full object-contain" />
                    ) : (
                      <User className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="ml-4 flex">
                    <div className="relative bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm flex items-center cursor-pointer hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <label
                        htmlFor="signature-upload"
                        className="relative text-sm font-medium text-indigo-600 pointer-events-none"
                      >
                        <span>{formData.signature_url ? 'Changer' : 'Ajouter'}</span>
                        <span className="sr-only"> la signature</span>
                      </label>
                      <input
                        id="signature-upload"
                        name="signature-upload"
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => handleFileChange(e, 'signature')}
                      />
                    </div>
                    {uploadProgress.signature > 0 && uploadProgress.signature < 100 && (
                      <div className="ml-4 flex items-center">
                        <Loader2 className="animate-spin h-5 w-5 text-indigo-500" />
                        <span className="ml-2 text-sm text-gray-500">{uploadProgress.signature}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Ajout du tampon de l'organisme */}
              <div className="sm:col-span-3">
                <label htmlFor="organization-seal" className="block text-sm font-medium text-gray-700">
                  Tampon de l'organisme
                </label>
                <div className="mt-1 flex items-center">
                  <div className="h-12 w-24 overflow-hidden rounded-md bg-gray-100 flex items-center justify-center">
                    {formData.organization_seal_url ? (
                      <img src={formData.organization_seal_url} alt="Tampon de l'organisme" className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="ml-4 flex">
                    <div className="relative bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm flex items-center cursor-pointer hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <label
                        htmlFor="organization-seal-upload"
                        className="relative text-sm font-medium text-indigo-600 pointer-events-none"
                      >
                        <span>{formData.organization_seal_url ? 'Changer' : 'Ajouter'}</span>
                        <span className="sr-only"> le tampon</span>
                      </label>
                      <input
                        id="organization-seal-upload"
                        name="organization-seal-upload"
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => handleFileChange(e, 'organization_seal')}
                      />
                    </div>
                    {uploadProgress.organization_seal > 0 && uploadProgress.organization_seal < 100 && (
                      <div className="ml-4 flex items-center">
                        <Loader2 className="animate-spin h-5 w-5 text-indigo-500" />
                        <span className="ml-2 text-sm text-gray-500">{uploadProgress.organization_seal}%</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Ce tampon sera utilisé sur les conventions de formation et autres documents officiels.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Règlement Intérieur */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <FileText className="mr-2 h-5 w-5 text-indigo-500" />
                Règlement Intérieur
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Téléchargez le règlement intérieur qui sera accessible aux apprenants.
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label htmlFor="internal-rules" className="block text-sm font-medium text-gray-700">
                  Règlement intérieur (PDF)
                </label>
                <div className="mt-2 flex items-center">
                  {formData.internal_rules_url ? (
                    <div className="flex items-center space-x-4">
                      <a 
                        href={formData.internal_rules_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Voir le document
                      </a>
                      <span className="text-sm text-gray-500">
                        {formData.internal_rules_filename || 'reglement-interieur.pdf'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Aucun document téléchargé</span>
                  )}
                </div>
                <div className="mt-2 flex">
                  <div className="relative bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm flex items-center cursor-pointer hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                    <label
                      htmlFor="internal-rules-upload"
                      className="relative text-sm font-medium text-indigo-600 pointer-events-none"
                    >
                      <span>{formData.internal_rules_url ? 'Changer' : 'Ajouter'} le document</span>
                    </label>
                    <input
                      id="internal-rules-upload"
                      name="internal-rules-upload"
                      type="file"
                      accept=".pdf"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => handleFileChange(e, 'internal_rules')}
                    />
                  </div>
                  {uploadProgress.internal_rules > 0 && uploadProgress.internal_rules < 100 && (
                    <div className="ml-4 flex items-center">
                      <Loader2 className="animate-spin h-5 w-5 text-indigo-500" />
                      <span className="ml-2 text-sm text-gray-500">{uploadProgress.internal_rules}%</span>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Format PDF uniquement. Taille maximale: 5 MB.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="-ml-1 mr-2 h-5 w-5" />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};