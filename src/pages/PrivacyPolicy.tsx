import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '../components/Footer';

export const PrivacyPolicy = () => {
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

        <h1 className="text-4xl font-bold mb-8">Politique de confidentialité</h1>

        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              La présente politique de confidentialité décrit la manière dont PETITMAKER collecte,
              utilise et protège vos données personnelles lorsque vous utilisez notre site web et
              nos services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Données collectées</h2>
            <p>Nous collectons les types de données suivants :</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Données d'identification (nom, prénom)</li>
              <li>Coordonnées (email, téléphone, adresse)</li>
              <li>Données professionnelles (entreprise, fonction)</li>
              <li>Données de connexion et de navigation</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Utilisation des données</h2>
            <p>Vos données sont utilisées pour :</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Gérer votre inscription aux formations</li>
              <li>Vous envoyer des informations sur nos services</li>
              <li>Améliorer notre site et nos services</li>
              <li>Respecter nos obligations légales</li>
            </ul>
          </section>

          <section className="mb-8" id="cookies">
            <h2 className="text-2xl font-semibold mb-4">4. Politique de cookies</h2>
            <p>Notre site utilise trois types de cookies :</p>
            <ul className="list-disc pl-6 mb-4">
              <li>
                <strong>Cookies nécessaires :</strong> Requis pour le fonctionnement du site
              </li>
              <li>
                <strong>Cookies analytiques :</strong> Pour comprendre l'utilisation du site
              </li>
              <li>
                <strong>Cookies marketing :</strong> Pour la publicité personnalisée
              </li>
            </ul>
            <p>
              Vous pouvez gérer vos préférences concernant les cookies via notre
              bannière de consentement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Vos droits</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Droit d'accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit à l'effacement</li>
              <li>Droit à la limitation du traitement</li>
              <li>Droit à la portabilité</li>
              <li>Droit d'opposition</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures de sécurité appropriées pour protéger
              vos données contre tout accès, modification, divulgation ou destruction
              non autorisés.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Contact</h2>
            <p>
              Pour toute question concernant cette politique ou pour exercer vos droits,
              contactez notre Délégué à la Protection des Données :<br />
              Email : nicolas.cleton@petitmaker.fr<br />
              Adresse : 2 rue Héraclès, 59650 Villeneuve-d'Ascq
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};