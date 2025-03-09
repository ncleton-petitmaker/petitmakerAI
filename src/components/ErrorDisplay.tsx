import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
  onBypass?: () => void;
  isConnectionError?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  message, 
  onRetry, 
  onBack, 
  onBypass,
  isConnectionError = false 
}) => {
  const [showBypass, setShowBypass] = useState(false);
  
  // Afficher le bouton de contournement après 3 clics sur le message d'erreur
  const [clickCount, setClickCount] = useState(0);
  const handleMessageClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 3 && onBypass) {
      setShowBypass(true);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center mb-6">
          <AlertTriangle className={`mx-auto h-12 w-12 ${isConnectionError ? 'text-yellow-500' : 'text-red-500'}`} />
          <h2 className="mt-2 text-xl font-semibold text-gray-900">Erreur</h2>
          <p 
            className="mt-2 text-gray-600 cursor-pointer" 
            onClick={handleMessageClick}
          >
            {message}
          </p>
          {isConnectionError && (
            <p className="mt-2 text-sm text-gray-500">
              Vérifiez votre connexion internet et réessayez.
            </p>
          )}
        </div>
        <div className="flex justify-center space-x-4">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Réessayer
            </button>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Retour
            </button>
          )}
          {!onRetry && !onBack && !showBypass && (
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Rafraîchir la page
            </button>
          )}
          {showBypass && onBypass && (
            <button
              onClick={onBypass}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Contourner la vérification
            </button>
          )}
        </div>
      </div>
    </div>
  );
}; 