import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '../components/Footer';

export const LegalNotices = () => {
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

        <h1 className="text-4xl font-bold mb-8">Mentions légales</h1>

        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Informations légales</h2>
            <p>
              Le site petitmaker.fr est édité par la société PETITMAKER, SAS au capital de 1000€,
              immatriculée au Registre du Commerce et des Sociétés sous le numéro SIREN 928 386 044
              (SIRET : 928 386 044 00012), dont le siège social est situé au 2 rue Héraclès, 59650 Villeneuve-d'Ascq.
            </p>
            <p>
              N° de TVA intracommunautaire : FR54 928 386 044<br />
              Code NAF/APE : 62.01Z - Programmation informatique<br />
              Date de création : 30/04/2024
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Directeur de la publication</h2>
            <p>
              Le directeur de la publication est Nicolas Cléton, en sa qualité de Président de PETITMAKER.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Hébergement</h2>
            <p>
              Le site est hébergé par Netlify, Inc.<br />
              44 Montgomery Street, Suite 300<br />
              San Francisco, California 94104<br />
              États-Unis
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Propriété intellectuelle</h2>
            <p>
              L'ensemble du contenu de ce site (textes, images, vidéos, etc.) est protégé par le droit
              d'auteur. Toute reproduction ou représentation, totale ou partielle, par quelque procédé
              que ce soit, sans l'autorisation expresse de PETITMAKER est interdite et constituerait
              une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété
              intellectuelle.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Données personnelles</h2>
            <p>
              Les informations concernant la collecte et le traitement des données personnelles sont
              détaillées dans notre{' '}
              <Link to="/politique-de-confidentialite" className="text-blue-400 hover:text-blue-300">
                Politique de confidentialité
              </Link>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Cookies</h2>
            <p>
              Le site utilise des cookies pour améliorer l'expérience utilisateur. Pour en savoir plus,
              consultez notre{' '}
              <Link to="/politique-de-confidentialite#cookies" className="text-blue-400 hover:text-blue-300">
                Politique de cookies
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Contact</h2>
            <p>
              Pour toute question concernant ces mentions légales, vous pouvez nous contacter :<br />
              Email : nicolas.cleton@petitmaker.fr<br />
              Téléphone : 07 60 17 72 67<br />
              Adresse : 2 rue Héraclès, 59650 Villeneuve-d'Ascq
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};