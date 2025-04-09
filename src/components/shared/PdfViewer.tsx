import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface PdfViewerProps {
  url: string | Blob;
  title?: string;
  className?: string;
  height?: string;
  width?: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ 
  url, 
  title = "Document PDF", 
  className = "w-full h-full min-h-[70vh]", 
  height = "100%", 
  width = "100%" 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');

  useEffect(() => {
    // Si l'URL est un Blob, créer une URL pour l'objet Blob
    if (url instanceof Blob) {
      const objectUrl = URL.createObjectURL(url);
      setPdfUrl(objectUrl);
      
      // Nettoyer l'URL de l'objet au démontage
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    } else {
      // Sinon, utiliser directement l'URL fournie
      setPdfUrl(url);
    }
  }, [url]);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <div className={`pdf-viewer-container ${className}`} style={{ position: 'relative' }}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 bg-opacity-80 z-10">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-700">Chargement du document...</p>
        </div>
      )}
      
      {error ? (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100 rounded-lg text-center p-8">
          <p className="text-gray-700 mb-4">Une erreur est survenue lors du chargement du document.</p>
          <p className="text-gray-500">Veuillez réessayer ultérieurement ou contacter le support.</p>
        </div>
      ) : (
        <iframe 
          src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
          className="w-full h-full border-0 rounded-lg"
          title={title}
          style={{ height, width }}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}; 