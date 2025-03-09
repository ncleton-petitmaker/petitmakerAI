import React from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Brain, Lightbulb, Briefcase } from 'lucide-react';

const objectives = [
  {
    icon: Brain,
    title: "Comprendre les bases théoriques",
    description: "Appréhender l'IA générative et le fonctionnement des grands modèles de langage (LLM)"
  },
  {
    icon: Briefcase,
    title: "Appliquer en contexte professionnel",
    description: "Explorer des cas pratiques d'intégration de l'IA générative en entreprise"
  },
  {
    icon: Lightbulb,
    title: "Développer un apprentissage autonome",
    description: "Comprendre les enjeux économiques et culturels, savoir s'inspirer de ce qui fonctionne"
  }
];

const springConfig = {
  stiffness: 100,
  damping: 30,
  mass: 1
};

const ObjectiveCard = ({ objective, index, className = "" }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
    rootMargin: '-50px'
  });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useSpring(
    useTransform(scrollYProgress, [0, 1], [50, -50]),
    springConfig
  );

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ 
        duration: 0.8,
        delay: index * 0.2,
        ease: [0.4, 0, 0.2, 1]
      }}
      style={{ y }}
      className={`bg-gradient-to-br from-blue-900/30 to-black p-8 rounded-2xl border border-blue-900/30 backdrop-blur-sm parallax-element ${className}`}
    >
      <div className="flex items-start gap-4">
        <motion.div 
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.6,
            delay: index * 0.2 + 0.3,
            ease: [0.4, 0, 0.2, 1]
          }}
          className="p-3 bg-blue-500/10 rounded-lg"
        >
          <objective.icon className="w-8 h-8 text-blue-400" />
        </motion.div>
        <div>
          <motion.h3 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.6,
              delay: index * 0.2 + 0.4,
              ease: [0.4, 0, 0.2, 1]
            }}
            className="text-xl font-semibold mb-2 text-white"
          >
            {objective.title}
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.6,
              delay: index * 0.2 + 0.5,
              ease: [0.4, 0, 0.2, 1]
            }}
            className="text-gray-300 leading-relaxed"
          >
            {objective.description}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};

export const Objectives = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
    rootMargin: '-50px'
  });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const backgroundY = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -50]),
    { ...springConfig, stiffness: 50 }
  );

  return (
    <section className="py-20 bg-black relative overflow-hidden scroll-section">
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-black to-black"
        style={{ y: backgroundY }}
      />
      
      <div className="container mx-auto px-4 relative parallax-container">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ 
            duration: 0.8,
            ease: [0.4, 0, 0.2, 1]
          }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-6 glow">Objectifs</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Une formation complète pour maîtriser l'IA et son application en entreprise
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {objectives.slice(0, 2).map((objective, index) => (
            <ObjectiveCard key={index} objective={objective} index={index} />
          ))}
          <ObjectiveCard 
            objective={objectives[2]} 
            index={2} 
            className="md:col-span-2"
          />
        </div>
      </div>
    </section>
  );
};