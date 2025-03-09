import React from 'react';
import { Calendar } from 'lucide-react';
import { CalendlyModal } from './CalendlyModal';

export const CTAButton = ({ className = "" }) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 rounded-xl font-semibold text-white transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-600/25 ${className}`}
        aria-label="Prendre rendez-vous pour une formation"
      >
        <Calendar className="w-5 h-5" aria-hidden="true" />
        <span>Prendre RDV</span>
      </button>
      
      <CalendlyModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};