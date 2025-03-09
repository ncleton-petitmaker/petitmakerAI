import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '../components/Footer';

export const Resources = () => {
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-12">
        <Link 
          to="/"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8"
          aria-label="Retour à l'accueil"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Retour à l'accueil
        </Link>

        <h1 className="text-4xl font-bold mb-8">Ressources utiles</h1>
        
        <div className="aspect-[16/9] w-full max-w-6xl mx-auto mb-12">
          <iframe 
            src='https://widgets.sociablekit.com/linkedin-profile-posts/iframe/25526853'
            className="w-full h-[800px] rounded-xl border border-gray-800"
            title="Publications LinkedIn PETITMAKER"
          />
        </div>
      </div>
      <Footer />
    </div>
  );
};