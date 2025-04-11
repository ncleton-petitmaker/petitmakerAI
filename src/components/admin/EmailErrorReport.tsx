import React, { useState, useEffect } from 'react';
import { getEmailErrorReport } from '../../services/api/emailTemplateService';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Button } from '../ui/button';
import { AlertTriangle, ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { ViewType } from './AdminSidebar';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface EmailErrorReportProps {
  setCurrentView: (view: ViewType) => void;
}

const EmailErrorReport: React.FC<EmailErrorReportProps> = ({ setCurrentView }) => {
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchErrors();
  }, []);
  
  const fetchErrors = async () => {
    setLoading(true);
    try {
      const response = await getEmailErrorReport();
      if (response.success) {
        setErrors(response.data || []);
      } else {
        setError('Erreur lors de la récupération des rapports d\'erreur');
      }
    } catch (err) {
      setError('Erreur lors de la récupération des rapports d\'erreur');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy à HH:mm', { locale: fr });
    } catch (e) {
      return 'Date invalide';
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setCurrentView('email-templates')}
          className="mr-2"
        >
          <ArrowLeft size={16} />
        </Button>
        <h1 className="text-2xl font-bold">Rapport d'erreurs d'emails</h1>
      </div>
      
      <div className="flex justify-end mb-6">
        <Button 
          variant="outline" 
          onClick={fetchErrors}
          className="flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Actualiser
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-red-500">{error}</p>
        </div>
      ) : errors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center pt-10 pb-10">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <AlertTriangle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-medium mb-2">Aucune erreur à signaler</h3>
            <p className="text-gray-500 text-center max-w-md">
              Tous les emails semblent avoir été envoyés correctement. Vérifiez à nouveau plus tard ou après l'envoi d'emails.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Erreurs d'envoi d'emails</CardTitle>
            <CardDescription>
              Liste des erreurs survenues lors de l'envoi d'emails - {errors.length} erreur(s) détectée(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Modèle</TableHead>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Formation</TableHead>
                  <TableHead>Message d'erreur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.map((err) => (
                  <TableRow key={err.id} className="hover:bg-red-50">
                    <TableCell className="font-medium">
                      {formatDate(err.created_at)}
                    </TableCell>
                    <TableCell>
                      {err.email_templates?.name || 'Modèle inconnu'}
                    </TableCell>
                    <TableCell>
                      {err.user_profiles ? (
                        <div>
                          <div>{`${err.user_profiles.first_name} ${err.user_profiles.last_name}`}</div>
                          <div className="text-xs text-gray-500">{err.user_profiles.email}</div>
                        </div>
                      ) : (
                        'Destinataire inconnu'
                      )}
                    </TableCell>
                    <TableCell>
                      {err.trainings?.title || 'Formation inconnue'}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate text-red-600">
                        {err.error_message}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailErrorReport; 