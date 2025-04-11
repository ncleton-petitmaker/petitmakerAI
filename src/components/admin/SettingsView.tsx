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
  Database,
  Cog,
  ExternalLink,
  Info,
  Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { ViewType } from './AdminSidebar';
import GoogleAuthButton from './GoogleAuthButton';
import { Input } from '../ui/input';

// Storage bucket constants
const STORAGE_BUCKETS = {
  LOGOS: 'logos',
  SIGNATURES: 'signatures',
  ORGANIZATION_SEALS: 'signatures', // Utiliser le bucket signatures pour les tampons
  INTERNAL_RULES: 'internal-rules'
};

// Define file types
type FileType = 'logo' | 'signature' | 'organization_seal' | 'internal_rules';

export const SettingsView = ({ setCurrentView }: { setCurrentView: (view: ViewType) => void }) => {
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
  const [googleEmail, setGoogleEmail] = useState<string>('');
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);
  const [isGmailConfigExpanded, setIsGmailConfigExpanded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        
        // Vérifier s'il y a un code d'authentification Google dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');
        const oauthCallback = urlParams.get('oauth_callback');
        
        if (authCode && oauthCallback === 'google') {
          console.log('🔍 [DEBUG] Code d\'authentification Google détecté dans l\'URL');
          
          try {
            // Traiter le code d'authentification
            await handleOAuthCallback(authCode);
            
            // Nettoyer l'URL pour enlever les paramètres OAuth
            const url = new URL(window.location.href);
            url.searchParams.delete('code');
            url.searchParams.delete('scope');
            url.searchParams.delete('oauth_callback');
            window.history.replaceState({}, document.title, url.toString());
          } catch (oauthError) {
            console.error('Erreur lors du traitement du code d\'authentification:', oauthError);
          }
        }
        
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

          // Ajouter le chargement des informations Google
          setGoogleEmail(data.google_email_sender || '');
          setIsGoogleConnected(!!data.google_oauth_enabled);
          
          // Vérifier si les tokens sont encore valides
          if (data.google_oauth_enabled && data.google_oauth_token_expiry) {
            const tokenExpiry = new Date(data.google_oauth_token_expiry);
            const isTokenExpired = tokenExpiry < new Date();
            
            if (isTokenExpired) {
              console.log('🔍 [DEBUG] Le token Google est expiré, tentative de rafraîchissement...');
              
              // Si le token est expiré, essayer de le rafraîchir
              if (data.google_oauth_refresh_token) {
                try {
                  const refreshResponse = await supabase.functions.invoke('google-oauth-token-exchange', {
                    body: { 
                      refresh_token: data.google_oauth_refresh_token,
                      is_refresh: true
                    }
                  });
                  
                  if (refreshResponse.error) {
                    console.error('🔍 [DEBUG] Erreur lors du rafraîchissement du token:', refreshResponse.error);
                    setIsGoogleConnected(false);
                  } else {
                    console.log('🔍 [DEBUG] Token rafraîchi avec succès');
                  }
                } catch (refreshError) {
                  console.error('🔍 [DEBUG] Exception lors du rafraîchissement du token:', refreshError);
                  setIsGoogleConnected(false);
                }
              } else {
                console.log('🔍 [DEBUG] Aucun refresh token disponible, marqué comme déconnecté');
                setIsGoogleConnected(false);
              }
            } else {
              console.log('🔍 [DEBUG] Le token Google est encore valide, expiration:', tokenExpiry.toISOString());
            }
          }

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
    // Remove any path info (just in case)
    return filename.replace(/^.*[\\\/]/, '')
      // Remove special characters
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      // Convert to lowercase
      .toLowerCase();
  };

  const handleFileUpload = async (file: File, bucket: string, type: FileType) => {
    try {
      console.log(`🔍 [DEBUG] Début de l'upload pour le type "${type}" vers le bucket "${bucket}"`);
      setUploadProgress({ ...uploadProgress, [type]: 0 });
      
      // Create a sanitized filename
      let fileName = type === 'internal_rules'
        ? `internal_rules_${Date.now()}_${sanitizeFilename(file.name)}`
        : `${type}_${userId}_${Date.now()}.${file.name.split('.').pop()}`;
        
      // For organization seals, add a prefix for clarity
      if (type === 'organization_seal') {
        fileName = `org_seal_${userId}_${Date.now()}.${file.name.split('.').pop()}`;
      }
      
      console.log(`🔍 [DEBUG] Nom de fichier généré: ${fileName}`);
      
      // Process image files
      if (type === 'logo' || type === 'signature' || type === 'organization_seal') {
        // ... existing image processing code ...
      }
      
      // ... rest of upload logic ...
    } catch (error) {
      // ... error handling ...
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: FileType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError(null);
    setSuccess(null);
    
    // Validate file type
    if (type === 'internal_rules' && file.type !== 'application/pdf') {
      setError("Le règlement intérieur doit être un fichier PDF.");
      return;
    }
    
    if ((type === 'logo' || type === 'signature' || type === 'organization_seal') && !file.type.startsWith('image/')) {
      setError("Le fichier doit être une image (PNG, JPG, JPEG, SVG).");
      return;
    }
    
    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      setError("La taille du fichier ne doit pas dépasser 5 Mo.");
      return;
    }
    
    // Get appropriante bucket based on file type
    let bucket = '';
    if (type === 'logo') {
      bucket = STORAGE_BUCKETS.LOGOS;
    } else if (type === 'internal_rules') {
      bucket = STORAGE_BUCKETS.INTERNAL_RULES;
    } else {
      // Both 'signature' and 'organization_seal' use the signatures bucket
      bucket = STORAGE_BUCKETS.SIGNATURES;
    }
    
    // Proceed with upload
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

  // Gérer le changement de statut de connexion Google
  const handleGoogleStatusChange = (connected: boolean) => {
    setIsGoogleConnected(connected);
  };

  // Gérer le changement d'email d'expéditeur Google
  const handleGoogleEmailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setGoogleEmail(email);
    
    // Mettre à jour la configuration immédiatement
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('settings')
        .update({ google_email_sender: email })
        .eq('id', 1);
      
      if (error) {
        throw error;
      }
      
      setSuccess('Adresse email d\'expéditeur mise à jour avec succès.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'email d\'expéditeur:', error);
      setError('Erreur lors de la mise à jour de l\'email d\'expéditeur.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDirectConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Définir les paramètres OAuth
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '326011143555-2ajkb3kul9rqm2fcc58vr8tpug4j15p7.apps.googleusercontent.com';
      const redirectUri = window.location.origin + '/admin?oauth_callback=google';
      
      // Définir les scopes nécessaires pour Gmail
      const scopes = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email'
      ];
      
      // Construire l'URL d'authentification
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scopes.join(' '));
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      
      console.log('🔍 [DEBUG] URL d\'authentification Google:', authUrl.toString());
      
      // Ouvrir la fenêtre d'authentification
      const authWindow = window.open(authUrl.toString(), '_blank', 'width=600,height=700');
      
      if (!authWindow) {
        throw new Error('La fenêtre d\'authentification a été bloquée. Veuillez autoriser les pop-ups pour ce site.');
      }
      
      // Stocker temporairement l'état de la fenêtre pour vérification après redirection
      localStorage.setItem('googleOAuthPending', 'true');
      
      // Vérifier si nous avons un code dans l'URL (après redirection)
      const checkForOAuthCallback = () => {
        if (window.location.search.includes('oauth_callback=google')) {
          const urlParams = new URLSearchParams(window.location.search);
          const authCode = urlParams.get('code');
          
          if (authCode) {
            console.log('🔍 [DEBUG] Code d\'authentification reçu:', authCode);
            handleOAuthCallback(authCode);
          }
        }
      };
      
      // Vérifier si nous avons déjà un code d'authentification (si redirection s'est déjà produite)
      checkForOAuthCallback();
      
      // Également vérifier périodiquement le localStorage pour voir si l'authentification a été complétée
      const checkInterval = setInterval(() => {
        if (localStorage.getItem('googleOAuthComplete') === 'true') {
          clearInterval(checkInterval);
          setIsGoogleConnected(true);
          localStorage.removeItem('googleOAuthComplete');
          localStorage.removeItem('googleOAuthPending');
          setSuccess('Connexion à Google Gmail établie avec succès.');
        }
      }, 1000);
      
      // Arrêter la vérification après 2 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isGoogleConnected) {
          setError('Délai d\'authentification dépassé. Veuillez réessayer.');
        }
      }, 120000);
      
    } catch (error) {
      console.error('Erreur lors de la connexion directe à Google:', error);
      setError('Erreur lors de la connexion à Google: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  // Gérer le callback OAuth après redirection
  const handleOAuthCallback = async (authCode: string) => {
    try {
      console.log('🔍 [DEBUG] Traitement du callback OAuth avec le code:', authCode);
      
      // Échanger le code contre un token via votre backend ou une fonction Edge
      const exchangeTokenResponse = await supabase.functions.invoke('google-oauth-token-exchange', {
        body: { 
          code: authCode,
          redirect_uri: window.location.origin + '/admin?oauth_callback=google'
        }
      });
      
      if (exchangeTokenResponse.error) {
        throw new Error(`Erreur lors de l'échange du code: ${exchangeTokenResponse.error.message}`);
      }
      
      const { refresh_token, access_token, expires_in, email } = exchangeTokenResponse.data;
      
      // Sauvegarder les tokens dans Supabase
      const { error: saveError } = await supabase
        .from('settings')
        .update({
          google_oauth_enabled: true,
          google_oauth_refresh_token: refresh_token,
          google_oauth_access_token: access_token,
          google_oauth_token_expiry: new Date(Date.now() + expires_in * 1000).toISOString(),
          google_email_sender: email || googleEmail
        })
        .eq('id', 1);
      
      if (saveError) {
        throw saveError;
      }
      
      // Marquer l'authentification comme complétée
      localStorage.setItem('googleOAuthComplete', 'true');
      setIsGoogleConnected(true);
      if (email && email !== googleEmail) {
        setGoogleEmail(email);
      }
      setSuccess('Connexion à Google Gmail établie avec succès.');
      
      // Nettoyer l'URL pour enlever les paramètres OAuth
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      url.searchParams.delete('scope');
      url.searchParams.delete('oauth_callback');
      window.history.replaceState({}, document.title, url.toString());
      
    } catch (error) {
      console.error('Erreur lors du traitement du callback OAuth:', error);
      setError('Erreur lors du traitement de l\'authentification: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  };

  const handleDirectDisconnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 [DEBUG] Déconnexion de Google...');
      
      // Désactiver l'intégration Google dans la base de données
      const { error: saveError } = await supabase
        .from('settings')
        .update({
          google_oauth_enabled: false,
          google_oauth_refresh_token: null,
          google_oauth_access_token: null, 
          google_oauth_token_expiry: null
        })
        .eq('id', 1);
      
      if (saveError) {
        throw saveError;
      }
      
      setIsGoogleConnected(false);
      setSuccess('Déconnexion de Google Gmail réussie.');
    } catch (error) {
      console.error('Erreur lors de la déconnexion de Google:', error);
      setError('Erreur lors de la déconnexion: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      setLoading(false);
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
    <div className="container mx-auto py-6 space-y-8">
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
      
      {/* Additional Settings Cards */}
      <div className="grid grid-cols-1 gap-6 mt-8">
        {/* Gmail Configuration Card */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg" id="gmail-config-card">
          <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <Mail className="mr-2 h-5 w-5 text-indigo-500" />
                Configuration Gmail
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Connectez-vous à Google pour envoyer des emails via Gmail
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {isLoading ? (
              <div className="flex justify-center items-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Pourquoi connecter Gmail ?</p>
                      <p>Cette connexion permet d'envoyer des emails automatiques, notifications et documents aux apprenants et formateurs via Gmail.</p>
                      <button 
                        className="text-blue-600 hover:text-blue-800 underline mt-2"
                        onClick={() => setIsGmailConfigExpanded(!isGmailConfigExpanded)}
                      >
                        {isGmailConfigExpanded ? "Masquer les détails" : "Afficher plus de détails"}
                      </button>
                      
                      {isGmailConfigExpanded && (
                        <ol className="list-decimal list-inside mt-2 ml-2 space-y-1">
                          <li>Cliquez sur "Se connecter à Google Gmail"</li>
                          <li>Dans la fenêtre qui s'ouvre, connectez-vous à votre compte Google</li>
                          <li>Autorisez les permissions demandées pour l'envoi d'emails</li>
                          <li>Spécifiez l'adresse email qui sera utilisée comme expéditeur</li>
                        </ol>
                      )}
                    </div>
                  </div>
                </div>
                
                {error && (
                  <div className="flex items-center space-x-2 text-red-600 text-sm mb-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <AlertTriangle size={16} />
                    <span>Erreur de connexion à Google. Vérifiez la configuration des fonctions Edge dans Supabase.</span>
                  </div>
                )}
                
                {isGoogleConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-green-600 text-sm mb-2 p-3 bg-green-50 border border-green-200 rounded-md">
                      <Check size={16} />
                      <span>Connecté à Google Gmail{googleEmail ? ` avec l'adresse ${googleEmail}` : ''}</span>
                    </div>
                    
                    <div className="mt-4">
                      <label htmlFor="google_email_sender" className="block text-sm font-medium text-gray-700 mb-1">
                        Adresse email de l'expéditeur
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="google_email_sender"
                          type="email"
                          value={googleEmail}
                          onChange={handleGoogleEmailChange}
                          placeholder="Ex: formations@votre-entreprise.com"
                          className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Cette adresse sera utilisée comme expéditeur pour tous les emails envoyés via Gmail
                      </p>
                    </div>
                    
                    <button
                      onClick={handleDirectDisconnect}
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 w-full justify-center"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                          Déconnexion en cours...
                        </>
                      ) : (
                        'Déconnecter Google Gmail'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div className="text-sm text-amber-700">
                          <p className="font-medium">Configuration requise</p>
                          <p className="mt-1">Vous devez connecter un compte Google pour permettre l'envoi d'emails. Sans cette connexion, les notifications et documents ne pourront pas être envoyés automatiquement.</p>
                        </div>
                      </div>
                    </div>
                  
                    <button
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 w-full justify-center"
                      disabled={loading}
                      onClick={handleDirectConnect}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                          Connexion en cours...
                        </>
                      ) : (
                        <>
                          <Mail size={16} className="mr-2" />
                          Se connecter à Google Gmail
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Email Errors Report Card */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-indigo-500" />
                Rapport d'erreurs d'emails
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Consultez les erreurs survenues lors de l'envoi d'emails
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <p className="text-sm text-gray-600 mb-4">
              Accédez aux rapports détaillés des erreurs d'envoi d'emails pour diagnostiquer
              et résoudre les problèmes de communication avec vos apprenants.
            </p>
            
            <button
              onClick={() => setCurrentView('email-errors')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Consulter les erreurs d'envoi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};