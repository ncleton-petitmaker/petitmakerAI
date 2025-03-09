import React from 'react';
import { BookOpen } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const ResourcesButton = () => {
  const location = useLocation();

  // Don't show the button on admin pages or student pages
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/espace-stagiaires')) {
    return null;
  }

  return (
    <Link
      to="/espace-stagiaires"
      className="fixed top-4 right-4 z-50 inline-flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg text-white hover:bg-black/70 transition-colors duration-300 border border-white/10"
      aria-label="Accéder à l'espace des stagiaires"
    >
      <BookOpen className="w-4 h-4" />
      <span className="text-sm font-medium">L'espace des stagiaires</span>
    </Link>
  );
};