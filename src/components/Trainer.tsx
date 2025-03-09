import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Linkedin, GraduationCap, Brain, Rocket } from 'lucide-react';
import { CTAButton } from './CTAButton';

const achievements = [
  {
    icon: GraduationCap,
    title: "Expert en IA",
    description: "Spécialisé dans l'intégration de l'IA en entreprise"
  },
  {
    icon: Brain,
    title: "Pédagogue",
    description: "Approche pragmatique et adaptée à chaque participant"
  },
  {
    icon: Rocket,
    title: "Innovateur",
    description: "À la pointe des dernières avancées en IA générative"
  }
];

export const Trainer = () => {
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
          <h2 className="text-4xl font-bold mb-6 glow">Votre formateur</h2>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center space-y-6"
            >
              <div className="relative w-64">
                <div className="relative overflow-hidden rounded-2xl">
                  <img
                    src="https://efgirjtbuzljtzpuwsue.supabase.co/storage/v1/object/public/Images//Nicolas-Cleton.avif"
                    alt="Nicolas Cléton"
                    className="w-full h-64 object-cover object-center transform transition-transform duration-500 hover:scale-105"
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-4 items-center max-w-sm">
                <a
                  href="https://www.linkedin.com/in/nicolas-cl%C3%A9ton-%F0%9F%95%B0%EF%B8%8F-87a199142/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-blue-600 px-6 py-3 rounded-xl transform transition-all duration-300 hover:scale-105 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25 w-full"
                >
                  <Linkedin className="w-5 h-5" />
                  <span className="font-semibold">Me suivre sur LinkedIn</span>
                </a>
                <CTAButton className="w-full" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3 }}
              className="space-y-8"
            >
              <div className="text-center lg:text-left">
                <h3 className="text-3xl font-bold mb-4">Nicolas Cléton</h3>
                <p className="text-xl text-gray-300 mb-6">
                  Expert en Intelligence Artificielle et formateur passionné, je vous accompagne dans la maîtrise des outils d'IA générative pour transformer votre entreprise.
                </p>
              </div>

              <div className="grid gap-6">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-start gap-4 bg-blue-900/20 p-4 rounded-xl border border-blue-900/30"
                  >
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <achievement.icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">{achievement.title}</h4>
                      <p className="text-gray-300">{achievement.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};