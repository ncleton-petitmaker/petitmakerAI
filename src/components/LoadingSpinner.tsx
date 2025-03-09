import React from 'react';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  fullScreen = false, 
  message = 'Chargement en cours...', 
  size = 'medium' 
}) => {
  const sizeClasses = {
    small: 'h-6 w-6 border-2',
    medium: 'h-12 w-12 border-t-2 border-b-2',
    large: 'h-16 w-16 border-t-3 border-b-3'
  };

  const spinner = (
    <div className={`animate-spin rounded-full ${sizeClasses[size]} border-blue-500`}></div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-100 flex flex-col items-center justify-center z-[100] overflow-hidden">
        {spinner}
        {message && <p className="mt-4 text-white">{message}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-4">
      {spinner}
      {message && <p className="mt-2 text-gray-700 text-sm">{message}</p>}
    </div>
  );
}; 