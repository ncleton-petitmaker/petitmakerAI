import React, { lazy, Suspense } from 'react';
import { motion, useSpring } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  Trophy,
  Target,
  Star,
  MessageSquareQuote
} from 'lucide-react';

// Lazy load LinkedIn feed
const LinkedInFeed = lazy(() => import('./LinkedInFeed'));

const performanceData = {
  successRates: [
    { label: "Taux de réussite global", value: "98%" },
    { label: "Taux de satisfaction", value: "96%" },
    { label: "Taux de recommandation", value: "95%" }
  ],
  performanceLevels: [
    { label: "Objectifs atteints", value: "92%" },
    { label: "Mise en pratique effective", value: "89%" },
    { label: "Progression des compétences", value: "87%" }
  ],
  results: [
    "85% des participants utilisent l'IA quotidiennement après la formation",
    "76% ont développé de nouveaux processus IA dans leur entreprise",
    "69% ont formé leurs collègues aux outils IA"
  ],
  testimonials: [
    {
      text: "Une formation qui a transformé notre approche de l'IA. Nous l'utilisons maintenant quotidiennement avec confiance.",
      author: "Marie D., Directrice Marketing",
      company: "PME Tech"
    },
    {
      text: "Excellente pédagogie, des cas pratiques pertinents et un suivi de qualité. Je recommande vivement.",
      author: "Thomas L., Responsable RH",
      company: "Industries Connect"
    },
    {
      text: "Formation sur-mesure qui répond parfaitement aux besoins de notre entreprise. Un vrai plus pour notre productivité.",
      author: "Sophie M., CEO",
      company: "Digital Solutions"
    }
  ]
};

const StatCard = ({ icon: Icon, title, items }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="bg-gradient-to-br from-blue-900/20 to-black p-6 rounded-xl border border-blue-900/30"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-500/10 rounded-lg">
          <Icon className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-4">{title}</h3>
          {Array.isArray(items) ? (
            <ul className="space-y-3">
              {items.map((item, index) => (
                <li key={index} className="flex items-baseline gap-2">
                  {item.value ? (
                    <>
                      <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={inView ? { opacity: 1, scale: 1 } : {}}
                        transition={{ delay: index * 0.1 + 0.3 }}
                        className="text-2xl font-bold text-blue-400"
                      >
                        {item.value}
                      </motion.span>
                      <span className="text-gray-300">{item.label}</span>
                    </>
                  ) : (
                    <span className="text-gray-300">{item}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-300">{items}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const Testimonial = ({ testimonial, index }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.2, duration: 0.6 }}
      className="bg-gradient-to-br from-blue-900/10 to-black p-6 rounded-xl border border-blue-900/30"
    >
      <div className="flex gap-4">
        <MessageSquareQuote className="w-8 h-8 text-blue-400 shrink-0" />
        <div>
          <p className="text-gray-300 mb-4 italic">"{testimonial.text}"</p>
          <div>
            <p className="font-semibold">{testimonial.author}</p>
            <p className="text-sm text-gray-400">{testimonial.company}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const PerformanceIndicators = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section className="py-20 bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-900/10 to-black" />
      
      <div className="container mx-auto px-4 relative">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-6 glow">Indicateurs de performance</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Des résultats concrets et mesurables pour votre transformation numérique
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <StatCard
            icon={Trophy}
            title="Taux de réussite"
            items={performanceData.successRates}
          />
          <StatCard
            icon={Target}
            title="Niveaux de performance"
            items={performanceData.performanceLevels}
          />
        </div>

        <div className="mb-12">
          <StatCard
            icon={Star}
            title="Résultats obtenus"
            items={performanceData.results}
          />
        </div>

        <h3 className="text-2xl font-semibold text-center mb-8">Témoignages clients</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {performanceData.testimonials.map((testimonial, index) => (
            <Testimonial key={index} testimonial={testimonial} index={index} />
          ))}
        </div>

        <motion.div
          id="resources"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-20 scroll-mt-20"
        >
          <h3 className="text-2xl font-semibold text-center mb-8">Actualités et ressources</h3>
          <div className="aspect-[16/9] w-full max-w-5xl mx-auto">
            <Suspense fallback={<div className="w-full h-[800px] bg-gray-900 rounded-xl animate-pulse" />}>
              <LinkedInFeed />
            </Suspense>
          </div>
        </motion.div>
      </div>
    </section>
  );
};