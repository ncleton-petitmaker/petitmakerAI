import React from 'react';
import { Hero } from '../components/Hero';
import { Objectives } from '../components/Objectives';
import { Program } from '../components/Program';
import { QualiInfo } from '../components/QualiInfo';
import { Trainer } from '../components/Trainer';
import { PerformanceIndicators } from '../components/PerformanceIndicators';
import { Footer } from '../components/Footer';
import { ImageCarousel } from '../components/ImageCarousel';

export const Home = () => {
  return (
    <>
      <Hero />
      <ImageCarousel />
      <Objectives />
      <Program />
      <Trainer />
      <QualiInfo />
      <PerformanceIndicators />
      <Footer />
    </>
  );
};