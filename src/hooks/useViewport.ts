import { useState, useEffect } from 'react';

// Tailwind breakpoints (in pixels)
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Custom hook that tracks the current viewport size using Tailwind's breakpoints
 * and logs it to the console when it changes.
 * 
 * @returns The current breakpoint name
 */
export function useViewport(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('xs');

  useEffect(() => {
    // Function to determine the current breakpoint
    const getBreakpoint = (): Breakpoint => {
      const width = window.innerWidth;
      
      if (width >= BREAKPOINTS['2xl']) return '2xl';
      if (width >= BREAKPOINTS.xl) return 'xl';
      if (width >= BREAKPOINTS.lg) return 'lg';
      if (width >= BREAKPOINTS.md) return 'md';
      if (width >= BREAKPOINTS.sm) return 'sm';
      return 'xs';
    };

    // Function to handle window resize
    const handleResize = () => {
      const newBreakpoint = getBreakpoint();
      
      // Only update and log if the breakpoint has changed
      if (newBreakpoint !== breakpoint) {
        setBreakpoint(newBreakpoint);
        console.log(`Viewport changed: ${newBreakpoint} (${window.innerWidth}px)`);
      }
    };

    // Set initial breakpoint
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [breakpoint]);

  return breakpoint;
} 