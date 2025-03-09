import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '../components/Footer';

export const TermsOfUse = () => {
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

        <h1 className="text-4xl font-bold mb-8">Conditions d'utilisation</h1>

        <div className="prose prose-invert max-w-none">
          <h2 className="text-2xl font-semibold mb-4">CONDITIONS GÉNÉRALES DE VENTE</h2>

          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-4">PRÉAMBULE</h3>
            <p>
              L'organisme de formation « PETITMAKER », SIRET « 928 386 044 00012 », dont le siège social est situé au « 2 RUE HERACLES 59650 VILLENEUVE D ASCQ » organise et dispense des formations professionnelles. Son activité de dispensateur de formation est enregistrée auprès de la DIRECCTE des Hauts-de-France sous le n° « 32 59 13116 59 » ; cet enregistrement ne vaut pas agrément de l'état.
            </p>
            <p>
              La signature par le Client des présentes Conditions Générales de Vente (ci-après « CGV ») emporte leur acceptation pleine et entière. Les CGV prévalent sur tout autre document du Client, et notamment sur toutes conditions générales d'achat, sauf accord cadres ou accord commercial spécifique réalisé avec le client. Tous autres documents de « PETITMAKER » tels que prospectus, catalogues, n'ont qu'une valeur indicative. Le fait que « PETITMAKER » ne se prévale pas, à un moment donné, de l'une quelconque des présentes conditions, ne peut être interprété comme valant renonciation à s'en prévaloir ultérieurement.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-4">1 - INSCRIPTION</h3>
            <p>
              Vous disposez de la possibilité de vous inscrire par téléphone « 07 60 17 72 67 », par courrier électronique « nicolas.cleton@petitmaker.fr » ou par courrier postal à l'adresse suivante : « PETITMAKER » – « 2 RUE HERACLES 59650 VILLENEUVE D ASCQ ». Votre inscription sera prise en compte à réception de la convention ou contrat de formation professionnelle ainsi que de ces présentes CGV dûment signés et portant cachet commercial (si possible).
            </p>
            <p>
              Pour les formations à distance, il appartient au participant de s'assurer de la bonne configuration de son matériel informatique, avant la formation dans les délais impartis.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-4">2 - ANNULATION – REMPLACEMENT</h3>
            <p>
              Pour être prise en compte, toute annulation doit être communiquée par écrit.
            </p>
            <p>
              Les remplacements de participants sont admis à tout moment, sans frais, sous réserve d'en informer par écrit « PETITMAKER » et de lui transmettre les noms et coordonnées du ou des remplaçants au plus tard la veille de la formation.
            </p>
            <p>
              Vous disposez de la faculté d'annuler une inscription sans frais sous réserve d'en informer « PETITMAKER » par lettre recommandée avec accusé de réception ou par courriel avec accusé de réception à « nicolas.cleton@petitmaker.fr », reçu au plus tard quatorze [14] jours calendaires avant la date de la formation.
            </p>
            <p>
              En cas d'annulation reçue moins de quatorze [14] jours calendaires avant la date de la formation (ou du premier module pour un cycle ou une formation à distance), le montant de l'inscription reste du en totalité à « PETITMAKER ».
            </p>
            <p>
              Toute formation à laquelle le participant ne s'est pas présenté ou n'a assisté que partiellement est due en totalité.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-4">3 - TARIFS - PAIEMENT</h3>
            <p>
              Tous les tarifs sont indiqués hors taxes. Ils seront majorés des droits et taxes en vigueur.
            </p>
            <p>
              Nos tarifs comprennent la formation, la documentation pédagogique remise pendant la formation, les fichiers électroniques mis à disposition le cas échéant. Pour toutes questions concernant nos conditions tarifaires, n'hésitez pas à contacter notre service Clients au « 07 60 17 72 67 » ou par courrier électronique à « nicolas.cleton@petitmaker.fr ».
            </p>
            <p>
              Sauf accord particulier, un règlement intégral devra intervenir avant le début de la formation, comptant et sans escompte à réception de facture. En cas de paiement effectué par un OPCO, l'accord de financement par votre OPCO doit nous parvenir avant le 1er jour de la formation. Si « PETITMAKER » n'a pas réceptionné l'accord de financement, vous serez facturé de l'intégralité du coût de la formation. En cas de prise en charge partielle par l'OPCO, la part non prise en charge vous sera directement facturée.
            </p>
            <p>
              Toute facture non payée à échéance portera de plein droit, intérêt au taux d'intérêt appliqué par la Banque Centrale Européenne à son opération de refinancement la plus récente majoré de 10 (dix) points.
            </p>
            <p>
              À défaut de paiement d'une seule facture à son échéance, l'intégralité des sommes dues par le Client deviendra immédiatement exigible.
            </p>
            <p>
              Toute facture recouvrée par nos services contentieux sera majorée, à titre de clause pénale non réductible au sens de l'article 1231-5 du Code Civil, d'une indemnité fixée à 15 (quinze)% du montant des sommes exigibles.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-4">4 - RESPONSABILITÉ - INDEMNITÉS</h3>
            <p>
              L'employeur, ou selon le cas le participant, s'oblige à souscrire et maintenir en prévision et pendant la durée de la formation une assurance responsabilité civile couvrant les dommages corporels, matériels, immatériels, directs et indirects susceptibles d'être causés par ses agissements ou ceux de ses préposés au préjudice de « PETITMAKER » ou des participants. Il s'oblige également à souscrire et maintenir une assurance responsabilité civile désignant également comme assuré « PETITMAKER » pour tous les agissements préjudiciables aux tiers qui auraient été causés par son préposé, et, contenant une clause de renonciation à recours, de telle sorte que « PETITMAKER » ne puisse être recherchée ou inquiétée.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-4">5 - DROIT DE CONTRÔLE DE INSTITUT NATIONAL DE LA CONSOMMATION</h3>
            <p>
              « PETITMAKER » se réserve le droit, si le nombre de participants à une formation est jugé insuffisant sur le plan pédagogique, d'annuler cette formation au plus tard quatorze [14] jours calendaires avant la date prévue.
            </p>
            <p>
              « PETITMAKER » se réserve le droit de reporter la formation, de modifier le lieu de son déroulement, le contenu de son programme ou de remplacer un animateur, si des circonstances indépendantes de sa volonté l'y obligent.
            </p>
            <p>
              « PETITMAKER » se réserve le droit, sans indemnité de quelque nature que ce soit :
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>De refuser toute inscription ou accès à un Client qui ne serait pas à jour de ses paiements</li>
              <li>D'exclure tout participant qui aurait procédé à de fausses déclarations lors de l'inscription et ce, sans indemnité.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-4">6 - PROPRIÉTÉ INTELLECTUELLE</h3>
            <p>
              Dans le cadre du respect des droits de propriété intellectuelle attachés aux supports de cours ou autres ressources pédagogiques mis à la seule disposition des participants de la formation, le Client s'interdit de reproduire, directement ou indirectement, en totalité ou en partie, d'adapter, de modifier, de traduire, de représenter, de commercialiser ou de diffuser à des membres de son personnel non participants aux formations « PETITMAKER » ou à des tiers, les dits supports et ressources pédagogiques sans l'autorisation expresse, préalable et écrite de « PETITMAKER » ou de ses ayants droit.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-4">7 - INFORMATIQUE ET LIBERTÉS</h3>
            <p>
              « PETITMAKER » s'engage à ce que la collecte et le traitement de vos données personnelles, effectués à partir du site « URL du site internet », soient conformes à la loi n° 78-17 du 6 janvier 1978 modifiée, relative à l'informatique, aux fichiers et aux libertés (dite « Loi Informatique et Libertés ») et du Règlement (UE) n° 2016/679 du 27 avril 2016 dit « Règlement général sur la protection des données » (ou « RGDP »).
            </p>
            <p>
              Cette politique décrit la manière dont « PETITMAKER » s'engage à collecter, utiliser et protéger vos données personnelles.
            </p>
            <p>
              Vous pouvez exercer, conformément aux dispositions des articles 39, 40, 41, et 42 de la Loi 78-17 du 6 janvier 1978 modifiée, vos droits d'accès, de rectification et d'opposition en vous adressant à : « PETITMAKER » – « 2 RUE HERACLES 59650 VILLENEUVE D ASCQ » ou par téléphone « 07 60 17 72 67 ».
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-4">8 - LOI APPLICABLE - ATTRIBUTION DE COMPÉTENCE LE PRÉSENT ACCORD EST RÉGI PAR LE DROIT FRANÇAIS.</h3>
            <p>
              En cas de contestation sur l'interprétation ou l'exécution de l'une de ces dispositions, et à défaut d'un accord amiable des parties, le tribunal de commerce de rattachement du siège social de l'organisme de formation sera seul compétent.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};