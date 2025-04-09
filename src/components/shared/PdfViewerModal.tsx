import React from 'react';
import { X, Download } from 'lucide-react';
import { PdfViewer } from './PdfViewer';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBlob: Blob | null;
  title?: string;
  allowDownload?: boolean;
  fileName?: string;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  pdfBlob,
  title = "Aperçu du document",
  allowDownload = true,
  fileName = "document.pdf"
}) => {
  if (!isOpen || !pdfBlob) return null;

  const handleDownload = () => {
    if (!pdfBlob) return;
    
    // Créer une URL pour le blob
    const url = URL.createObjectURL(pdfBlob);
    
    // Créer un lien pour le téléchargement
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // Nettoyer
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <div className="flex items-center">
            {allowDownload && (
              <button
                onClick={handleDownload}
                className="ml-4 text-blue-600 hover:text-blue-800 flex items-center"
                title="Télécharger le document"
              >
                <Download className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="ml-4 text-gray-400 hover:text-gray-500"
              title="Fermer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden p-4 bg-gray-50">
          <PdfViewer 
            url={pdfBlob} 
            title={title}
            className="w-full h-full"
            height="calc(90vh - 120px)"
          />
        </div>
      </div>
    </div>
  );
}; 