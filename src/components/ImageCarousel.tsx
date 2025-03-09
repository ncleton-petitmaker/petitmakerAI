import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Hammer from 'hammerjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const originalImages = [
  {
    url: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800&auto=format&fit=crop&q=80",
    title: "Aide à la rédaction",
    description: "Rédaction assistée par IA"
  },
  {
    url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80",
    title: "Aide à la décision",
    description: "Analyse et recommandations"
  },
  {
    url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80",
    title: "Apprentissage",
    description: "Formation personnalisée"
  },
  {
    url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80",
    title: "Synthèse",
    description: "Analyse et résumés de documents"
  },
  {
    url: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&auto=format&fit=crop&q=80",
    title: "Veille stratégique",
    description: "Surveillance du marché"
  },
  {
    url: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&auto=format&fit=crop&q=80",
    title: "Service client",
    description: "Support 24/7"
  },
  {
    url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80",
    title: "Trouver des clients",
    description: "Prospection et lead generation"
  },
  {
    url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
    title: "Création de contenu",
    description: "Génération de textes, images et vidéos"
  },
  {
    url: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&auto=format&fit=crop&q=80",
    title: "Création de site internet",
    description: "Sites web intelligents et adaptatifs"
  },
  {
    url: "https://images.unsplash.com/photo-1537432376769-00f5c2f4c8d2?w=800&auto=format&fit=crop&q=80",
    title: "Création d'outils métier",
    description: "Applications sur mesure avec IA intégrée"
  },
  {
    url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=80",
    title: "Support RH",
    description: "Recrutement et gestion des talents"
  }
];

const etBienPlus = {
  url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
  title: "Et bien plus...",
  description: "Découvrez toutes les possibilités de l'IA"
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const ImageCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  
  // Shuffle all images except "Et bien plus..." and then append it at the end
  const [images] = useState(() => [...shuffleArray(originalImages), etBienPlus]);

  useEffect(() => {
    if (!containerRef.current) return;

    const hammer = new Hammer(containerRef.current);
    let startX = 0;
    let currentTranslateX = 0;
    const sensitivity = 0.5;

    hammer.on('panstart', () => {
      setIsDragging(true);
      if (carouselRef.current) {
        const transform = window.getComputedStyle(carouselRef.current).transform;
        const matrix = new DOMMatrix(transform);
        startX = matrix.m41;
      }
    });

    hammer.on('panmove', (e) => {
      if (carouselRef.current && isDragging) {
        const moveX = e.deltaX * sensitivity;
        currentTranslateX = startX + moveX;
        carouselRef.current.style.transform = `translateX(${currentTranslateX}px)`;
      }
    });

    hammer.on('panend', (e) => {
      setIsDragging(false);
      if (carouselRef.current) {
        const cardWidth = carouselRef.current.children[0].getBoundingClientRect().width;
        const velocity = Math.abs(e.velocityX);
        const direction = e.deltaX < 0 ? 1 : -1;
        
        let newIndex = currentIndex;
        
        if (velocity > 0.5 || Math.abs(e.deltaX) > cardWidth / 3) {
          newIndex = Math.max(0, Math.min(images.length - 1, currentIndex + direction));
        }
        
        gsap.to(carouselRef.current, {
          x: -newIndex * cardWidth,
          duration: 0.3,
          ease: "power2.out"
        });
        
        setCurrentIndex(newIndex);
      }
    });

    return () => {
      hammer.destroy();
    };
  }, [currentIndex, isDragging, images.length]);

  const handleDotClick = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.children[0].getBoundingClientRect().width;
      gsap.to(carouselRef.current, {
        x: -index * cardWidth,
        duration: 0.3,
        ease: "power2.out"
      });
      setCurrentIndex(index);
    }
  };

  const handleArrowClick = (direction: 'prev' | 'next') => {
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.children[0].getBoundingClientRect().width;
      const newIndex = direction === 'prev' 
        ? Math.max(0, currentIndex - 1)
        : Math.min(images.length - 1, currentIndex + 1);
      
      gsap.to(carouselRef.current, {
        x: -newIndex * cardWidth,
        duration: 0.3,
        ease: "power2.out"
      });
      setCurrentIndex(newIndex);
    }
  };

  return (
    <section className="py-20 bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-black to-black" />
      
      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6 glow">Domaines d'application</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Découvrez les différents domaines où l'IA peut transformer votre entreprise
          </p>
        </div>

        <div className="relative">
          <div 
            ref={containerRef}
            className="overflow-hidden carousel-container"
          >
            <motion.div
              ref={carouselRef}
              className="flex"
              style={{ touchAction: 'pan-y pinch-zoom' }}
            >
              {images.map((image, index) => (
                <div
                  key={index}
                  className="w-full md:w-2/3 lg:w-1/2 flex-shrink-0 px-4"
                >
                  <div className="relative h-[400px] rounded-2xl overflow-hidden carousel-card">
                    <img
                      src={image.url}
                      alt={image.title}
                      className="w-full h-full object-cover carousel-image"
                    />
                    <div className="absolute inset-0 carousel-gradient" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 carousel-content">
                      <h3 className="text-2xl font-bold mb-2">{image.title}</h3>
                      <p className="text-gray-200">{image.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          <button
            onClick={() => handleArrowClick('prev')}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full backdrop-blur-sm text-white hover:bg-black/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentIndex === 0}
            aria-label="Image précédente"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={() => handleArrowClick('next')}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full backdrop-blur-sm text-white hover:bg-black/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentIndex === images.length - 1}
            aria-label="Image suivante"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="flex justify-center gap-2 mt-6">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentIndex ? 'bg-blue-500' : 'bg-gray-600'
              }`}
              aria-label={`Aller à l'image ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div 
        className="relative mt-32 py-20 overflow-hidden"
      >
        <div className="absolute inset-0 opacity-30">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-blue-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <motion.div
          className="relative text-center px-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white glow">
            Grâce à l'IA,
          </h2>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-blue-400 mt-4 glow">
            les petites entreprises accomplissent l'impossible.
          </h2>
        </motion.div>

        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, transparent 0%, black 100%)",
            opacity: 0.7
          }}
        />
      </div>
    </section>
  );
};