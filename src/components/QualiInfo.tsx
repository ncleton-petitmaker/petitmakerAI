import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  Clock, 
  GraduationCap, 
  Calendar,
  Euro,
  BookOpen,
  ClipboardCheck,
  Users,
  CheckCircle2,
  MapPin,
  Wallet
} from 'lucide-react';

const infoSections = [
  {
    icon: Users,
    title: "Format sur mesure",
    content: [
      "Présentation collective par groupe ou conférence",
      "+ 1/2 journée par collaborateur pour personnalisation",
      "Adaptation à chaque profil : Management, RH, Marketing, Commerce, etc.",
      "Accompagnement pratique sur vos cas d'usage"
    ]
  },
  {
    icon: Clock,
    title: "Organisation flexible",
    content: [
      "Formation sur site en entreprise",
      "Planning adapté à vos contraintes",
      "Sessions réparties sur plusieurs jours ou semaines",
    ]
  },
  {
    icon: MapPin,
    title: "Mobilité",
    content: [
      "Hauts-de-France : déplacement gratuit",
      "Île-de-France : gratuit dès 2 jours de devis",
      "Autres régions : gratuit dès 1 semaine de devis"
    ]
  },
  {
    icon: GraduationCap,
    title: "Pour tous les métiers",
    content: [
      "Direction et Management",
      "RH et Administration",
      "Marketing et Commercial",
      "R&D et Développement",
      "Comptabilité et Finance"
    ]
  },
  {
    icon: Euro,
    title: "Tarifs",
    content: [
      "1 200€ HT par jour",
      "Devis personnalisé selon effectif",
      "Tarif groupe sur demande"
    ]
  },
  {
    icon: Wallet,
    title: "Financement",
    content: [
      "Éligible au financement OPCO",
      "Formation certifiante CPF",
      "Accompagnement dans vos démarches de financement",
      "Facilités de paiement possibles"
    ]
  },
  {
    icon: BookOpen,
    title: "Méthodes pédagogiques",
    content: [
      "Immersion dans votre contexte métier",
      "Cas pratiques sur vos outils",
      "Ateliers personnalisés",
      "Support de formation adapté"
    ]
  },
  {
    icon: ClipboardCheck,
    title: "Évaluation et suivi",
    content: [
      "Audit initial des besoins",
      "Évaluation continue personnalisée",
      "Plan d'action individuel",
      "Suivi post-formation à 1 mois"
    ]
  },
  {
    icon: CheckCircle2,
    title: "Accessibilité",
    content: [
      "Formation accessible aux personnes en situation de handicap",
      "Adaptation possible sur demande",
      "Référent handicap dédié"
    ]
  }
];

const InfoCard = ({ section, index }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.1 }}
      className="bg-gradient-to-br from-blue-900/20 to-black p-6 rounded-xl border border-blue-900/30"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-500/10 rounded-lg shrink-0">
          <section.icon className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-3 text-white">{section.title}</h3>
          <ul className="space-y-2">
            {section.content.map((item, i) => (
              <li key={i} className="text-gray-300 flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

export const QualiInfo = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section className="py-20 bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-black to-black" />
      
      <div className="container mx-auto px-4 relative">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-6 glow">Formation sur mesure en entreprise</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Une approche personnalisée pour chaque collaborateur, directement dans vos locaux
          </p>
        </motion.div>

        <div className="mb-16 flex justify-center">
          <div className="w-64 md:w-96">
            <img
              src="https://efgirjtbuzljtzpuwsue.supabase.co/storage/v1/object/public/Images//Formation%20sur%20mesure.avif"
              alt="Formation sur mesure en entreprise"
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {infoSections.map((section, index) => (
            <InfoCard key={index} section={section} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};