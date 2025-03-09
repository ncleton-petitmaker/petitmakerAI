import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Trash2, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProfilePhotoProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  onUpdate?: () => void;
}

export const ProfilePhoto: React.FC<ProfilePhotoProps> = ({ 
  userId, 
  size = 'md',
  readOnly = false,
  onUpdate 
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Nom du bucket Supabase pour les photos de profil
  const BUCKET_NAME = 'Photos de profil';

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  useEffect(() => {
    const fetchProfilePhoto = async () => {
      try {
        setIsLoading(true);
        
        // First check if user has a custom photo
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('photo_url, google_photo_url')
          .eq('id', userId)
          .maybeSingle();
        
        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }
        
        if (profileData?.photo_url) {
          // User has a custom photo
          const { data } = await supabase
            .storage
            .from(BUCKET_NAME)
            .getPublicUrl(profileData.photo_url);
          
          setPhotoUrl(data.publicUrl);
        } else if (profileData?.google_photo_url) {
          // User has a Google photo
          setPhotoUrl(profileData.google_photo_url);
        } else {
          // No photo found
          setPhotoUrl(null);
        }
      } catch (error) {
        console.error('Error fetching profile photo:', error);
        setPhotoUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfilePhoto();

    // Handle clicks outside the menu
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userId, BUCKET_NAME]);

  const handlePhotoClick = () => {
    setShowMenu(!showMenu);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Le fichier doit être une image');
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('L\'image ne doit pas dépasser 2MB');
      }

      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      console.log(`Uploading to bucket: ${BUCKET_NAME}, file: ${fileName}`);
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(fileName, file);
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      // Get the public URL
      const { data } = await supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);
      
      console.log('Public URL:', data.publicUrl);
      
      // Update user profile with the new photo URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          photo_url: fileName,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      
      // Update the UI
      setPhotoUrl(data.publicUrl);
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      alert('Une erreur est survenue lors du téléchargement de la photo');
    } finally {
      setIsUploading(false);
      setShowMenu(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setIsLoading(true);
      
      // Get current photo filename
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('photo_url')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;
      
      if (profileData?.photo_url) {
        // Delete from storage
        const { error: deleteError } = await supabase
          .storage
          .from(BUCKET_NAME)
          .remove([profileData.photo_url]);
        
        if (deleteError) throw deleteError;
      }
      
      // Update profile to remove photo reference
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          photo_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      
      // Check if there's a Google photo to fall back to
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('google_photo_url')
        .eq('id', userId)
        .single();
      
      setPhotoUrl(userData?.google_photo_url || null);
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Error removing profile photo:', error);
      alert('Une erreur est survenue lors de la suppression de la photo');
    } finally {
      setIsLoading(false);
      setShowMenu(false);
    }
  };

  return (
    <div className="relative">
      <div 
        className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-800 border-2 border-gray-700 relative ${!readOnly ? 'cursor-pointer' : ''}`}
        onClick={readOnly ? undefined : handlePhotoClick}
      >
        {isLoading || isUploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : photoUrl ? (
          <img 
            src={photoUrl} 
            alt="Photo de profil" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
            <User className="w-1/2 h-1/2" />
          </div>
        )}
      </div>

      {!readOnly && showMenu && (
        <div 
          ref={menuRef}
          className="absolute top-full mt-2 right-0 bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden z-10 min-w-[160px]"
        >
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-800 transition-colors text-left text-sm cursor-pointer"
            disabled={isUploading}
          >
            <Upload className="w-4 h-4" />
            <span>Télécharger une photo</span>
          </div>
          
          {photoUrl && (
            <div
              onClick={handleRemovePhoto}
              className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-800 transition-colors text-left text-sm text-red-400 cursor-pointer"
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer la photo</span>
            </div>
          )}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};