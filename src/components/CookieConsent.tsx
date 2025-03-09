import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cookie, ChevronDown, ChevronUp } from 'lucide-react';
import { getConsentPreferences, setConsentPreferences, hasConsent, type ConsentPreferences } from '../lib/cookies';

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // Show banner if no consent has been given
    const timer = setTimeout(() => {
      if (!hasConsent()) {
        setShowBanner(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Configure Google Analytics based on consent
    if (window.gtag && preferences.analytics) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }
  }, [preferences.analytics]);

  const handleAcceptAll = () => {
    const allConsent: ConsentPreferences = {
      necessary: true,
      analytics: true,
      marketing: true
    };
    setConsentPreferences(allConsent);
    setShowBanner(false);

    // Enable Google Analytics
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }
  };

  const handleSavePreferences = () => {
    setConsentPreferences({
      ...preferences,
      necessary: true // Always required
    });
    setShowBanner(false);

    // Update Google Analytics consent
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: preferences.analytics ? 'granted' : 'denied'
      });
    }
  };

  if (!showBanner) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white shadow-lg"
      role="dialog"
      aria-labelledby="cookie-consent-title"
    >
      <div className="container mx-auto p-4">
        <div className="flex items-start justify-between gap-4">
          <Cookie className="w-6 h-6 text-blue-400 shrink-0 mt-1" aria-hidden="true" />
          <div className="flex-1">
            <h2 id="cookie-consent-title" className="text-xl font-semibold mb-2">
              Nous respectons votre vie privée
            </h2>
            <p className="text-gray-300 mb-4">
              Nous utilisons des cookies pour améliorer votre expérience sur notre site. 
              Certains cookies sont nécessaires au fonctionnement du site, tandis que d'autres 
              nous aident à comprendre comment vous l'utilisez.
            </p>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4"
              aria-expanded={showDetails}
              aria-controls="cookie-details"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                  Masquer les détails
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  Voir les détails
                </>
              )}
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  id="cookie-details"
                  className="overflow-hidden"
                >
                  <div className="space-y-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Cookies nécessaires</h3>
                        <p className="text-sm text-gray-400">
                          Requis pour le fonctionnement du site
                        </p>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={true}
                          disabled
                          className="opacity-50 cursor-not-allowed"
                          aria-label="Cookies nécessaires (toujours actifs)"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Google Analytics</h3>
                        <p className="text-sm text-gray-400">
                          Nous aide à comprendre comment le site est utilisé
                        </p>
                      </div>
                      <div>
                        <input
                          type="checkbox"
                          checked={preferences.analytics}
                          onChange={(e) => setPreferences(prev => ({
                            ...prev,
                            analytics: e.target.checked
                          }))}
                          className="cursor-pointer"
                          aria-label="Autoriser Google Analytics"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Cookies marketing</h3>
                        <p className="text-sm text-gray-400">
                          Utilisés pour la publicité ciblée
                        </p>
                      </div>
                      <div>
                        <input
                          type="checkbox"
                          checked={preferences.marketing}
                          onChange={(e) => setPreferences(prev => ({
                            ...prev,
                            marketing: e.target.checked
                          }))}
                          className="cursor-pointer"
                          aria-label="Autoriser les cookies marketing"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleAcceptAll}
                className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-lg font-semibold transition-colors"
                aria-label="Accepter tous les cookies"
              >
                Tout accepter
              </button>
              <button
                onClick={handleSavePreferences}
                className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-semibold transition-colors"
                aria-label="Enregistrer mes préférences de cookies"
              >
                Enregistrer mes préférences
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-gray-400 hover:text-white p-1"
            aria-label="Fermer la bannière de consentement des cookies"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};