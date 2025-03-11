import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, FileText, Download, CheckCircle2 } from 'lucide-react';

interface InternalRulesModalProps {
  onClose: () => void;
  onAcknowledge?: () => void;
}

export const InternalRulesModal: React.FC<InternalRulesModalProps> = ({ onClose, onAcknowledge }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('reglement-interieur.pdf');
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchInternalRules = async () => {
      try {
        setIsLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');

        // Check if user has already acknowledged the rules
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('internal_rules_acknowledged')
          .eq('id', user.id)
          .single();

        if (profileData?.internal_rules_acknowledged) {
          setHasAcknowledged(true);
        }
        
        // Fetch settings
        const { data: settings, error: settingsError } = await supabase
          .from('settings')
          .select('internal_rules_path')
          .eq('id', 1)
          .single();
          
        if (settingsError) {
          console.error('Error fetching settings:', settingsError);
          throw settingsError;
        }
        
        if (settings?.internal_rules_path) {
          // Get the public URL
          const { data: urlData } = await supabase.storage
            .from('internal-rules')
            .getPublicUrl(settings.internal_rules_path);
            
          if (urlData) {
            setPdfUrl(urlData.publicUrl);
            // Keep original filename
            const originalName = settings.internal_rules_path.split('/').pop();
            setFileName(originalName || 'reglement-interieur.pdf');
          } else {
            setError('Le règlement intérieur n\'est pas disponible.');
          }
        } else {
          setError('Le règlement intérieur n\'est pas disponible.');
        }
      } catch (error) {
        console.error('Error fetching internal rules:', error);
        setError('Une erreur est survenue lors du chargement du règlement intérieur.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInternalRules();
  }, []);

  const handleAcknowledge = async () => {
    try {
      setIsSubmitting(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Update user profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          internal_rules_acknowledged: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setHasAcknowledged(true);
      
      // Call the onAcknowledge callback if provided
      if (onAcknowledge) {
        onAcknowledge();
      }

      // Close the modal after a short delay to show the success state
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('Error acknowledging internal rules:', error);
      setError('Une erreur est survenue lors de l\'enregistrement de votre confirmation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100] overflow-hidden">
      <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-[95%] max-h-[95vh] flex flex-col m-2">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <FileText className="mr-2 h-5 w-5 text-indigo-500" />
            Règlement Intérieur
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          ) : pdfUrl ? (
            <div className="h-full flex flex-col">
              <div className="mb-4 flex justify-between items-center">
                <p className="text-gray-600 text-sm">
                  Si le document ne s'affiche pas correctement, vous pouvez le télécharger et l'ouvrir avec votre lecteur PDF.
                </p>
                <a
                  href={pdfUrl}
                  download={fileName}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger le PDF
                </a>
              </div>
              <div className="flex-1 min-h-[70vh]">
                <iframe
                  src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                  className="w-full h-full border-0"
                  title="Règlement Intérieur"
                  style={{ minHeight: '70vh' }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Le règlement intérieur n'est pas disponible.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t p-4 flex justify-between items-center">
          <div className="flex items-center">
            {hasAcknowledged && (
              <div className="flex items-center text-green-600">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                <span>Règlement intérieur lu et approuvé</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Fermer
            </button>
            {!hasAcknowledged && (
              <button
                onClick={handleAcknowledge}
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Enregistrement...
                  </>
                ) : (
                  "J'ai pris connaissance du règlement"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};