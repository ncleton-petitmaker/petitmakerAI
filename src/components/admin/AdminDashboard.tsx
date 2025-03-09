import React, { useState, useEffect } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { CompaniesView } from './CompaniesView';
import { LearnersView } from './LearnersView';
import { DocumentsView } from './DocumentsView';
import { SettingsView } from './SettingsView';
import { DashboardView } from './DashboardView';
import { TrainingsView } from './TrainingsView';
import { QuestionnairesView } from './QuestionnairesView';
import { TrainersView } from './TrainersView';
import { useLocation } from 'react-router-dom';

type ViewType = 'dashboard' | 'companies' | 'learners' | 'documents' | 'settings' | 'trainings' | 'questionnaires' | 'trainers';

export const AdminDashboard = () => {
  console.log("AdminDashboard - Component initializing");
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  useEffect(() => {
    console.log("AdminDashboard - Component mounted");
    
    // Si nous avons un état pour éditer une entreprise, basculer vers la vue des entreprises
    if (location.state && location.state.openCompanyEdit) {
      setCurrentView('companies');
    }
    // Si nous avons un état pour éditer un apprenant, basculer vers la vue des apprenants
    else if (location.state && location.state.openLearnerEdit) {
      setCurrentView('learners');
    }
    // Si nous avons un état pour éditer une formation, basculer vers la vue des formations
    else if (location.state && location.state.openTrainingEdit) {
      setCurrentView('trainings');
    }
    // Si nous avons un état pour éditer un formateur, basculer vers la vue des formateurs
    else if (location.state && location.state.openTrainerEdit) {
      setCurrentView('trainers');
    }
    
    return () => {
      console.log("AdminDashboard - Component unmounting");
    };
  }, [location.state]);

  useEffect(() => {
    console.log("AdminDashboard - Current view changed to:", currentView);
  }, [currentView]);

  const renderView = () => {
    console.log("AdminDashboard - Rendering view:", currentView);
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'companies':
        return <CompaniesView />;
      case 'learners':
        return <LearnersView />;
      case 'documents':
        return <DocumentsView />;
      case 'settings':
        return <SettingsView />;
      case 'trainings':
        return <TrainingsView />;
      case 'questionnaires':
        return <QuestionnairesView />;
      case 'trainers':
        return <TrainersView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex text-gray-900">
      <AdminSidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <div className="flex-1 flex flex-col">
        <AdminHeader 
          title={getViewTitle(currentView)} 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

const getViewTitle = (view: ViewType): string => {
  switch (view) {
    case 'dashboard':
      return 'Tableau de bord';
    case 'companies':
      return 'Entreprises';
    case 'learners':
      return 'Apprenants';
    case 'documents':
      return 'Documents';
    case 'settings':
      return 'Paramètres';
    case 'trainings':
      return 'Formations';
    case 'questionnaires':
      return 'Questionnaires';
    case 'trainers':
      return 'Formateurs';
    default:
      return 'Tableau de bord';
  }
};