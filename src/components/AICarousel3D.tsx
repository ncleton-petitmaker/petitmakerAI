import React, { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Hand } from 'lucide-react';

// Lazy load 3D components
const Scene = lazy(() => import('./Scene3D'));

export const AICarousel3D = () => {
  const [showHand, setShowHand] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHand(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section id="cube-section" className="min-h-screen flex flex-col justify-center bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-black to-black" />
      <div className="container mx-auto px-4 relative">
        <div className="flex flex-col items-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-black/80 blur-xl -z-10" />
            <h2 className="text-4xl font-bold glow relative z-10 flex items-center justify-center gap-4">
              Domaines d'application
              {showHand && (
                <motion.div 
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ 
                    x: [-10, 10, -10],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    times: [0, 0.5, 1],
                    ease: "easeInOut",
                  }}
                >
                  <Hand className="w-8 h-8 text-blue-400 transform -rotate-90" />
                </motion.div>
              )}
            </h2>
            <div className="relative z-10 mt-2">
              <p className="text-xl text-gray-300 max-w-3xl mx-auto backdrop-blur-sm py-2">
                Découvrez les différents domaines où l'IA peut transformer votre entreprise
              </p>
            </div>
          </div>
          
          <div className="w-full h-[600px]">
            <Suspense fallback={<div className="w-full h-full bg-gray-900 animate-pulse rounded-lg" />}>
              <Scene />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
};