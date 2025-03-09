import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Lazy load Google Analytics
const loadGA = () => {
  if (typeof window.gtag === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-S0LXTY8JKB';
    script.async = true;
    document.head.appendChild(script);
  }
};

// Load GA after initial render
window.requestIdleCallback?.(loadGA) || setTimeout(loadGA, 1000);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);