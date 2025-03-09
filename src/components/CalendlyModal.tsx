import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface CalendlyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    Calendly: any;
  }
}

export const CalendlyModal: React.FC<CalendlyModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      window.Calendly?.initPopupWidget({
        url: 'https://calendly.com/nicolas-cleton-petitmaker/30min',
        prefill: {},
        customColors: {
          background: '#1f2937',
          text: '#ffffff',
          primary: '#3b82f6'
        }
      });

      // Add event listener for Calendly modal close
      const handleCalendlyClose = () => {
        onClose();
      };
      window.addEventListener('message', (e) => {
        if (e.data.event === 'calendly.event_scheduled' || e.data.event === 'calendly.popup_closed') {
          handleCalendlyClose();
        }
      });

      // Add ARIA attributes when modal opens
      document.body.setAttribute('aria-hidden', 'true');

      return () => {
        window.removeEventListener('message', handleCalendlyClose);
        // Remove ARIA attributes when modal closes
        document.body.removeAttribute('aria-hidden');
      };
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    // Load Calendly script
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return null; // Calendly will create its own modal
};