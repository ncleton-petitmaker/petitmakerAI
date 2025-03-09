import React from 'react';
import { motion } from 'framer-motion';

// SVG icons for social platforms
const LinkedInIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const shareButtons = [
  {
    name: 'LinkedIn',
    icon: LinkedInIcon,
    shareUrl: () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent('Formation IA en présentiel - PETITMAKER')}`,
    color: 'bg-[#0077b5]'
  },
  {
    name: 'Twitter',
    icon: TwitterIcon,
    shareUrl: () => `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('Formation IA en présentiel pour PME - PETITMAKER')}`,
    color: 'bg-[#1DA1F2]'
  },
  {
    name: 'Facebook',
    icon: FacebookIcon,
    shareUrl: () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
    color: 'bg-[#1877f2]'
  }
];

export const SocialShare = () => {
  return (
    <div className="fixed right-4 top-20 z-50 space-y-2">
      {shareButtons.map((button, index) => (
        <motion.a
          key={button.name}
          href={button.shareUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center w-10 h-10 rounded-full ${button.color} text-white shadow-lg transform transition-transform hover:scale-110`}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={(e) => {
            e.preventDefault();
            window.open(button.shareUrl(), 'share', 'width=600,height=400');
          }}
          aria-label={`Partager sur ${button.name}`}
        >
          <button.icon />
        </motion.a>
      ))}
    </div>
  );
};