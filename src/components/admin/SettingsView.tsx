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
  Loader2
} from 'lucide-react';

const LOGO_BUCKET = 'logos';
const SIGNATURE_BUCKET = 'signatures';
const INTERNAL_RULES_BUCKET = 'internal-rules';

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
    internal_rules_url: '',
    internal_rules_filename: '',
    logo_path: '',
    signature_path: '',
    internal_rules_path: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
        
        // Ensure buckets exist
        await Promise.all([
          ensureBucketExists(LOGO_BUCKET),
          ensureBucketExists(SIGNATURE_BUCKET),
          ensureBucketExists(INTERNAL_RULES_BUCKET)
        ]);
        
        // Fetch settings from Supabase
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .single();
          
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        if (data) {
          // Get public URLs for files
          const [logoUrl, signatureUrl, internalRulesUrl] = await Promise.all([
            data.logo_path ? getPublicUrl(LOGO_BUCKET, data.logo_path) : null,
            data.signature_path ? getPublicUrl(SIGNATURE_BUCKET, data.signature_path) : null,
            data.internal_rules_path ? getPublicUrl(INTERNAL_RULES_BUCKET, data.internal_rules_path) : null
          ]);

          setFormData({
            ...formData,
            ...data,
            logo_url: logoUrl || '',
            signature_url: signatureUrl || '',
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

  const ensureBucketExists = async (bucketName: string) => {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 52428800 // 50MB
        });
      }
    } catch (error) {
      console.error(`Error ensuring bucket ${bucketName} exists:`, error);
    }
  };

  const getPublicUrl = async (bucket: string, path: string) => {
    try {
      const { data } = await supabase.storage
        .from(bucket)
        .getPublicUrl(path);
      return data.publicUrl;
    } catch (error) {
      console.error('Error getting public URL:', error);
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

  const handleFileUpload = async (file: File, bucket: string, type: 'logo' | 'signature' | 'internal_rules') => {
    try {
      setUploadProgress({ ...uploadProgress, [type]: 0 });
      
      // Validate file
      if (type === 'internal_rules' && file.type !== 'application/pdf') {
        throw new Error('Le règlement intérieur doit être au format PDF');
      }
      
      if ((type === 'logo' || type === 'signature') && !file.type.startsWith('image/')) {
        throw new Error('Le fichier doit être une image');
      }
      
      // Max file size: 5MB
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Le fichier ne doit pas dépasser 5MB');
      }

      // Generate filename that preserves original name
      let fileName;
      if (type === 'internal_rules') {
        // For internal rules, keep original filename
        fileName = file.name;
      } else {
        // For images, use timestamp + extension
        const fileExt = file.name.split('.').pop();
        fileName = `${Date.now()}.${fileExt}`;
      }
      
      // Upload file with progress tracking
      const { error: uploadError, data } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded * 100) / (progress.total || 1));
            setUploadProgress({ ...uploadProgress, [type]: percent });
          }
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = await supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

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
      } else if (type === 'internal_rules') {
        setFormData(prev => ({
          ...prev,
          internal_rules_url: urlData.publicUrl,
          internal_rules_path: fileName,
          internal_rules_filename: file.name
        }));
      }

      setUploadProgress({ ...uploadProgress, [type]: 100 });
      setTimeout(() => {
        setUploadProgress({ ...uploadProgress, [type]: 0 });
      }, 1000);

    } catch (error) {
      console.error('Error uploading file:', error);
      setError(`Erreur lors de l'upload : ${error.message}`);
      setUploadProgress({ ...uploadProgress, [type]: 0 });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature' | 'internal_rules') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const bucket = type === 'logo' ? LOGO_BUCKET : 
                  type === 'signature' ? SIGNATURE_BUCKET : 
                  INTERNAL_RULES_BUCKET;

    await handleFileUpload(file, bucket, type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSaving(true);
    setSuccess(null);
    setError(null);
    
    try {
      // Save settings to Supabase
      const { error: saveError } = await supabase
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
          internal_rules_path: formData.internal_rules_path,
          updated_at: new Date().toISOString()
        });
        
      if (saveError) throw saveError;
      
      setSuccess('Les paramètres ont été enregistrés avec succès.');
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Une erreur est survenue lors de l\'enregistrement des paramètres.');
    } finally {
      setIsSaving(false);
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
      </div>
      
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