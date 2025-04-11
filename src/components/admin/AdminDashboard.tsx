import React, { useState, useEffect } from 'react';
import { AdminSidebar, ViewType } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { CompaniesView } from './CompaniesView';
import { LearnersView } from './LearnersView';
import { DocumentsView } from './DocumentsView';
import { SettingsView } from './SettingsView';
import { DashboardView } from './DashboardView';
import { TrainingsView } from './TrainingsView';
import { QuestionnairesView } from './QuestionnairesView';
import { TrainersView } from './TrainersView';
import EmailTemplatesList from './EmailTemplatesList';
import EmailTemplateForm from './EmailTemplateForm';
import EmailErrorReport from './EmailErrorReport';
import GoogleSettings from './GoogleSettings';
import { useLocation } from 'react-router-dom';

export const AdminDashboard = () => {
  console.log("AdminDashboard - Component initializing");
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
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
    // Ne pas réinitialiser le template lorsqu'on passe à la vue d'édition
    if (currentView !== 'email-create' && selectedTemplate) {
      console.log("AdminDashboard - Clearing selected template");
      setSelectedTemplate(null);
    }
  }, [currentView]);

  // Fonction spéciale pour gérer l'édition d'un modèle d'email
  const handleEditEmailTemplate = (template: any) => {
    console.log("AdminDashboard - handleEditEmailTemplate called with template:", template);
    // Définir d'abord le template sélectionné
    setSelectedTemplate(template);
    
    // Utiliser un petit délai pour garantir que le state est mis à jour avant de changer de vue
    setTimeout(() => {
      console.log("AdminDashboard - Changing view to email-create with template:", template.id);
      setCurrentView('email-create');
    }, 50);
  };

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
        return <SettingsView setCurrentView={setCurrentView} />;
      case 'trainings':
        return <TrainingsView />;
      case 'questionnaires':
        return <QuestionnairesView />;
      case 'trainers':
        return <TrainersView />;
      case 'email-templates':
        return <EmailTemplatesList 
          setCurrentView={setCurrentView} 
          setSelectedTemplate={setSelectedTemplate}
          onEditTemplate={handleEditEmailTemplate}
        />;
      case 'email-create':
        return <EmailTemplateForm setCurrentView={setCurrentView} selectedTemplate={selectedTemplate} />;
      case 'email-errors':
        return <EmailErrorReport setCurrentView={setCurrentView} />;
      case 'google-settings':
        return <GoogleSettings setCurrentView={setCurrentView} />;
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
    case 'email-templates':
      return 'Modèles d\'emails';
    case 'email-create':
      return 'Créer/Modifier un modèle d\'email';
    case 'email-errors':
      return 'Rapport d\'erreurs d\'emails';
    case 'google-settings':
      return 'Connexion Google';
    default:
      return 'Tableau de bord';
  }
};