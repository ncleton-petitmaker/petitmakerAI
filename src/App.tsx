import React from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { LegalNotices } from './pages/LegalNotices';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { StudentSpace } from './pages/StudentSpace';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentResources } from './pages/StudentResources';
import { TermsOfUse } from './pages/TermsOfUse';
import { Admin } from './pages/Admin';
import { TrainerProfile } from './pages/TrainerProfile';
import { CookieConsent } from './components/CookieConsent';
import { ResourcesButton } from './components/ResourcesButton';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import { LearnerDetail } from './components/admin/LearnerDetail';
import { CompanyDetail } from './components/admin/CompanyDetail';

function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }, [pathname]);

  return null;
}

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<User | null>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/espace-stagiaires" replace />;
  }

  return children;
}

function App() {
  return (
    <div className="min-h-screen bg-black">
      <ResourcesButton />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mentions-legales" element={<LegalNotices />} />
        <Route path="/politique-de-confidentialite" element={<PrivacyPolicy />} />
        <Route path="/cgu" element={<TermsOfUse />} />
        
        {/* Student Space Routes */}
        <Route path="/espace-stagiaires" element={<StudentSpace />} />
        <Route 
          path="/espace-stagiaires/tableau-de-bord" 
          element={
            <ProtectedRoute>
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/espace-stagiaires/ressources" 
          element={
            <ProtectedRoute>
              <StudentResources />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/learners/:id" element={<Admin />} />
        <Route path="/admin/companies/:id" element={<Admin />} />
        <Route path="/admin/trainers/:id" element={<Admin />} />
        
        {/* Public Trainer Profile */}
        <Route path="/formateur/:id" element={<TrainerProfile />} />
        
        {/* Redirect all other routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieConsent />
    </div>
  );
}

export default App;