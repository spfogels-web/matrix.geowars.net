'use client';
import { useEffect, useState } from 'react';

/**
 * Returns true when the viewport width is below `breakpoint` pixels.
 * Initialises to false on the server (SSR-safe) and corrects on first paint.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isMobile;
}
