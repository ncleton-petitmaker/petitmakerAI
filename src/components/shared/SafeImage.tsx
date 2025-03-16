import React from 'react';

interface SafeImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Composant de préchargement d'image avec gestion d'erreur
 * @param src URL de l'image
 * @param alt Texte alternatif
 * @param className Classes CSS
 * @param onLoad Callback appelé quand l'image est chargée
 * @param onError Callback appelé en cas d'erreur
 * @returns JSX.Element
 */
const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className,
  onLoad,
  onError
}) => {
  if (!src) return null;
  
  return (
    <img
      src={src}
      alt={alt}
      className={className || ''}
      onLoad={() => {
        console.log(`Image chargée avec succès: ${src}`);
        if (onLoad) onLoad();
      }}
      onError={(e) => {
        console.error(`Erreur de chargement de l'image: ${src}`);
        if (onError) onError();
        // Cacher l'image en cas d'erreur
        e.currentTarget.className = 'hidden';
      }}
    />
  );
};

export default SafeImage; 