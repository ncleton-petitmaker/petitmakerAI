import React, { useEffect, useRef, useState } from 'react';

const LinkedInFeed = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      const script = document.createElement('script');
      script.src = 'https://widgets.sociablekit.com/linkedin-profile-posts/widget.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [isVisible]);

  return (
    <div ref={containerRef} className="w-full h-[800px] rounded-xl border border-gray-800">
      {isVisible ? (
        <iframe 
          src='https://widgets.sociablekit.com/linkedin-profile-posts/iframe/25526853'
          className="w-full h-full"
          title="Publications LinkedIn PETITMAKER"
          loading="lazy"
          importance="low"
        />
      ) : (
        <div className="w-full h-full bg-gray-900 animate-pulse rounded-xl" />
      )}
    </div>
  );
};

export default LinkedInFeed;