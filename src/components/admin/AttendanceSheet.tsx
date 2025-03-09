import React, { useRef } from 'react';
import { X, Download } from 'lucide-react';
import { generateWordLikePDF } from './pdfGenerator';

interface AttendanceSheetProps {
  training: {
    id: string;
    title: string;
    duration: string;
    trainer_name: string;
    location: string;
    start_date: string | null;
    end_date: string | null;
  };
  participant: {
    id: string;
    first_name: string;
    last_name: string;
  };
  onCancel: () => void;
}

export const AttendanceSheet: React.FC<AttendanceSheetProps> = ({
  training,
  participant,
  onCancel
}) => {
  const pdfContentRef = useRef<HTMLDivElement>(null);

  // Fonction pour générer le PDF
  const generatePDF = async () => {
    if (!pdfContentRef.current) return;
    
    try {
      // Générer un nom de fichier basé sur le nom du participant et le titre de la formation
      const fileName = `Emargement_${participant.first_name}_${participant.last_name}_${training.title.replace(/\s+/g, '_')}.pdf`;
      
      // Utiliser la fonction pour générer un PDF
      await generateWordLikePDF(pdfContentRef.current, fileName);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
    }
  };

  // Calculer les dates de formation
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'xx/xx/xxxx';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Calculer les dates pour les deux jours de formation
  const getTrainingDates = () => {
    if (!training.start_date) {
      return ['xx/xx/xxxx', 'xx/xx/xxxx'];
    }
    
    const startDate = new Date(training.start_date);
    
    // Si la formation dure 2 jours, calculer la date du deuxième jour
    if (training.duration && training.duration.includes('2 jours')) {
      const secondDay = new Date(startDate);
      secondDay.setDate(secondDay.getDate() + 1);
      return [
        startDate.toLocaleDateString('fr-FR'),
        secondDay.toLocaleDateString('fr-FR')
      ];
    }
    
    // Si la formation a une date de fin, l'utiliser
    if (training.end_date) {
      return [
        startDate.toLocaleDateString('fr-FR'),
        new Date(training.end_date).toLocaleDateString('fr-FR')
      ];
    }
    
    // Par défaut, retourner la date de début deux fois
    return [startDate.toLocaleDateString('fr-FR'), 'xx/xx/xxxx'];
  };

  const trainingDates = getTrainingDates();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-[100] overflow-hidden p-0 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[100vh] sm:max-h-[90vh] overflow-hidden flex flex-col m-0">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">
            Feuille d'émargement - {participant.first_name} {participant.last_name}
          </h3>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={generatePDF}
              className="text-blue-600 hover:text-blue-800 flex items-center"
              title="Générer un PDF"
            >
              <Download className="h-5 w-5 mr-1" />
              <span className="hidden sm:inline">Générer PDF</span>
            </button>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div ref={pdfContentRef} className="bg-white max-w-[210mm] mx-auto">
            {/* Contenu de la feuille d'émargement */}
            <div className="border border-gray-800 p-2 sm:p-4 mb-4 sm:mb-8">
              <h2 className="text-center text-lg sm:text-xl font-bold mb-4 sm:mb-8">FEUILLE D'ÉMARGEMENT</h2>
              
              <div className="mb-4 sm:mb-6 text-sm sm:text-base">
                <p><strong>Stagiaire :</strong> {participant.first_name} {participant.last_name}</p>
                <p><strong>Formation :</strong> {training.title}</p>
                <p><strong>Durée :</strong> {training.duration || '2 jours (soit 14 heures)'}</p>
                <p><strong>Formateur :</strong> {training.trainer_name || 'À définir'}</p>
                <p><strong>Lieu de la formation :</strong> {training.location || 'adresse'}</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr>
                      <th className="border border-gray-400 bg-gray-200 p-1 sm:p-2">Dates</th>
                      <th className="border border-gray-400 bg-gray-200 p-1 sm:p-2">Horaires</th>
                      <th className="border border-gray-400 bg-gray-200 p-1 sm:p-2">Signature<br />du stagiaire</th>
                      <th className="border border-gray-400 bg-gray-200 p-1 sm:p-2">Signature<br />du formateur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Jour 1 - Matin */}
                    <tr>
                      <td rowSpan={2} className="border border-gray-400 p-1 sm:p-2 text-center">
                        {trainingDates[0]}
                      </td>
                      <td className="border border-gray-400 p-1 sm:p-2 text-center">
                        De 9h à<br />12h30
                      </td>
                      <td className="border border-gray-400 p-1 sm:p-2 h-12 sm:h-16"></td>
                      <td className="border border-gray-400 p-1 sm:p-2 h-12 sm:h-16"></td>
                    </tr>
                    {/* Jour 1 - Après-midi */}
                    <tr>
                      <td className="border border-gray-400 p-1 sm:p-2 text-center">
                        De 13h30<br />à 17h
                      </td>
                      <td className="border border-gray-400 p-1 sm:p-2 h-12 sm:h-16"></td>
                      <td className="border border-gray-400 p-1 sm:p-2 h-12 sm:h-16"></td>
                    </tr>
                    
                    {/* Jour 2 - Matin */}
                    <tr>
                      <td rowSpan={2} className="border border-gray-400 p-1 sm:p-2 text-center">
                        {trainingDates[1]}
                      </td>
                      <td className="border border-gray-400 p-1 sm:p-2 text-center">
                        De 9h à<br />12h30
                      </td>
                      <td className="border border-gray-400 p-1 sm:p-2 h-12 sm:h-16"></td>
                      <td className="border border-gray-400 p-1 sm:p-2 h-12 sm:h-16"></td>
                    </tr>
                    {/* Jour 2 - Après-midi */}
                    <tr>
                      <td className="border border-gray-400 p-1 sm:p-2 text-center">
                        De 13h30<br />à 17h
                      </td>
                      <td className="border border-gray-400 p-1 sm:p-2 h-12 sm:h-16"></td>
                      <td className="border border-gray-400 p-1 sm:p-2 h-12 sm:h-16"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 