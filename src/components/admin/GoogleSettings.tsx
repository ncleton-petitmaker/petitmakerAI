import React, { useState, useEffect } from 'react';
import { 
  checkGoogleConnection, 
  connectToGoogle, 
  disconnectFromGoogle 
} from '../../services/api/emailSenderService';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { ArrowLeft, CheckCircle, ExternalLink, Loader2, Mail, XCircle } from 'lucide-react';
import { ViewType } from './AdminSidebar';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { toast } from 'react-hot-toast';

interface GoogleSettingsProps {
  setCurrentView: (view: ViewType) => void;
}

const GoogleSettings: React.FC<GoogleSettingsProps> = ({ setCurrentView }) => {
  const [connected, setConnected] = useState<boolean>(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [disconnectLoading, setDisconnectLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    checkConnection();
  }, []);
  
  const checkConnection = async () => {
    setLoading(true);
    try {
      const response = await checkGoogleConnection();
      if (response.success) {
        setConnected(response.data.connected);
        setEmail(response.data.email);
      } else {
        setError('Erreur lors de la vérification de la connexion Google');
      }
    } catch (err) {
      setError('Erreur lors de la vérification de la connexion Google');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleConnect = async () => {
    try {
      const response = await connectToGoogle();
      if (response.success) {
        // Redirect to Google OAuth page
        window.location.href = response.data.url;
      } else {
        setError('Erreur lors de la connexion à Google');
        toast.error('Erreur lors de la connexion à Google');
      }
    } catch (err) {
      setError('Erreur lors de la connexion à Google');
      toast.error('Erreur lors de la connexion à Google');
      console.error(err);
    }
  };
  
  const handleDisconnect = async () => {
    setDisconnectLoading(true);
    try {
      const response = await disconnectFromGoogle();
      if (response.success) {
        setConnected(false);
        setEmail(null);
        toast.success('Déconnecté de Google avec succès');
      } else {
        setError('Erreur lors de la déconnexion de Google');
        toast.error('Erreur lors de la déconnexion de Google');
      }
    } catch (err) {
      setError('Erreur lors de la déconnexion de Google');
      toast.error('Erreur lors de la déconnexion de Google');
      console.error(err);
    } finally {
      setDisconnectLoading(false);
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setCurrentView('settings')}
          className="mr-2"
        >
          <ArrowLeft size={16} />
        </Button>
        <h1 className="text-2xl font-bold">Connexion Google</h1>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Gmail</CardTitle>
              <CardDescription>
                Connectez votre compte Gmail pour envoyer des emails depuis l'application
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connected ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-green-800">Compte Google connecté</h3>
                    <p className="text-green-700 mt-1">
                      Vous êtes connecté avec l'adresse <strong>{email}</strong>.
                      Vous pouvez maintenant envoyer des emails depuis cette adresse.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 flex items-center">
                    <Mail className="h-5 w-5 mr-2" />
                    Connexion à Gmail requise
                  </h3>
                  <p className="text-blue-700 mt-1">
                    Pour envoyer des emails, vous devez connecter un compte Gmail. 
                    Cliquez sur le bouton ci-dessous pour autoriser l'application à envoyer des emails.
                  </p>
                  <div className="mt-3">
                    <Button 
                      onClick={handleConnect}
                      className="bg-[#4285F4] hover:bg-[#3367D6] text-white"
                    >
                      Se connecter à Google
                      <ExternalLink size={16} className="ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            {connected && (
              <CardFooter className="flex justify-end border-t px-6 py-4">
                <Button 
                  variant="outline" 
                  onClick={handleDisconnect}
                  disabled={disconnectLoading}
                >
                  {disconnectLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Déconnexion...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Déconnecter le compte
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Informations importantes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-800 mb-1">Limites d'envoi Gmail</h3>
                <p className="text-gray-600 text-sm">
                  Gmail impose des limites sur le nombre d'emails que vous pouvez envoyer :
                </p>
                <ul className="list-disc list-inside text-gray-600 text-sm mt-2 space-y-1">
                  <li>500 emails par jour pour les comptes Gmail personnels</li>
                  <li>2000 emails par jour pour les comptes Google Workspace</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800 mb-1">Confidentialité</h3>
                <p className="text-gray-600 text-sm">
                  Nous ne stockons que les jetons d'accès nécessaires pour envoyer des emails en votre nom.
                  Nous n'avons pas accès à votre mot de passe Google.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800 mb-1">Déconnexion</h3>
                <p className="text-gray-600 text-sm">
                  Vous pouvez révoquer l'accès à tout moment en cliquant sur "Déconnecter le compte" 
                  ci-dessus ou en visitant les paramètres de sécurité de votre compte Google.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GoogleSettings; 