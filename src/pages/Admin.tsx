import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { AdminLogin } from '../components/admin/AdminLogin';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LearnerDetail } from '../components/admin/LearnerDetail';
import { CompanyDetail } from '../components/admin/CompanyDetail';
import { TrainerDetail } from '../components/admin/TrainerDetail';

export const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tablesCreated, setTablesCreated] = useState(false);
  const loadingTimeoutRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  // Force exit loading state after 10 seconds to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      console.log("Admin page - Setting loading timeout safety");
      loadingTimeoutRef.current = window.setTimeout(() => {
        console.log("Admin page - Loading timeout triggered, forcing exit from loading state");
        setIsLoading(false);
        setError("Le chargement a pris trop de temps. Veuillez rafraîchir la page.");
      }, 10000); // 10 seconds timeout
    }

    return () => {
      if (loadingTimeoutRef.current) {
        console.log("Admin page - Clearing loading timeout");
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading]);

  const checkAuth = async () => {
    try {
      console.log("Admin page - checkAuth started");
      setIsLoading(true);
      setError(null);

      // Get current session with timeout
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session retrieval timed out')), 5000);
      });

      const { data: { session } } = await Promise.race([
        sessionPromise,
        sessionTimeoutPromise
      ]) as any;

      if (!session) {
        console.log("Admin page - No session found");
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      console.log("Admin page - Session found, checking admin status");
      setIsAuthenticated(true);

      // Fast check: if the user is admin by email, set admin status immediately
      const isAdminEmail = session.user.email?.toLowerCase() === 'nicolas.cleton@petitmaker.fr';
      if (isAdminEmail) {
        console.log("Admin page - User is admin by email");
        setIsAdmin(true);
        setIsLoading(false);

        // Update profile in background
        try {
          await supabase
            .from('user_profiles')
            .upsert({ 
              id: session.user.id,
              is_admin: true,
              updated_at: new Date().toISOString()
            });
        } catch (error) {
          console.error("Admin page - Background profile update error:", error);
        }
        return;
      }

      // If not admin by email, check profile with timeout
      const profilePromise = supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();
      
      const profileTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile check timed out')), 5000);
      });

      const { data: profile } = await Promise.race([
        profilePromise,
        profileTimeoutPromise
      ]) as any;

      setIsAdmin(!!profile?.is_admin);
      setIsLoading(false);

    } catch (error: any) {
      console.error('Admin page - Error checking authentication:', error);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setError(error.message || 'Une erreur est survenue lors de la vérification de l\'authentification');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("Admin page - useEffect started");
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Admin page - Auth state change:", event);
      
      if (event === 'SIGNED_IN' && session) {
        const isAdminEmail = session.user.email?.toLowerCase() === 'nicolas.cleton@petitmaker.fr';
        setIsAuthenticated(true);
        setIsAdmin(isAdminEmail);
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [navigate]);

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Chargement de l'interface d'administration..." />;
  }

  if (error) {
    return (
      <ErrorDisplay 
        message={error} 
        onRetry={() => {
          setError(null);
          setIsLoading(true);
          checkAuth();
        }}
        onBack={() => navigate('/')}
      />
    );
  }

  if (isAuthenticated && isAdmin) {
    if (location.pathname.includes('/admin/learners/') && id) {
      return <LearnerDetail onBack={() => navigate('/admin')} />;
    }
    
    if (location.pathname.includes('/admin/companies/') && id) {
      return <CompanyDetail onBack={() => navigate('/admin')} />;
    }
    
    if (location.pathname.includes('/admin/trainers/') && id) {
      return <TrainerDetail onBack={() => navigate('/admin')} />;
    }
    
    return <AdminDashboard />;
  }
  
  return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
};