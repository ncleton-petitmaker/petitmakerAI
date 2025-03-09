import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { LoadingSpinner } from '../../components/LoadingSpinner';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("AdminLogin - Login form submitted");
    setError(null);
    setIsLoading(true);

    try {
      console.log("AdminLogin - Attempting login with:", email);
      
      // Check if user is nicolas.cleton@petitmaker.fr (admin)
      const isAdminEmail = email.toLowerCase() === 'nicolas.cleton@petitmaker.fr';
      console.log("AdminLogin - Is admin email:", isAdminEmail);
      
      // If not admin email, show error early
      if (!isAdminEmail) {
        console.log("AdminLogin - Non-admin email, access denied");
        throw new Error('Accès non autorisé. Vous n\'avez pas les privilèges d\'administrateur.');
      }
      
      console.log("AdminLogin - Calling supabase.auth.signInWithPassword");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log("AdminLogin - Sign in response:", data ? "Data exists" : "No data", error);

      if (error) {
        console.error("AdminLogin - Sign in error:", error);
        throw error;
      }

      if (!data.user) {
        console.log("AdminLogin - No user data returned from sign in");
        throw new Error('Aucune donnée utilisateur retournée lors de la connexion.');
      }
      
      console.log("AdminLogin - User authenticated successfully, calling onLoginSuccess");
      onLoginSuccess();
    } catch (error: any) {
      console.error('AdminLogin - Error logging in:', error);
      setError(error.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      console.log("AdminLogin - Login process completed, isLoading set to false");
      setIsLoading(false);
    }
  };

  console.log("AdminLogin - Rendering login form, isLoading:", isLoading);
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 text-gray-900">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Administration PETITMAKER</h1>
          <p className="text-gray-600 mt-2">Connectez-vous pour accéder au tableau de bord</p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="votre@email.com"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
                required
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
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              isLoading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="small" message="" />
                <span className="ml-2">Connexion en cours...</span>
              </div>
            ) : (
              "Se connecter"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};