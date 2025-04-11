import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ClipboardList,
  UserCog,
  Mail,
  Upload,
  AlertTriangle,
  Cog
} from 'lucide-react';

export type ViewType = 'dashboard' | 'companies' | 'learners' | 'documents' | 'settings' | 'trainings' | 'questionnaires' | 'trainers' | 'email-templates' | 'email-create' | 'email-errors' | 'google-settings';

interface AdminSidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
}

interface MenuItem {
  id?: string;
  section?: string;
  label: string;
  icon?: React.ElementType;
  items?: MenuItem[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ 
  currentView, 
  setCurrentView,
  isOpen,
  toggleSidebar
}) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: LayoutDashboard
    },
    {
      id: 'companies',
      label: 'Entreprises',
      icon: Building2
    },
    {
      id: 'learners',
      label: 'Apprenants',
      icon: Users
    },
    {
      id: 'trainings',
      label: 'Formations',
      icon: GraduationCap
    },
    {
      id: 'trainers',
      label: 'Formateurs',
      icon: UserCog
    },
    {
      id: 'questionnaires',
      label: 'Questionnaires',
      icon: ClipboardList
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText
    },
    {
      id: 'email-templates',
      label: 'Modèles d\'emails',
      icon: Mail
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings
    }
  ];

  const renderMenuItem = (item: MenuItem) => {
    // Si c'est une section avec des sous-menus
    if (item.section) {
      return (
        <li key={item.section} className="mt-6">
          {isOpen && (
            <div className="px-4 mb-2">
              <span className="text-xs uppercase font-semibold text-gray-400">
                {item.label}
              </span>
            </div>
          )}
          <ul className="space-y-1">
            {item.items?.map(subItem => renderSubMenuItem(subItem))}
          </ul>
        </li>
      );
    }
    
    // Si c'est un élément de menu principal avec des sous-menus
    if (item.items) {
      return (
        <li key={item.id}>
          <button
            onClick={() => setCurrentView(item.id as ViewType)}
            className={`w-full flex items-center py-2 px-4 ${
              currentView === item.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            } rounded-md transition-colors`}
          >
            <item.icon className="h-5 w-5" />
            {isOpen && <span className="ml-3">{item.label}</span>}
          </button>
          {isOpen && item.items && (
            <ul className="pl-10 mt-1 space-y-1">
              {item.items.map(subItem => renderSubMenuItem(subItem))}
            </ul>
          )}
        </li>
      );
    }
    
    // Menu item standard
    return (
      <li key={item.id}>
        <button
          onClick={() => setCurrentView(item.id as ViewType)}
          className={`w-full flex items-center py-2 px-4 ${
            currentView === item.id
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-800'
          } rounded-md transition-colors`}
        >
          <item.icon className="h-5 w-5" />
          {isOpen && <span className="ml-3">{item.label}</span>}
        </button>
      </li>
    );
  };

  const renderSubMenuItem = (item: MenuItem) => (
    <li key={item.id}>
      <button
        onClick={() => setCurrentView(item.id as ViewType)}
        className={`w-full flex items-center py-2 px-4 ${
          currentView === item.id
            ? 'bg-blue-600 text-white'
            : 'text-gray-300 hover:bg-gray-800'
        } rounded-md transition-colors ${isOpen ? 'text-sm' : ''}`}
      >
        <item.icon className={`${isOpen ? 'h-4 w-4' : 'h-5 w-5'}`} />
        {isOpen && <span className="ml-3">{item.label}</span>}
      </button>
    </li>
  );

  return (
    <aside 
      className={`bg-gray-900 text-white transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-20'
      } flex flex-col overflow-y-auto`}
    >
      <div className="p-4  flex items-center justify-between border-b border-gray-700">
        <h1 className={`font-bold text-xl ${isOpen ? 'block' : 'hidden'}`}>PETITMAKER</h1>
        <button
          onClick={toggleSidebar}
          className="p-1 rounded-md hover:bg-gray-700 transition-colors"
          aria-label={isOpen ? "Réduire le menu" : "Agrandir le menu"}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      <nav className="flex-1 py-4">
        <ul className="space-y-2">
          {menuItems.map(item => renderMenuItem(item))}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center py-2 px-4 text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
        >
          <LogOut className="h-5 w-5" />
          {isOpen && <span className="ml-3">Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
};