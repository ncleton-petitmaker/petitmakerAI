import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Mail, Check, AlertTriangle } from 'lucide-react';
import { connectToGoogle, checkGoogleConnection, disconnectFromGoogle } from '../../services/api/emailSenderService';
import { toast } from 'react-hot-toast';

interface GoogleAuthButtonProps {
  onStatusChange?: (connected: boolean) => void;
}

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ onStatusChange }) => {
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await checkGoogleConnection();
      
      if (response.success) {
        setConnected(!!response.data?.connected);
        if (onStatusChange) {
          onStatusChange(!!response.data?.connected);
        }
      } else {
        setConnected(false);
        setError('Impossible de vérifier la connexion à Google');
      }
    } catch (err) {
      console.error('Erreur lors de la vérification de la connexion Google:', err);
      setConnected(false);
      setError('Erreur lors de la vérification de la connexion Google');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await connectToGoogle();
      
      if (response.success && response.data?.authUrl) {
        // Ouvrir la fenêtre d'authentification Google
        window.open(response.data.authUrl, '_blank', 'width=600,height=700');
        
        // Vérifier périodiquement si la connexion a été établie
        const checkInterval = setInterval(async () => {
          const checkResponse = await checkGoogleConnection();
          if (checkResponse.success && checkResponse.data?.connected) {
            setConnected(true);
            if (onStatusChange) {
              onStatusChange(true);
            }
            clearInterval(checkInterval);
            toast.success('Connexion à Google établie avec succès');
          }
        }, 2000);
        
        // Arrêter de vérifier après 2 minutes (120 secondes)
        setTimeout(() => {
          clearInterval(checkInterval);
        }, 120000);
      } else {
        setError('Impossible d\'initialiser la connexion à Google');
        toast.error('Échec de la connexion à Google');
      }
    } catch (err) {
      console.error('Erreur lors de la connexion à Google:', err);
      setError('Erreur lors de la connexion à Google');
      toast.error('Erreur lors de la connexion à Google');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await disconnectFromGoogle();
      
      if (response.success) {
        setConnected(false);
        if (onStatusChange) {
          onStatusChange(false);
        }
        toast.success('Déconnexion de Google réussie');
      } else {
        setError('Impossible de se déconnecter de Google');
        toast.error('Échec de la déconnexion de Google');
      }
    } catch (err) {
      console.error('Erreur lors de la déconnexion de Google:', err);
      setError('Erreur lors de la déconnexion de Google');
      toast.error('Erreur lors de la déconnexion de Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 w-full">
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm mb-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}
      
      {connected ? (
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          disabled={loading}
          onClick={handleDisconnect}
        >
          <Check size={16} className="mr-2" />
          {loading ? 'Traitement en cours...' : 'Connecté à Google Gmail'}
        </Button>
      ) : (
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          disabled={loading}
          onClick={handleConnect}
        >
          <Mail size={16} className="mr-2" />
          {loading ? 'Connexion en cours...' : 'Se connecter à Google Gmail'}
        </Button>
      )}
    </div>
  );
};

export default GoogleAuthButton; 