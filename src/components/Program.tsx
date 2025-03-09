import React from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  Brain, 
  Bot, 
  Code2, 
  Settings2, 
  Zap,
  Building2,
  Shield,
  Telescope
} from 'lucide-react';
import { CTAButton } from './CTAButton';

const modules = [
  {
    icon: Brain,
    title: "Introduction à l'IA",
    description: "Impact et enjeux de la 4e Révolution Industrielle"
  },
  {
    icon: Bot,
    title: "IA Générative",
    description: "ML vs DL vs LLM, démonstration live"
  },
  {
    icon: Code2,
    title: "Spécificités des LLM",
    description: "Comprendre les modèles et leurs limites"
  },
  {
    icon: Settings2,
    title: "Techniques avancées",
    description: "Prompt Engineering, Fine-Tuning, RAG"
  },
  {
    icon: Zap,
    title: "Agents IA & Automatisation",
    description: "n8n, Relevance et intégrations"
  },
  {
    icon: Building2,
    title: "Cas pratiques",
    description: "Applications concrètes en entreprise"
  },
  {
    icon: Shield,
    title: "Enjeux éthiques",
    description: "Souveraineté numérique et responsabilité"
  },
  {
    icon: Telescope,
    title: "Tendances futures",
    description: "Évolutions et opportunités à venir"
  }
];

const springConfig = {
  stiffness: 50,
  damping: 15,
  mass: 0.8
};

const ModuleCard = ({ module, index }) => {
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
    useTransform(scrollYProgress, [0, 1], [15, -15]),
    springConfig
  );

  const cardVariants = {
    hidden: { 
      opacity: 0,
      y: 10,
      scale: 0.98
    },
    visible: { 
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 50,
        damping: 15,
        mass: 0.8,
        delay: index * 0.08
      }
    }
  };

  const iconVariants = {
    hidden: { 
      scale: 0.9,
      opacity: 0
    },
    visible: { 
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 50,
        damping: 15,
        delay: index * 0.08 + 0.1
      }
    }
  };

  const contentVariants = {
    hidden: { 
      opacity: 0,
      x: -5
    },
    visible: { 
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 50,
        damping: 15,
        delay: index * 0.08 + 0.15
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      variants={cardVariants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      style={{ y }}
      className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-xl border border-gray-800 transform-gpu transition-colors duration-300 hover:border-gray-700"
    >
      <motion.div
        variants={iconVariants}
        className="mb-4"
      >
        <module.icon className="w-12 h-12 text-blue-400" />
      </motion.div>
      <motion.div variants={contentVariants}>
        <h3 className="text-xl font-semibold mb-2">{module.title}</h3>
        <p className="text-gray-400">{module.description}</p>
      </motion.div>
    </motion.div>
  );
};

export const Program = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const backgroundY = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -25]),
    { ...springConfig, stiffness: 25 }
  );

  const titleVariants = {
    hidden: { 
      opacity: 0,
      y: 10
    },
    visible: { 
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 50,
        damping: 15,
        delay: 0.1
      }
    }
  };

  return (
    <section className="py-20 bg-black relative overflow-hidden" id="program">
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-black to-black"
        style={{ y: backgroundY }}
      />
      
      <div className="container mx-auto px-4 relative">
        <motion.div
          ref={ref}
          variants={titleVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold glow">Programme détaillé</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {modules.map((module, index) => (
            <ModuleCard key={index} module={module} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ 
            type: "spring",
            stiffness: 50,
            damping: 15,
            delay: 0.4
          }}
          className="flex justify-center"
        >
          <CTAButton />
        </motion.div>
      </div>
    </section>
  );
};