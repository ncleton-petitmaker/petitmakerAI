import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  company: string;
  job_position: string;
}

export const StudentSpace = () => {
  const navigate = useNavigate();
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileData, setProfileData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    company: '',
    job_position: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [magicLinkEmail, setMagicLinkEmail] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, company, job_position')
            .eq('id', session.user.id)
            .maybeSingle();

          if (error) throw error;

          // Check if profile is incomplete (any required field is empty)
          if (!profile || !profile.first_name || !profile.last_name || !profile.company) {
            console.log('Profile incomplete, showing profile form');
            setShowProfileForm(true);
            if (profile) {
              setProfileData({
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                company: profile.company || '',
                job_position: profile.job_position || ''
              });
            }
          } else {
            console.log('Profile complete, redirecting to dashboard');
            navigate('/espace-stagiaires/tableau-de-bord');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setError('Une erreur est survenue lors de la vérification de la session.');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, company, job_position')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!error && (!profile || !profile.first_name || !profile.last_name || !profile.company)) {
          setShowProfileForm(true);
          if (profile) {
            setProfileData({
              first_name: profile.first_name || '',
              last_name: profile.last_name || '',
              company: profile.company || '',
              job_position: profile.job_position || ''
            });
          }
        } else {
          navigate('/espace-stagiaires/tableau-de-bord');
        }
      } else if (event === 'SIGNED_OUT') {
        setShowProfileForm(false);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Check if company exists
      const { data: existingCompany, error: companyError } = await supabase
        .from('companies')
        .select('id, name')
        .ilike('name', profileData.company)
        .maybeSingle();

      if (companyError) throw companyError;

      let companyId = existingCompany?.id;

      // If company doesn't exist, create it
      if (!existingCompany) {
        const { data: newCompany, error: createError } = await supabase
          .from('companies')
          .insert({
            name: profileData.company,
            status: 'active',
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (createError) throw createError;
        
        companyId = newCompany.id;
        
        // Create notification for new company
        await supabase
          .from('notifications')
          .insert({
            type: 'new_company',
            title: 'Nouvelle entreprise ajoutée',
            message: `L'entreprise "${profileData.company}" a été ajoutée. Veuillez compléter les informations.`,
            is_read: false,
            created_at: new Date().toISOString()
          });
      }

      // Update user profile
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          company: profileData.company,
          job_position: profileData.job_position,
          company_id: companyId,
          status: 'active',
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // If user signed in with Google, save their avatar URL
      if (user.app_metadata?.provider === 'google' && user.user_metadata?.avatar_url) {
        await supabase
          .from('user_profiles')
          .update({
            google_photo_url: user.user_metadata.avatar_url
          })
          .eq('id', user.id);
      }

      // Create notification for new learner
      await supabase
        .from('notifications')
        .insert({
          type: 'new_learner',
          title: 'Nouvel apprenant inscrit',
          message: `${profileData.first_name} ${profileData.last_name} de l'entreprise "${profileData.company}" s'est inscrit.`,
          is_read: false,
          created_at: new Date().toISOString()
        });

      console.log('Profile updated successfully, redirecting to dashboard');
      navigate('/espace-stagiaires/tableau-de-bord');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Une erreur est survenue lors de la mise à jour du profil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/espace-stagiaires/tableau-de-bord`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      
      if (error) throw error;
      if (!data.url) throw new Error('No redirect URL provided');

      window.location.href = data.url;
    } catch (error) {
      console.error('Error logging in with Google:', error);
      setError('Erreur lors de la connexion avec Google. Veuillez réessayer.');
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: magicLinkEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/espace-stagiaires/tableau-de-bord`,
          data: {
            redirect_to: '/espace-stagiaires/tableau-de-bord'
          }
        }
      });
      
      if (error) throw error;
      
      setEmailSent(true);
      setMagicLinkEmail('');
    } catch (error) {
      console.error('Error sending magic link:', error);
      setError('Erreur lors de l\'envoi du lien de connexion. Veuillez réessayer.');
      setShowPasswordLogin(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      if (error) {
        if (error.message === 'Email not confirmed') {
          setError('Votre email n\'a pas été confirmé. Veuillez vérifier votre boîte de réception ou demander un nouveau lien de confirmation.');
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email: loginData.email
          });
          if (resendError) throw resendError;
          return;
        }
        throw error;
      }

      navigate('/espace-stagiaires/tableau-de-bord');
    } catch (error) {
      console.error('Error logging in with password:', error);
      setError('Identifiants incorrects ou email non confirmé. Veuillez réessayer ou utiliser le lien magique.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmailSent(false);
    setMagicLinkEmail('');
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="container mx-auto px-4 py-12">
        <Link 
          to="/"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8"
          aria-label="Retour à l'accueil"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Retour à l'accueil
        </Link>

        {showProfileForm ? (
          <div className="max-w-md mx-auto bg-gray-900 rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Complétez votre profil</h2>
            {error && (
              <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
                <p className="text-red-200">{error}</p>
              </div>
            )}
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-300 mb-2">
                  Prénom
                </label>
                <input
                  type="text"
                  id="first_name"
                  required
                  value={profileData.first_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-300 mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  id="last_name"
                  required
                  value={profileData.last_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                  Entreprise
                </label>
                <input
                  type="text"
                  id="company"
                  required
                  value={profileData.company}
                  onChange={(e) => setProfileData(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="job_position" className="block text-sm font-medium text-gray-300 mb-2">
                  Fonction
                </label>
                <input
                  type="text"
                  id="job_position"
                  value={profileData.job_position}
                  onChange={(e) => setProfileData(prev => ({ ...prev, job_position: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Votre fonction dans l'entreprise"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Enregistrement...' : 'Continuer'}
              </button>
            </form>
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-gray-900 rounded-xl p-8 shadow-lg">
            <h1 className="text-3xl font-bold mb-6 text-center">Espace des stagiaires</h1>
            
            {error && (
              <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg text-center">
                <p className="text-red-200">{error}</p>
              </div>
            )}
            
            {emailSent ? (
              <div className="text-center">
                <div className="mb-6 p-4 bg-green-900/50 border border-green-500/50 rounded-lg">
                  <p className="text-green-200">
                    Un lien de connexion a été envoyé à votre adresse email. Veuillez vérifier votre boîte de réception.
                  </p>
                </div>
                <button
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Retour
                </button>
              </div>
            ) : showPasswordLogin ? (
              <div>
                <form onSubmit={handlePasswordLogin} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        required
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Connexion en cours...' : 'Se connecter'}
                  </button>
                </form>
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowPasswordLogin(false)}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Utiliser un lien magique
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full bg-white text-gray-900 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <img 
                    src="https://www.google.com/favicon.ico"
                    alt="Google"
                    className="w-5 h-5"
                  />
                  {isLoading ? 'Connexion en cours...' : 'Continuer avec Google'}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-900 text-gray-400">Ou</span>
                  </div>
                </div>

                <form onSubmit={handleEmailLogin} className="space-y-6">
                  <div>
                    <label htmlFor="magic-link-email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="magic-link-email"
                      required
                      value={magicLinkEmail}
                      onChange={(e) => setMagicLinkEmail(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Envoi en cours...' : 'Envoyer un lien de connexion'}
                  </button>
                </form>

                <div className="text-center">
                  <button
                    onClick={() => setShowPasswordLogin(true)}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Se connecter avec un mot de passe
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};