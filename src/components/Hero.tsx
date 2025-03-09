import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Logo } from './Logo';
import { CTAButton } from './CTAButton';

export const Hero = () => {
  const { scrollY } = useScroll();
  
  const springConfig = {
    stiffness: 100,
    damping: 30,
    mass: 1
  };
  
  const titleY = useSpring(
    useTransform(scrollY, [0, 800], [0, 150]),
    springConfig
  );
  
  const titleScale = useSpring(
    useTransform(scrollY, [0, 800], [1, 0.9]),
    springConfig
  );
  
  const logoY = useSpring(
    useTransform(scrollY, [0, 800], [0, 80]),
    springConfig
  );
  
  const opacity = useSpring(
    useTransform(scrollY, [0, 400], [1, 0]),
    springConfig
  );

  const backgroundY = useSpring(
    useTransform(scrollY, [0, 800], [0, -50]),
    { ...springConfig, stiffness: 50 }
  );

  return (
    <section className="h-screen relative overflow-hidden bg-black scroll-section">
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-black/50"
        style={{ y: backgroundY }}
      />
      
      <motion.div
        style={{ opacity }}
        className="container mx-auto px-4 h-full flex flex-col items-center justify-center text-center parallax-container"
      >
        <div className="space-y-4">
          <motion.h1
            className="text-4xl md:text-6xl font-light glow parallax-element"
            style={{ y: titleY, scale: titleScale }}
          >
            Formation IA générative en présentiel
          </motion.h1>
          <motion.h2
            className="text-2xl md:text-4xl font-medium text-gray-200 parallax-element"
            style={{ y: titleY, scale: titleScale }}
          >
            Dans les locaux des petites et moyennes entreprises
          </motion.h2>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.8,
            ease: [0.4, 0, 0.2, 1],
            delay: 0.3
          }}
          className="mt-12 mb-12 parallax-element"
        >
          <CTAButton />
        </motion.div>

        <motion.div 
          style={{ y: logoY }}
          className="parallax-element"
        >
          <Logo />
        </motion.div>
      </motion.div>

      <motion.div 
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
        style={{ opacity }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
      >
        <motion.div
          animate={{ 
            y: [0, -8, 0],
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-6 h-10 border-2 border-white rounded-full flex justify-center"
        >
          <div className="w-1 h-3 bg-white rounded-full mt-2" />
        </motion.div>
      </motion.div>
    </section>
  );
};