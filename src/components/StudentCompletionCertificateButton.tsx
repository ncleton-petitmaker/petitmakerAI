import React, { useState, useEffect } from 'react';
import { FileText, Eye } from 'lucide-react';
import { StudentCompletionCertificate } from './StudentCompletionCertificate';
import { supabase } from '../lib/supabase';

interface StudentCompletionCertificateButtonProps {
  trainingId: string;
  userId: string;
  buttonText?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
}

export const StudentCompletionCertificateButton: React.FC<StudentCompletionCertificateButtonProps> = ({
  trainingId,
  userId,
  buttonText = "Attestation de fin",
  className = "",
  variant = 'primary',
  onDocumentOpen,
  onDocumentClose
}) => {
  const [showCertificate, setShowCertificate] = useState(false);
  const [showSignedDocument, setShowSignedDocument] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [training, setTraining] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [hasSigned, setHasSigned] = useState(false);
  const [signedDocumentUrl, setSignedDocumentUrl] = useState<string | null>(null);

  const fetchSignedDocument = async () => {
    try {
      console.log('🔍 [DEBUG] Récupération du document signé pour:', { trainingId, userId });
      
      // Récupérer le document signé depuis la table documents
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .select('file_url')
        .eq('training_id', trainingId)
        .eq('user_id', userId)
        .eq('type', 'attestation')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (documentError) {
        console.error('🔍 [DEBUG] Erreur lors de la récupération du document:', documentError);
        return null;
      }

      if (documentData && documentData.file_url) {
        console.log('🔍 [DEBUG] Document signé trouvé:', documentData.file_url);
        return documentData.file_url;
      }
      
      return null;
    } catch (error) {
      console.error('🔍 [DEBUG] Erreur lors de la récupération du document signé:', error);
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!trainingId || !userId) {
          console.log("Missing trainingId or userId:", { trainingId, userId });
          setError("Données manquantes");
          setLoading(false);
          return;
        }

        // Récupérer les données de la formation
        const { data: trainingData, error: trainingError } = await supabase
          .from('trainings')
          .select('*')
          .eq('id', trainingId)
          .single();

        if (trainingError) throw trainingError;

        // Récupérer les données de l'utilisateur
        const { data: userProfileData, error: userProfileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (userProfileError) throw userProfileError;

        // Vérifier si le certificat a été signé
        const { data: signatureData, error: signatureError } = await supabase
          .from('user_profiles')
          .select('has_signed_certificate')
          .eq('id', userId)
          .single();

        if (signatureError) throw signatureError;

        // Si l'utilisateur a signé, récupérer l'URL du document PDF
        let documentUrl = null;
        if (signatureData?.has_signed_certificate) {
          documentUrl = await fetchSignedDocument();
        }

        setTraining(trainingData);
        setParticipant(userProfileData);
        setHasSigned(signatureData?.has_signed_certificate || false);
        setSignedDocumentUrl(documentUrl);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trainingId, userId]);

  const handleOpenCertificate = (e: React.MouseEvent) => {
    console.log('🔍 [DEBUG] handleOpenCertificate - START');
    console.log('🔍 [DEBUG] Event type:', e.type);
    console.log('🔍 [DEBUG] Event target:', e.target);
    console.log('🔍 [DEBUG] Event currentTarget:', e.currentTarget);
    
    try {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔍 [DEBUG] preventDefault and stopPropagation called');
      
      console.log('🔍 [DEBUG] handleOpenCertificate called');
      setShowCertificate(true);
      setShowSignedDocument(false);
      console.log('🔍 [DEBUG] Document will be shown directly');
      
      console.log('🔍 [DEBUG] handleOpenCertificate - END');
    } catch (error) {
      console.error('🔍 [DEBUG] Error in handleOpenCertificate:', error);
    }
  };

  const handleViewSignedDocument = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔍 [DEBUG] Viewing signed document:', signedDocumentUrl);
    
    if (signedDocumentUrl) {
      // Afficher le document signé dans le popup
      setShowSignedDocument(true);
      setShowCertificate(false);
    } else {
      // Si l'URL n'est pas disponible, essayer de récupérer le document
      fetchSignedDocument().then(url => {
        if (url) {
          setSignedDocumentUrl(url);
          setShowSignedDocument(true);
          setShowCertificate(false);
        } else {
          // Si toujours pas disponible, ouvrir le document normal
          handleOpenCertificate(e);
        }
      });
    }
  };

  const handleCloseCertificate = () => {
    console.log('🔍 [DEBUG] handleCloseCertificate - START');
    setShowCertificate(false);
    setShowSignedDocument(false);
    console.log('🔍 [DEBUG] Document closed directly');
    
    // Vérifier si le certificat a été signé après la fermeture
    const checkSignatureStatus = async () => {
      try {
        console.log('🔍 [DEBUG] Checking signature status');
        const { data, error } = await supabase
          .from('user_profiles')
          .select('has_signed_certificate')
          .eq('id', userId)
          .single();
        
        if (!error && data) {
          console.log('🔍 [DEBUG] Signature status:', data.has_signed_certificate);
          
          // Si le document vient d'être signé, récupérer l'URL du document
          if (data.has_signed_certificate && !signedDocumentUrl) {
            const url = await fetchSignedDocument();
            if (url) {
              setSignedDocumentUrl(url);
            }
          }
          
          setHasSigned(data.has_signed_certificate || false);
        }
      } catch (error) {
        console.error('🔍 [DEBUG] Error checking signature status:', error);
      }
    };
    
    checkSignatureStatus();
    console.log('🔍 [DEBUG] handleCloseCertificate - END');
  };

  if (loading) {
    return (
      <button
        disabled
        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-400 ${className}`}
      >
        <FileText className="h-4 w-4 mr-1.5" />
        Chargement...
      </button>
    );
  }

  if (error) {
    return (
      <button
        disabled
        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-red-100 text-red-700 ${className}`}
        title={error}
      >
        <FileText className="h-4 w-4 mr-1.5" />
        Erreur: {error}
      </button>
    );
  }

  if (!training || !participant) {
    console.log("Missing data for button:", { training, participant, trainingId, userId });
    return (
      <button
        disabled
        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-yellow-100 text-yellow-700 ${className}`}
      >
        <FileText className="h-4 w-4 mr-1.5" />
        Données manquantes
      </button>
    );
  }

  // Définir le style du bouton en fonction du variant
  let buttonStyle = '';
  switch (variant) {
    case 'primary':
      buttonStyle = hasSigned ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';
      break;
    case 'secondary':
      buttonStyle = hasSigned ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white';
      break;
    case 'outline':
      buttonStyle = hasSigned ? 'bg-transparent border border-green-600 text-green-600 hover:bg-green-50' : 'bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50';
      break;
    default:
      buttonStyle = hasSigned ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          console.log('🔍 [DEBUG] Button clicked - START');
          e.preventDefault();
          e.stopPropagation();
          console.log('🔍 [DEBUG] preventDefault and stopPropagation called');
          
          if (hasSigned) {
            console.log('🔍 [DEBUG] Document is signed, viewing signed document');
            handleViewSignedDocument(e);
          } else {
            console.log('🔍 [DEBUG] Document is not signed, opening certificate');
            handleOpenCertificate(e);
          }
          
          console.log('🔍 [DEBUG] Button clicked - END');
        }}
        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${buttonStyle} ${className}`}
      >
        {hasSigned ? <Eye className="h-4 w-4 mr-1.5" /> : <FileText className="h-4 w-4 mr-1.5" />}
        {hasSigned ? "Voir le document signé" : buttonText}
        {hasSigned && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            Signé
          </span>
        )}
      </button>

      {showCertificate && (
        <StudentCompletionCertificate
          training={training}
          participant={participant}
          onCancel={handleCloseCertificate}
        />
      )}

      {showSignedDocument && signedDocumentUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-[9999] overflow-hidden">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Attestation de fin signée
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.open(signedDocumentUrl, '_blank')}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  Ouvrir dans un nouvel onglet
                </button>
                <button
                  onClick={handleCloseCertificate}
                  className="inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FileText className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
              {signedDocumentUrl.endsWith('.pdf') ? (
                <iframe 
                  src={signedDocumentUrl} 
                  className="w-full h-full border-0" 
                  title="Document signé"
                />
              ) : (
                <div className="text-center">
                  <p className="mb-4">Le document signé n'est pas disponible au format PDF.</p>
                  <a 
                    href={signedDocumentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Voir la signature
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 