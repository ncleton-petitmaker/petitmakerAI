import React, { useEffect, useState } from 'react';
import { DocumentManager } from './shared/DocumentManager';
import SafeImage from './shared/SafeImage';
import { Loader2 } from 'lucide-react';

interface SignatureTestProps {
  trainingId: string;
  userId: string;
}

/**
 * Composant de test pour vérifier le chargement des signatures
 */
const SignatureTest: React.FC<SignatureTestProps> = ({ trainingId, userId }) => {
  const [participantSignature, setParticipantSignature] = useState<string | null>(null);
  const [representativeSignature, setRepresentativeSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignatures = async () => {
      try {
        setLoading(true);
        setError(null);

        // Récupérer la signature du participant
        const participantSig = await DocumentManager.getLastSignature({
          training_id: trainingId,
          user_id: userId,
          type: 'convention',
          signature_type: 'participant'
        });

        // Récupérer la signature du représentant
        const representativeSig = await DocumentManager.getLastSignature({
          training_id: trainingId,
          type: 'convention',
          signature_type: 'representative'
        });

        console.log('Test signatures - Participant:', participantSig ? 'Présente' : 'Absente');
        console.log('Test signatures - Représentant:', representativeSig ? 'Présente' : 'Absente');

        setParticipantSignature(participantSig);
        setRepresentativeSignature(representativeSig);
      } catch (err) {
        console.error('Erreur lors du chargement des signatures:', err);
        setError('Erreur lors du chargement des signatures');
      } finally {
        setLoading(false);
      }
    };

    fetchSignatures();
  }, [trainingId, userId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-4 border rounded-md">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="mt-2">Chargement des signatures...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-md">
      <h2 className="text-lg font-semibold mb-4">Test de chargement des signatures</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="border p-3 rounded-md">
          <h3 className="font-medium mb-2">Signature du participant</h3>
          {participantSignature ? (
            <div className="h-28 border border-gray-300 flex items-center justify-center">
              <SafeImage 
                src={participantSignature} 
                alt="Signature du participant" 
                className="max-h-20 max-w-[95%] object-contain"
              />
            </div>
          ) : (
            <div className="h-28 border border-gray-300 flex items-center justify-center bg-gray-50">
              <p className="text-gray-400 italic">Signature non disponible</p>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500 break-all">{participantSignature || 'Aucune URL'}</p>
        </div>
        
        <div className="border p-3 rounded-md">
          <h3 className="font-medium mb-2">Signature du représentant</h3>
          {representativeSignature ? (
            <div className="h-28 border border-gray-300 flex items-center justify-center">
              <SafeImage 
                src={representativeSignature} 
                alt="Signature du représentant" 
                className="max-h-20 max-w-[95%] object-contain"
              />
            </div>
          ) : (
            <div className="h-28 border border-gray-300 flex items-center justify-center bg-gray-50">
              <p className="text-gray-400 italic">Signature non disponible</p>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500 break-all">{representativeSignature || 'Aucune URL'}</p>
        </div>
      </div>
    </div>
  );
};

export default SignatureTest; 