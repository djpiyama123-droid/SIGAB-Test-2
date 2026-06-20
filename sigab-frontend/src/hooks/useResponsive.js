import { useState, useEffect } from 'react';

const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920,
  '4xl': 2560,
  '5xl': 3840,
};

export function useResponsive() {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAtLeast = (bp) => windowWidth >= (breakpoints[bp] || 0);

  const device = {
    isMobile: !isAtLeast('md'),
    isTablet: isAtLeast('md') && !isAtLeast('xl'),
    isDesktop: isAtLeast('xl') && !isAtLeast('3xl'),
    isWorkstation: isAtLeast('3xl') && !isAtLeast('5xl'), // 24" - 27"
    isControlRoom: isAtLeast('5xl'), // 55" 4K
    width: windowWidth,
  };

  return device;
}
