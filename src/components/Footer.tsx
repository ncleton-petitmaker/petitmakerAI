import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import { VerificationBanner } from './VerificationBanner';

export const Footer = () => {
  return (
    <footer className="bg-black text-white relative" role="contentinfo" aria-label="Informations de contact et mentions légales">
      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/10 to-black" aria-hidden="true" />
      
      <div className="container mx-auto px-4 py-16 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Contact Information */}
          <div>
            <h3 className="text-xl font-semibold mb-6" id="contact-heading">Contact</h3>
            <ul className="space-y-4" aria-labelledby="contact-heading">
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-blue-400" aria-hidden="true" />
                <a 
                  href="tel:+33760177267" 
                  className="hover:text-blue-400 transition-colors"
                  aria-label="Appeler le 07 60 17 72 67"
                >
                  07 60 17 72 67
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-400" aria-hidden="true" />
                <a 
                  href="mailto:nicolas.cleton@petitmaker.fr" 
                  className="hover:text-blue-400 transition-colors"
                  aria-label="Envoyer un email à nicolas.cleton@petitmaker.fr"
                >
                  nicolas.cleton@petitmaker.fr
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-400 shrink-0 mt-1" aria-hidden="true" />
                <address className="not-italic" aria-label="Adresse postale">
                  2 rue Héraclès<br />
                  59650 Villeneuve-d'Ascq<br />
                  France
                </address>
              </li>
            </ul>
          </div>

          {/* Certification Qualiopi */}
          <div className="lg:col-span-3">
            <h3 className="text-xl font-semibold mb-6" id="certification-heading">Certification Qualiopi</h3>
            <div className="flex flex-col md:flex-row items-start gap-8" aria-labelledby="certification-heading">
              <div className="w-48">
                <img
                  src="https://efgirjtbuzljtzpuwsue.supabase.co/storage/v1/object/public/Images//logo%20qualiopi%20.png"
                  alt="Logo de certification Qualiopi"
                  className="w-full"
                />
              </div>
              <div className="text-sm text-gray-300">
                <p className="mb-4">
                  PETITMAKER est certifié Qualiopi au titre de la catégorie d'action suivante : 
                  actions de formation (L.6313-1 - 1°).
                </p>
                <p className="mb-4">
                  <span className="sr-only">Détails de la certification :</span>
                  Certificat n° : FRCM12345<br />
                  Date d'obtention : 01/01/2025<br />
                  Validité : 3 ans
                </p>
                <p>
                  La certification qualité a été délivrée au titre de la catégorie 
                  d'action suivante : ACTIONS DE FORMATION
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
          <div className="flex flex-wrap justify-center gap-8 mb-4">
            <Link 
              to="/mentions-legales"
              className="hover:text-blue-400 transition-colors"
              aria-label="Accéder aux mentions légales"
            >
              Mentions légales
            </Link>
            <Link 
              to="/politique-de-confidentialite"
              className="hover:text-blue-400 transition-colors"
              aria-label="Accéder à la politique de confidentialité"
            >
              Politique de confidentialité
            </Link>
            <Link 
              to="/cgu"
              className="hover:text-blue-400 transition-colors"
              aria-label="Accéder aux conditions d'utilisation"
            >
              Conditions d'utilisation
            </Link>
          </div>
          <p>© {new Date().getFullYear()} PETITMAKER. Tous droits réservés.</p>
        </div>
      </div>
      <VerificationBanner />
    </footer>
  );
};