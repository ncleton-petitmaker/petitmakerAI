import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  LogOut,
  BookOpen,
  Users,
  MessageSquare,
  FileText,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export const StudentResources = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/espace-stagiaires');
        return;
      }
      setLoading(false);
    };

    checkUser();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/espace-stagiaires');
  };

  const resources = [
    {
      id: 'prompts',
      title: "Liste de prompts",
      description: "Une collection de prompts efficaces pour différents cas d'usage",
      icon: BookOpen,
      url: "https://burnt-match-361.notion.site/ebd/423ef7b032f24225b91777c7b00e628a",
      type: 'iframe'
    },
    {
      id: 'creators',
      title: "Créateurs de contenu IA",
      description: "Liste des créateurs de contenu à suivre dans le domaine de l'IA",
      icon: Users,
      url: "https://burnt-match-361.notion.site/ebd/1a4d0270ab3580eba38ee6d622c7d595",
      type: 'iframe'
    },
    {
      id: 'linkedin',
      title: "Posts LinkedIn pépites",
      description: "Sélection des meilleurs posts LinkedIn sur l'IA",
      icon: MessageSquare,
      url: "https://burnt-match-361.notion.site/ebd/1a4d0270ab35804bb331d22319c2f724",
      type: 'iframe'
    },
    {
      id: 'training',
      title: "Supports de formation",
      description: "Accédez aux supports de formation complets",
      icon: FileText,
      url: "https://drive.google.com/drive/folders/1PNIIiI-Rdu7xEuNQ3VPSYCK1Lf5FYPDj?usp=sharing",
      type: 'external'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (selectedResource) {
    const resource = resources.find(r => r.id === selectedResource);
    if (!resource) return null;

    return (
      <div className="fixed inset-0 bg-black flex flex-col">
        <div className="bg-gray-900 border-b border-gray-800">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <button 
              onClick={() => setSelectedResource(null)}
              className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour aux ressources
            </button>
            <h1 className="text-lg font-semibold">{resource.title}</h1>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
        <iframe
          src={resource.url}
          className="flex-1 w-full h-full border-0"
          title={resource.title}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link 
                to="/espace-stagiaires/tableau-de-bord"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Retour au tableau de bord
              </Link>
              <h1 className="text-3xl font-bold">Ressources</h1>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
              aria-label="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>

          {/* Resources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resources.map((resource) => (
              resource.type === 'external' ? (
                <a
                  key={resource.id}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                      <resource.icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-lg font-semibold">{resource.title}</h2>
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-gray-400">{resource.description}</p>
                    </div>
                  </div>
                </a>
              ) : (
                <button
                  key={resource.id}
                  onClick={() => setSelectedResource(resource.id)}
                  className="bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition-colors group text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                      <resource.icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold mb-2">{resource.title}</h2>
                      <p className="text-gray-400">{resource.description}</p>
                    </div>
                  </div>
                </button>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};