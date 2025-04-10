import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Download, X } from 'lucide-react';

export interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBlob: Blob | null;
  title: string;
  fileName: string;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  pdfBlob,
  title = 'Document',
  fileName = 'document.pdf'
}) => {
  const handleDownload = () => {
    if (!pdfBlob) return;
    
    // Créer une URL pour le blob
    const url = URL.createObjectURL(pdfBlob);
    
    // Créer un élément a et déclencher le téléchargement
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // Nettoyer
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-lg bg-white p-2 shadow-xl transition-all flex flex-col">
                <div className="flex justify-between items-center p-2 mb-2">
                  <Dialog.Title as="h3" className="text-lg font-medium text-gray-900">
                    {title}
                  </Dialog.Title>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="bg-gray-100 flex-grow rounded overflow-auto" style={{ height: 'calc(100vh - 150px)' }}>
                  {pdfBlob && (
                    <iframe
                      src={URL.createObjectURL(pdfBlob)}
                      className="w-full h-full"
                      title={title}
                    />
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}; 