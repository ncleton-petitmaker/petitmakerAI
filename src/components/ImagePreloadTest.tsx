import React, { useEffect, useState } from 'react';
import { preloadImages } from '../utils/SignatureUtils';
import SafeImage from './shared/SafeImage';
import { Loader2 } from 'lucide-react';

interface ImagePreloadTestProps {
  imageUrls: (string | null | undefined)[];
  timeout?: number;
}

/**
 * Composant de test pour vérifier le préchargement des images
 */
const ImagePreloadTest: React.FC<ImagePreloadTestProps> = ({ 
  imageUrls, 
  timeout = 5000 
}) => {
  const [validUrls, setValidUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImages = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Préchargement de', imageUrls.length, 'images...');
        const urls = await preloadImages(imageUrls, timeout);
        
        console.log('Images préchargées:', urls.length, 'valides sur', imageUrls.length);
        setValidUrls(urls);
      } catch (err) {
        console.error('Erreur lors du préchargement des images:', err);
        setError('Erreur lors du préchargement des images');
      } finally {
        setLoading(false);
      }
    };

    if (imageUrls && imageUrls.length > 0) {
      loadImages();
    } else {
      setLoading(false);
    }
  }, [imageUrls, timeout]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-4 border rounded-md">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="mt-2">Préchargement des images...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-md">
      <h2 className="text-lg font-semibold mb-4">Test de préchargement d'images</h2>
      
      <div className="mb-4">
        <p>
          <span className="font-medium">Images valides:</span> {validUrls.length} sur {imageUrls.length}
        </p>
      </div>
      
      {validUrls.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {validUrls.map((url, index) => (
            <div key={index} className="border p-3 rounded-md">
              <h3 className="font-medium mb-2">Image {index + 1}</h3>
              <div className="h-28 border border-gray-300 flex items-center justify-center">
                <SafeImage 
                  src={url} 
                  alt={`Image ${index + 1}`} 
                  className="max-h-20 max-w-[95%] object-contain"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 break-all">{url}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-700">Aucune image valide trouvée.</p>
        </div>
      )}
      
      {imageUrls.length > validUrls.length && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="font-medium mb-2">URLs invalides:</h3>
          <ul className="list-disc pl-5 space-y-1">
            {imageUrls.filter(url => url && !validUrls.includes(url)).map((url, index) => (
              <li key={index} className="text-xs text-gray-500 break-all">
                {url || 'URL null ou undefined'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ImagePreloadTest; 