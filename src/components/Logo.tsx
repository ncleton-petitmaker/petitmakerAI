import React, { useEffect, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

export const Logo = memo(() => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const getImageUrl = async () => {
      try {
        const { data: publicUrl } = await supabase
          .storage
          .from('Images')
          .getPublicUrl('logo-page-accueil.avif');
        
        if (publicUrl) {
          setImageUrl(publicUrl.publicUrl);
        }
      } catch (error) {
        console.error('Error fetching logo:', error);
      }
    };

    getImageUrl();
  }, []);

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring" }}
      className="relative w-64 md:w-96 aspect-[2/1]"
    >
      {imageUrl && (
        <img 
          src={imageUrl}
          alt="PETITMAKER"
          className="w-full h-full object-contain"
          loading="eager"
          decoding="async"
          importance="high"
        />
      )}
    </motion.div>
  );
});

Logo.displayName = 'Logo';