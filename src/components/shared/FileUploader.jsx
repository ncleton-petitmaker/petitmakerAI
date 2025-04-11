import React, { useState, useRef } from 'react';
import { uploadFile } from '../../services/api/fileService';

/**
 * Composant d'upload de fichier
 * @param {Object} props - Propriétés du composant
 * @param {Function} props.onFileUploaded - Fonction appelée après l'upload du fichier avec succès
 * @param {string} props.acceptedFileTypes - Types de fichiers acceptés (ex: '.pdf,.doc,.docx')
 * @param {number} props.maxSizeMB - Taille maximale du fichier en MB
 * @returns {JSX.Element} - Composant d'upload de fichier
 */
const FileUploader = ({ 
  onFileUploaded, 
  acceptedFileTypes = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png', 
  maxSizeMB = 5 
}) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setUploadError('');
    
    // Valider le fichier
    if (selectedFile) {
      // Vérifier la taille
      if (selectedFile.size > maxSizeMB * 1024 * 1024) {
        setUploadError(`La taille du fichier dépasse la limite de ${maxSizeMB} MB.`);
        return;
      }
      
      // Vérifier le type
      const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
      const acceptedTypes = acceptedFileTypes.split(',').map(type => 
        type.trim().replace('.', '').toLowerCase()
      );
      
      if (!acceptedTypes.includes(fileExtension)) {
        setUploadError(`Type de fichier non accepté. Types autorisés: ${acceptedFileTypes}`);
        return;
      }
      
      setFile(selectedFile);
      
      // Simuler un upload automatique
      handleUpload(selectedFile);
    }
  };

  const handleUpload = async (fileToUpload) => {
    if (!fileToUpload) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simuler une progression d'upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return newProgress;
        });
      }, 200);
      
      // Appeler le service d'upload
      const response = await uploadFile(fileToUpload);
      
      clearInterval(progressInterval);
      
      if (response.success) {
        setUploadProgress(100);
        setFile(null);
        
        // Réinitialiser l'input file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Notifier le parent
        onFileUploaded(response.data);
      } else {
        setUploadError('Erreur lors de l\'upload du fichier.');
        setUploadProgress(0);
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      setUploadError('Erreur lors de l\'upload du fichier.');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const droppedFile = event.dataTransfer.files[0];
      setFile(droppedFile);
      handleUpload(droppedFile);
    }
  };

  return (
    <div className="file-uploader">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors duration-200 cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept={acceptedFileTypes}
          disabled={isUploading}
        />
        
        <div className="flex flex-col items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-400 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          
          {isUploading ? (
            <div className="text-sm text-gray-500">
              Upload en cours ({uploadProgress}%)...
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Glissez-déposez un fichier ici, ou cliquez pour sélectionner
              <br />
              <span className="text-xs">
                (Taille maximale: {maxSizeMB} MB. Types acceptés: {acceptedFileTypes})
              </span>
            </p>
          )}
        </div>
      </div>
      
      {uploadError && (
        <div className="mt-2 text-sm text-red-600">
          {uploadError}
        </div>
      )}
      
      {file && !isUploading && (
        <div className="mt-2 text-sm text-gray-700 flex items-center">
          <svg
            className="w-4 h-4 mr-1 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          {file.name} ({Math.round(file.size / 1024)} KB)
        </div>
      )}
    </div>
  );
};

export default FileUploader; 