import React, { useState, useEffect } from 'react';
import { FileText, Eye } from 'lucide-react';
import { StudentTrainingAgreement } from './StudentTrainingAgreement';
import { supabase } from '../lib/supabase';

interface StudentTrainingAgreementButtonProps {
  trainingId: string;
  userId: string;
  buttonText?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
}

export const StudentTrainingAgreementButton: React.FC<StudentTrainingAgreementButtonProps> = ({
  trainingId,
  userId,
  buttonText = 'Convention de formation',
  className = '',
  variant = 'default',
  onDocumentOpen,
  onDocumentClose
}) => {
  const [showAgreement, setShowAgreement] = useState(false);
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
      
      // Vérifier d'abord dans le localStorage
      const localStorageKey = `document_${trainingId}_${userId}_convention`;
      const localStorageUrl = localStorage.getItem(localStorageKey);
      
      if (localStorageUrl) {
        console.log('🔍 [DEBUG] Document trouvé dans le localStorage:', localStorageUrl);
        return localStorageUrl;
      }
      
      console.log('🔍 [DEBUG] Document non trouvé dans le localStorage, recherche dans la base de données');
      
      // Vérifier la structure de la requête
      console.log('🔍 [DEBUG] Paramètres de la requête:', { 
        training_id: trainingId, 
        user_id: userId, 
        type: 'convention' 
      });
      
      // Récupérer le document signé depuis la table documents
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .select('*')  // Sélectionner tous les champs pour déboguer
        .eq('training_id', trainingId)
        .eq('user_id', userId)
        .eq('type', 'convention');
        
      // Vérifier les résultats bruts
      console.log('🔍 [DEBUG] Résultats bruts de la requête:', documentData);
      
      if (documentError) {
        console.error('🔍 [DEBUG] Erreur lors de la récupération du document:', documentError);
        console.error('🔍 [DEBUG] Détails de l\'erreur:', JSON.stringify(documentError, null, 2));
        
        // Vérifier si l'erreur est due à l'absence de document
        if (documentError.code === 'PGRST116') {
          console.log('🔍 [DEBUG] Aucun document trouvé pour ce participant et cette formation');
        }
        
        return null;
      }

      // Si nous avons des résultats, prendre le premier
      if (documentData && documentData.length > 0) {
        const document = documentData[0];
        console.log('🔍 [DEBUG] Document signé trouvé:', document);
        
        if (document.file_url) {
          console.log('🔍 [DEBUG] URL du document:', document.file_url);
          console.log('🔍 [DEBUG] Date de création du document:', document.created_at);
          
          // Stocker l'URL dans le localStorage pour les prochaines fois
          try {
            localStorage.setItem(localStorageKey, document.file_url);
            console.log('🔍 [DEBUG] URL du document stockée dans le localStorage');
          } catch (storageError) {
            console.error('🔍 [DEBUG] Erreur lors du stockage dans le localStorage:', storageError);
          }
          
          return document.file_url;
        } else {
          console.log('🔍 [DEBUG] Document trouvé mais sans URL valide');
        }
      } else {
        console.log('🔍 [DEBUG] Aucun document trouvé dans la requête');
      }
      
      console.log('🔍 [DEBUG] Aucun document trouvé avec une URL valide');
      return null;
    } catch (error) {
      console.error('🔍 [DEBUG] Erreur lors de la récupération du document signé:', error);
      return null;
    }
  };

  // Fonction pour vérifier directement dans la table documents
  const checkDocumentsTable = async () => {
    try {
      console.log('🔍 [DEBUG] Vérification de la table documents pour:', { trainingId, userId });
      
      // Récupérer tous les documents pour ce participant et cette formation
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('training_id', trainingId)
        .eq('user_id', userId);

      if (error) {
        console.error('🔍 [DEBUG] Erreur lors de la vérification de la table documents:', error);
        return;
      }

      console.log('🔍 [DEBUG] Documents trouvés:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('🔍 [DEBUG] Détails des documents:', JSON.stringify(data, null, 2));
        
        // Vérifier les documents de type convention
        const conventions = data.filter(doc => doc.type === 'convention');
        console.log('🔍 [DEBUG] Conventions trouvées:', conventions.length);
        
        if (conventions.length > 0) {
          console.log('🔍 [DEBUG] Détails des conventions:', JSON.stringify(conventions, null, 2));
        }
      } else {
        console.log('🔍 [DEBUG] Aucun document trouvé dans la table documents');
        
        // Vérifier si la table documents existe et sa structure
        const { data: tableInfo, error: tableError } = await supabase
          .rpc('get_table_info', { table_name: 'documents' });
          
        if (tableError) {
          console.error('🔍 [DEBUG] Erreur lors de la vérification de la structure de la table:', tableError);
        } else {
          console.log('🔍 [DEBUG] Structure de la table documents:', tableInfo);
        }
        
        // Vérifier tous les documents de l'utilisateur
        const { data: userDocs, error: userDocsError } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', userId);
          
        if (userDocsError) {
          console.error('🔍 [DEBUG] Erreur lors de la récupération des documents de l\'utilisateur:', userDocsError);
        } else {
          console.log('🔍 [DEBUG] Documents de l\'utilisateur:', userDocs?.length || 0);
          if (userDocs && userDocs.length > 0) {
            console.log('🔍 [DEBUG] Détails des documents de l\'utilisateur:', JSON.stringify(userDocs, null, 2));
          }
        }
        
        // Vérifier tous les documents de la formation
        const { data: trainingDocs, error: trainingDocsError } = await supabase
          .from('documents')
          .select('*')
          .eq('training_id', trainingId);
          
        if (trainingDocsError) {
          console.error('🔍 [DEBUG] Erreur lors de la récupération des documents de la formation:', trainingDocsError);
        } else {
          console.log('🔍 [DEBUG] Documents de la formation:', trainingDocs?.length || 0);
          if (trainingDocs && trainingDocs.length > 0) {
            console.log('🔍 [DEBUG] Détails des documents de la formation:', JSON.stringify(trainingDocs, null, 2));
          }
        }
      }
    } catch (error) {
      console.error('🔍 [DEBUG] Erreur lors de la vérification de la table documents:', error);
    }
  };

  // Fonction pour vérifier l'état de signature dans le profil utilisateur
  const checkSignatureStatus = async () => {
    try {
      console.log('🔍 [DEBUG] Vérification du statut de signature pour:', userId);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('has_signed_agreement, agreement_signature_url, agreement_signature_date')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('🔍 [DEBUG] Erreur lors de la vérification du statut de signature:', error);
        return;
      }

      console.log('🔍 [DEBUG] Statut de signature:', {
        has_signed_agreement: data?.has_signed_agreement,
        agreement_signature_url: data?.agreement_signature_url,
        agreement_signature_date: data?.agreement_signature_date
      });
      
      return data;
    } catch (error) {
      console.error('🔍 [DEBUG] Erreur lors de la vérification du statut de signature:', error);
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

        console.log('🔍 [DEBUG] Chargement des données pour:', { trainingId, userId });

        // Vérifier la table documents directement
        await checkDocumentsTable();

        // Récupérer les données de la formation
        const { data: trainingData, error: trainingError } = await supabase
          .from('trainings')
          .select('*')
          .eq('id', trainingId)
          .single();

        if (trainingError) {
          console.error('🔍 [DEBUG] Erreur lors de la récupération de la formation:', trainingError);
          throw trainingError;
        }

        // Récupérer les données de l'utilisateur
        const { data: userProfileData, error: userProfileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (userProfileError) {
          console.error('🔍 [DEBUG] Erreur lors de la récupération du profil utilisateur:', userProfileError);
          throw userProfileError;
        }

        // Vérifier si l'utilisateur a déjà signé la convention
        const signatureData = await checkSignatureStatus();
        if (!signatureData) {
          throw new Error("Impossible de vérifier le statut de signature");
        }

        // Si l'utilisateur a signé, récupérer l'URL du document PDF
        let documentUrl = null;
        if (signatureData.has_signed_agreement) {
          console.log('🔍 [DEBUG] L\'utilisateur a signé, récupération du document');
          documentUrl = await fetchSignedDocument();
        } else {
          console.log('🔍 [DEBUG] L\'utilisateur n\'a pas encore signé');
        }

        setTraining(trainingData);
        setParticipant(userProfileData);
        setHasSigned(signatureData.has_signed_agreement || false);
        setSignedDocumentUrl(documentUrl);
        
        console.log('🔍 [DEBUG] État final après chargement:', {
          hasSigned: signatureData.has_signed_agreement || false,
          signedDocumentUrl: documentUrl
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trainingId, userId]);

  const handleOpenAgreement = (e: React.MouseEvent) => {
    console.log('🔍 [DEBUG] handleOpenAgreement - START');
    console.log('🔍 [DEBUG] Event type:', e.type);
    console.log('🔍 [DEBUG] Event target:', e.target);
    console.log('🔍 [DEBUG] Event currentTarget:', e.currentTarget);
    
    try {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔍 [DEBUG] preventDefault and stopPropagation called');
      
      console.log('🔍 [DEBUG] handleOpenAgreement called');
      console.log('🔍 [DEBUG] Current document state before update:', showAgreement);
      setShowAgreement(true);
      setShowSignedDocument(false);
      console.log('🔍 [DEBUG] Document state updated to:', true);
      
      // Log the z-index of the timeline elements
      setTimeout(() => {
        const timelineElements = document.querySelectorAll('.relative.z-10, .relative.z-20, .relative.z-50');
        console.log('🔍 [DEBUG] Timeline elements with z-index:', timelineElements);
        
        const documentElement = document.querySelector('.fixed.inset-0.bg-black');
        console.log('🔍 [DEBUG] Document element:', documentElement);
        if (documentElement) {
          console.log('🔍 [DEBUG] Document z-index:', window.getComputedStyle(documentElement).zIndex);
        }
      }, 100);
      
      console.log('🔍 [DEBUG] handleOpenAgreement - END');
    } catch (error) {
      console.error('🔍 [DEBUG] Error in handleOpenAgreement:', error);
    }
  };

  const handleViewSignedDocument = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔍 [DEBUG] Viewing signed document:', signedDocumentUrl);
    console.log('🔍 [DEBUG] Current hasSigned state:', hasSigned);
    
    // Vérifier à nouveau le statut de signature
    checkSignatureStatus();
    
    if (signedDocumentUrl) {
      console.log('🔍 [DEBUG] URL du document disponible, ouverture dans un nouvel onglet:', signedDocumentUrl);
      
      // Ouvrir le document dans un nouvel onglet
      window.open(signedDocumentUrl, '_blank');
      
      // Informer le parent que le document a été ouvert
      if (onDocumentOpen) {
        onDocumentOpen();
      }
    } else {
      // Si l'URL n'est pas disponible, essayer de récupérer le document
      console.log('🔍 [DEBUG] URL du document non disponible, tentative de récupération');
      fetchSignedDocument().then(url => {
        if (url) {
          console.log('🔍 [DEBUG] Document récupéré avec succès:', url);
          setSignedDocumentUrl(url);
          
          // Ouvrir le document dans un nouvel onglet
          window.open(url, '_blank');
          
          // Informer le parent que le document a été ouvert
          if (onDocumentOpen) {
            onDocumentOpen();
          }
        } else {
          console.log('🔍 [DEBUG] Document non trouvé, ouverture du formulaire de convention');
          // Si toujours pas disponible, ouvrir le formulaire de convention
          handleOpenAgreement(e);
        }
      });
    }
  };

  const handleCloseAgreement = async () => {
    console.log('🔍 [DEBUG] handleCloseAgreement - START');
    console.log('🔍 [DEBUG] Current document state before update:', showAgreement);
    setShowAgreement(false);
    setShowSignedDocument(false);
    console.log('🔍 [DEBUG] Document state updated to:', false);
    
    // Vérifier si la convention a été signée après la fermeture
    try {
      console.log('🔍 [DEBUG] Checking signature status');
      const signatureData = await checkSignatureStatus();
      
      if (signatureData) {
        console.log('🔍 [DEBUG] Signature status after close:', {
          has_signed_agreement: signatureData.has_signed_agreement,
          agreement_signature_url: signatureData.agreement_signature_url,
          agreement_signature_date: signatureData.agreement_signature_date
        });
        
        const wasSignedBefore = hasSigned;
        const isSignedNow = signatureData.has_signed_agreement || false;
        
        console.log('🔍 [DEBUG] Changement de statut de signature:', {
          wasSignedBefore,
          isSignedNow
        });
        
        // Si le document vient d'être signé, récupérer l'URL du document
        if (isSignedNow && (!wasSignedBefore || !signedDocumentUrl)) {
          console.log('🔍 [DEBUG] Document nouvellement signé, récupération de l\'URL');
          
          // Vérifier la table documents
          await checkDocumentsTable();
          
          const url = await fetchSignedDocument();
          if (url) {
            console.log('🔍 [DEBUG] URL du document récupérée:', url);
            setSignedDocumentUrl(url);
          } else {
            console.log('🔍 [DEBUG] Impossible de récupérer l\'URL du document');
            
            // Vérifier si l'URL est dans le localStorage
            const localStorageKey = `document_${trainingId}_${userId}_convention`;
            const localStorageUrl = localStorage.getItem(localStorageKey);
            
            if (localStorageUrl) {
              console.log('🔍 [DEBUG] URL trouvée dans le localStorage:', localStorageUrl);
              setSignedDocumentUrl(localStorageUrl);
            }
          }
        }
        
        setHasSigned(isSignedNow);
      }
    } catch (error) {
      console.error('🔍 [DEBUG] Error checking signature status:', error);
    }
    
    console.log('🔍 [DEBUG] handleCloseAgreement - END');
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
    console.log("Error rendering button:", error, { trainingId, userId });
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
    case 'default':
      buttonStyle = hasSigned ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';
      break;
    case 'outline':
      buttonStyle = hasSigned ? 'bg-transparent border border-green-600 text-green-600 hover:bg-green-50' : 'bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50';
      break;
    case 'ghost':
      buttonStyle = hasSigned ? 'bg-transparent text-green-600 hover:bg-green-50' : 'bg-transparent text-blue-600 hover:bg-blue-50';
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
            console.log('🔍 [DEBUG] Document is not signed, opening agreement');
            handleOpenAgreement(e);
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

      {showAgreement && (
        <StudentTrainingAgreement
          training={training}
          participant={participant}
          onCancel={handleCloseAgreement}
        />
      )}

      {showSignedDocument && signedDocumentUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-[9999] overflow-hidden">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Convention de formation signée
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
                  onClick={handleCloseAgreement}
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