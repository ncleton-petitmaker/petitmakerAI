import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AttendanceSheetTemplateProps {
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
    job_position?: string;
  };
  organizationSettings?: {
    organization_name?: string;
    siret?: string;
    address?: string;
  };
  participantSignature?: string | null;
  trainerSignature?: string | null;
}

export const AttendanceSheetTemplate: React.FC<AttendanceSheetTemplateProps> = ({
  training,
  participant,
  organizationSettings,
  participantSignature,
  trainerSignature
}) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: fr });
    } catch (e) {
      console.error('Erreur de formatage de date:', e);
      return dateString;
    }
  };

  const getTrainingDates = () => {
    const startDate = formatDate(training.start_date);
    const endDate = formatDate(training.end_date);
    
    if (startDate && endDate && startDate !== endDate) {
      return `Du ${startDate} au ${endDate}`;
    } else if (startDate) {
      return `Le ${startDate}`;
    } else {
      return 'Date à définir';
    }
  };

  const getMorningAfternoonDates = () => {
    if (!training.start_date || !training.end_date) {
      return [];
    }

    const dates = [];
    const startDate = new Date(training.start_date);
    const endDate = new Date(training.end_date);
    
    // Ajuster l'heure pour éviter les problèmes de fuseaux horaires
    startDate.setHours(12, 0, 0, 0);
    endDate.setHours(12, 0, 0, 0);
    
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Ne pas inclure les week-ends
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  const dates = getMorningAfternoonDates();

  return (
    <div className="bg-white p-8 shadow-sm border border-gray-200 mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">FEUILLE D'ÉMARGEMENT</h1>
        <p className="text-sm text-gray-600">Formation professionnelle continue</p>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Informations sur la formation</h2>
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2 font-semibold bg-gray-100 w-1/3">Intitulé de la formation</td>
              <td className="border border-gray-300 p-2">{training.title}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 font-semibold bg-gray-100">Dates de formation</td>
              <td className="border border-gray-300 p-2">{getTrainingDates()}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 font-semibold bg-gray-100">Durée</td>
              <td className="border border-gray-300 p-2">{training.duration}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 font-semibold bg-gray-100">Lieu</td>
              <td className="border border-gray-300 p-2">{training.location}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 font-semibold bg-gray-100">Formateur</td>
              <td className="border border-gray-300 p-2">{training.trainer_name}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 font-semibold bg-gray-100">Organisme de formation</td>
              <td className="border border-gray-300 p-2">{organizationSettings?.organization_name || 'PetitMaker'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Participant</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 bg-gray-100">Nom</th>
              <th className="border border-gray-300 p-2 bg-gray-100">Prénom</th>
              <th className="border border-gray-300 p-2 bg-gray-100">Fonction</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2 text-center">{participant.last_name}</td>
              <td className="border border-gray-300 p-2 text-center">{participant.first_name}</td>
              <td className="border border-gray-300 p-2 text-center">{participant.job_position || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {dates.length > 0 ? (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Émargement</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2 bg-gray-100" rowSpan={2}>Date</th>
                <th className="border border-gray-300 p-2 bg-gray-100" colSpan={2}>Signature du stagiaire</th>
                <th className="border border-gray-300 p-2 bg-gray-100" colSpan={2}>Signature du formateur</th>
              </tr>
              <tr>
                <th className="border border-gray-300 p-2 bg-gray-100 text-sm">Matin</th>
                <th className="border border-gray-300 p-2 bg-gray-100 text-sm">Après-midi</th>
                <th className="border border-gray-300 p-2 bg-gray-100 text-sm">Matin</th>
                <th className="border border-gray-300 p-2 bg-gray-100 text-sm">Après-midi</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((date, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2 text-center">
                    {format(date, 'dd/MM/yyyy', { locale: fr })}
                  </td>
                  <td className="border border-gray-300 p-2 h-16">
                    {index === 0 && participantSignature ? (
                      <div className="flex flex-col justify-center items-center h-full">
                        <div className="text-xs text-center mb-1 font-semibold">
                          {participant.first_name} {participant.last_name}
                        </div>
                        <img src={participantSignature} alt="Signature stagiaire" className="max-h-12 max-w-full" />
                      </div>
                    ) : null}
                  </td>
                  <td className="border border-gray-300 p-2 h-16">
                    {index === 0 && participantSignature ? (
                      <div className="flex flex-col justify-center items-center h-full">
                        <div className="text-xs text-center mb-1 font-semibold">
                          {participant.first_name} {participant.last_name}
                        </div>
                        <img src={participantSignature} alt="Signature stagiaire" className="max-h-12 max-w-full" />
                      </div>
                    ) : null}
                  </td>
                  <td className="border border-gray-300 p-2 h-16">
                    {index === 0 && trainerSignature ? (
                      <div className="flex flex-col justify-center items-center h-full">
                        <div className="text-xs text-center mb-1 font-semibold">
                          {training.trainer_name}
                        </div>
                        <img src={trainerSignature} alt="Signature formateur" className="max-h-12 max-w-full" />
                      </div>
                    ) : null}
                  </td>
                  <td className="border border-gray-300 p-2 h-16">
                    {index === 0 && trainerSignature ? (
                      <div className="flex flex-col justify-center items-center h-full">
                        <div className="text-xs text-center mb-1 font-semibold">
                          {training.trainer_name}
                        </div>
                        <img src={trainerSignature} alt="Signature formateur" className="max-h-12 max-w-full" />
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Émargement</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2 bg-gray-100" rowSpan={2}>Date</th>
                <th className="border border-gray-300 p-2 bg-gray-100" colSpan={2}>Signature du stagiaire</th>
                <th className="border border-gray-300 p-2 bg-gray-100" colSpan={2}>Signature du formateur</th>
              </tr>
              <tr>
                <th className="border border-gray-300 p-2 bg-gray-100 text-sm">Matin</th>
                <th className="border border-gray-300 p-2 bg-gray-100 text-sm">Après-midi</th>
                <th className="border border-gray-300 p-2 bg-gray-100 text-sm">Matin</th>
                <th className="border border-gray-300 p-2 bg-gray-100 text-sm">Après-midi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 text-center">__/__/____</td>
                <td className="border border-gray-300 p-2 h-16">
                  {participantSignature ? (
                    <div className="flex flex-col justify-center items-center h-full">
                      <div className="text-xs text-center mb-1 font-semibold">
                        {participant.first_name} {participant.last_name}
                      </div>
                      <img src={participantSignature} alt="Signature stagiaire" className="max-h-12 max-w-full" />
                    </div>
                  ) : null}
                </td>
                <td className="border border-gray-300 p-2 h-16">
                  {participantSignature ? (
                    <div className="flex flex-col justify-center items-center h-full">
                      <div className="text-xs text-center mb-1 font-semibold">
                        {participant.first_name} {participant.last_name}
                      </div>
                      <img src={participantSignature} alt="Signature stagiaire" className="max-h-12 max-w-full" />
                    </div>
                  ) : null}
                </td>
                <td className="border border-gray-300 p-2 h-16">
                  {trainerSignature ? (
                    <div className="flex flex-col justify-center items-center h-full">
                      <div className="text-xs text-center mb-1 font-semibold">
                        {training.trainer_name}
                      </div>
                      <img src={trainerSignature} alt="Signature formateur" className="max-h-12 max-w-full" />
                    </div>
                  ) : null}
                </td>
                <td className="border border-gray-300 p-2 h-16">
                  {trainerSignature ? (
                    <div className="flex flex-col justify-center items-center h-full">
                      <div className="text-xs text-center mb-1 font-semibold">
                        {training.trainer_name}
                      </div>
                      <img src={trainerSignature} alt="Signature formateur" className="max-h-12 max-w-full" />
                    </div>
                  ) : null}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      
      <div className="mt-8 border-t border-gray-300 pt-4">
        <div className="flex justify-between items-start">
          <div className="w-1/2 pr-4">
            <p className="text-sm font-semibold mb-2">Stagiaire :</p>
            <p className="text-sm mb-1">{participant.first_name} {participant.last_name}</p>
            <p className="text-sm mb-1">{participant.job_position || ''}</p>
          </div>
          <div className="w-1/2 pl-4">
            <p className="text-sm font-semibold mb-2">Formateur :</p>
            <p className="text-sm mb-1">{training.trainer_name}</p>
            <p className="text-sm mb-4">{organizationSettings?.organization_name || 'PetitMaker'}</p>
          </div>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mt-8">
        <p>L'émargement atteste de la présence du stagiaire aux sessions de formation. Aucune modification ne peut être apportée à postériori.</p>
        <p>Document à conserver par l'organisme de formation pendant une période de 5 ans à compter de la fin de l'action de formation.</p>
      </div>
    </div>
  );
}; 