import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  FileText, 
  TrendingUp, 
  Calendar,
  BarChart3,
  PieChart,
  Bell
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const DashboardView = () => {
  console.log("🔍 [DEBUG] DashboardView - Component initializing");
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalLearners: 0,
    totalDocuments: 0,
    activeTrainings: 0
  });

  useEffect(() => {
    console.log("🔍 [DEBUG] DashboardView - Component mounted");
    fetchNotifications();
    fetchStats();
    
    // Set up real-time subscription for stats updates
    console.log("🔍 [DEBUG] DashboardView - Setting up real-time subscriptions");
    const subscription = supabase
      .channel('dashboard_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'companies',
      }, (payload) => {
        console.log("🔍 [DEBUG] DashboardView - Companies table change detected:", payload);
        fetchStats();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_profiles',
      }, (payload) => {
        console.log("🔍 [DEBUG] DashboardView - User profiles table change detected:", payload);
        fetchStats();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'documents',
      }, (payload) => {
        console.log("🔍 [DEBUG] DashboardView - Documents table change detected:", payload);
        fetchStats();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trainings',
      }, (payload) => {
        console.log("🔍 [DEBUG] DashboardView - Trainings table change detected:", payload);
        fetchStats();
      })
      .subscribe();

    return () => {
      console.log("🔍 [DEBUG] DashboardView - Component unmounting, cleaning up subscriptions");
      subscription.unsubscribe();
    };
  }, []);

  const fetchStats = async () => {
    console.log("🔍 [DEBUG] DashboardView - Fetching stats");
    try {
      // Fetch companies count
      console.log("🔍 [DEBUG] DashboardView - Fetching companies count");
      const { count: companiesCount, error: companiesError } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });
      
      if (companiesError) {
        console.error("🔍 [DEBUG] DashboardView - Error fetching companies:", companiesError);
        console.error("🔍 [DEBUG] DashboardView - Error details:", companiesError.message);
      } else {
        console.log("🔍 [DEBUG] DashboardView - Companies count:", companiesCount);
      }
      
      // Fetch learners count
      console.log("🔍 [DEBUG] DashboardView - Fetching learners count");
      const { count: learnersCount, error: learnersError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_admin', false);
      
      if (learnersError) {
        console.error("🔍 [DEBUG] DashboardView - Error fetching learners:", learnersError);
        console.error("🔍 [DEBUG] DashboardView - Error details:", learnersError.message);
      } else {
        console.log("🔍 [DEBUG] DashboardView - Learners count:", learnersCount);
      }
      
      // Fetch documents count
      console.log("🔍 [DEBUG] DashboardView - Fetching documents count");
      const { count: documentsCount, error: documentsError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });
      
      if (documentsError) {
        console.error("🔍 [DEBUG] DashboardView - Error fetching documents:", documentsError);
        console.error("🔍 [DEBUG] DashboardView - Error details:", documentsError.message);
      } else {
        console.log("🔍 [DEBUG] DashboardView - Documents count:", documentsCount);
      }
      
      // Fetch active trainings count
      console.log("🔍 [DEBUG] DashboardView - Fetching active trainings count");
      const { count: trainingsCount, error: trainingsError } = await supabase
        .from('trainings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');
      
      if (trainingsError) {
        console.error("🔍 [DEBUG] DashboardView - Error fetching trainings:", trainingsError);
        console.error("🔍 [DEBUG] DashboardView - Error details:", trainingsError.message);
      } else {
        console.log("🔍 [DEBUG] DashboardView - Active trainings count:", trainingsCount);
      }
      
      console.log("🔍 [DEBUG] DashboardView - Setting stats state with new values:", {
        companies: companiesCount || 0,
        learners: learnersCount || 0,
        documents: documentsCount || 0,
        trainings: trainingsCount || 0
      });

      setStats({
        totalCompanies: companiesCount || 0,
        totalLearners: learnersCount || 0,
        totalDocuments: documentsCount || 0,
        activeTrainings: trainingsCount || 0
      });
    } catch (error) {
      console.error('🔍 [DEBUG] DashboardView - Error fetching stats:', error);
      if (error instanceof Error) {
        console.error('🔍 [DEBUG] DashboardView - Error details:', error.message);
        console.error('🔍 [DEBUG] DashboardView - Error stack:', error.stack);
      }
    }
  };

  const fetchNotifications = async () => {
    console.log("🔍 [DEBUG] DashboardView - Fetching notifications");
    try {
      setIsLoading(true);
      
      // Fetch notifications from Supabase
      console.log("🔍 [DEBUG] DashboardView - Querying notifications table");
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error("🔍 [DEBUG] DashboardView - Error fetching notifications:", error);
        console.error("🔍 [DEBUG] DashboardView - Error details:", error.message);
        throw error;
      }
      
      console.log("🔍 [DEBUG] DashboardView - Notifications fetched:", data?.length || 0);
      console.log("🔍 [DEBUG] DashboardView - Notifications data:", data);
      setNotifications(data || []);
    } catch (error) {
      console.error('🔍 [DEBUG] DashboardView - Error fetching notifications:', error);
      if (error instanceof Error) {
        console.error('🔍 [DEBUG] DashboardView - Error details:', error.message);
        console.error('🔍 [DEBUG] DashboardView - Error stack:', error.stack);
      }
      
      // Fallback to mock data
      const mockNotifications = [
        { 
          id: '1', 
          type: 'new_company', 
          title: 'Nouvelle entreprise ajoutée', 
          message: 'L\'entreprise "Tech Solutions SAS" a été ajoutée. Veuillez compléter les informations.', 
          is_read: false, 
          created_at: new Date().toISOString() 
        },
        { 
          id: '2', 
          type: 'new_learner', 
          title: 'Nouvel apprenant inscrit', 
          message: 'Jean Dupont de l\'entreprise "Tech Solutions SAS" s\'est inscrit.', 
          is_read: false, 
          created_at: new Date(Date.now() - 3600000).toISOString() 
        }
      ];
      console.log("🔍 [DEBUG] DashboardView - Using mock notifications:", mockNotifications);
      setNotifications(mockNotifications);
    } finally {
      console.log("🔍 [DEBUG] DashboardView - Setting isLoading to false");
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    console.log("🔍 [DEBUG] DashboardView - Marking notification as read:", id);
    try {
      // Update notification in Supabase
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      
      if (error) {
        console.error("🔍 [DEBUG] DashboardView - Error marking notification as read:", error);
        throw error;
      }
      
      console.log("🔍 [DEBUG] DashboardView - Notification marked as read successfully");
      
      // Update local state
      setNotifications(notifications.map(notification => 
        notification.id === id 
          ? { ...notification, is_read: true } 
          : notification
      ));
      setStats(prev => ({
        ...prev,
        unreadNotifications: Math.max(0, (prev.unreadNotifications || 0) - 1)
      }));
    } catch (error) {
      console.error('🔍 [DEBUG] DashboardView - Error marking notification as read:', error);
      if (error instanceof Error) {
        console.error('🔍 [DEBUG] DashboardView - Error details:', error.message);
      }
    }
  };

  const markAllAsRead = async () => {
    console.log("🔍 [DEBUG] DashboardView - Marking all notifications as read");
    try {
      const unreadIds = notifications
        .filter(notification => !notification.is_read)
        .map(notification => notification.id);
      
      console.log("🔍 [DEBUG] DashboardView - Unread notification IDs:", unreadIds);
      
      if (unreadIds.length === 0) {
        console.log("🔍 [DEBUG] DashboardView - No unread notifications to mark");
        return;
      }
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
      
      if (error) {
        console.error("🔍 [DEBUG] DashboardView - Error marking all notifications as read:", error);
        throw error;
      }
      
      console.log("🔍 [DEBUG] DashboardView - All notifications marked as read successfully");
      
      // Update local state
      setNotifications(notifications.map(notification => ({
        ...notification,
        is_read: true
      })));
      setStats(prev => ({
        ...prev,
        unreadNotifications: 0
      }));
    } catch (error) {
      console.error('🔍 [DEBUG] DashboardView - Error marking all notifications as read:', error);
      if (error instanceof Error) {
        console.error('🔍 [DEBUG] DashboardView - Error details:', error.message);
      }
    }
  };

  const statCards = [
    {
      title: 'Entreprises',
      value: stats.totalCompanies,
      icon: Building2,
      color: 'bg-blue-500',
      link: '#companies'
    },
    {
      title: 'Apprenants',
      value: stats.totalLearners,
      icon: Users,
      color: 'bg-green-500',
      link: '#learners'
    },
    {
      title: 'Documents',
      value: stats.totalDocuments,
      icon: FileText,
      color: 'bg-purple-500',
      link: '#documents'
    },
    {
      title: 'Formations actives',
      value: stats.activeTrainings,
      icon: Calendar,
      color: 'bg-orange-500',
      link: '#trainings'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notifications.filter(n => !n.is_read).length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Bell className="mr-2 h-5 w-5 text-red-500" />
                Notifications
                <span className="ml-2 bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {notifications.filter(n => !n.is_read).length}
                </span>
              </h3>
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Tout marquer comme lu
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {notifications.filter(n => !n.is_read).map((notification) => (
              <div key={notification.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {notification.type === 'new_learner' && <Users className="h-5 w-5 text-green-500" />}
                    {notification.type === 'new_company' && <Building2 className="h-5 w-5 text-blue-500" />}
                    {notification.type === 'document' && <FileText className="h-5 w-5 text-purple-500" />}
                    {notification.type === 'training' && <Calendar className="h-5 w-5 text-orange-500" />}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500">{notification.message}</p>
                  </div>
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Marquer comme lu</span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div 
            key={index}
            className="bg-white rounded-lg shadow p-6 transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.color} text-white`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4">
              <a 
                href={stat.link} 
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Voir les détails
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Inscriptions mensuelles</h3>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
              <p className="text-gray-500">Aucune donnée disponible</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Répartition par secteur</h3>
              <PieChart className="h-5 w-5 text-gray-400" />
            </div>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
              <p className="text-gray-500">Aucune donnée disponible</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Activité récente</h3>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="p-6 text-center">
            <p className="text-gray-500">Aucune activité récente</p>
          </div>
        </div>
      </div>

      {/* Upcoming Trainings */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Formations à venir</h3>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-500">Aucune formation à venir</p>
        </div>
      </div>
    </div>
  );
};