"use client";

import { useState, useEffect, useRef } from 'react';

interface SelfDestructProps {
  children: React.ReactNode;
  duration?: number; // Duration in milliseconds
  onDestruct?: () => void; // Callback when component is about to unmount
  className?: string;
}

/**
 * A component that automatically unmounts itself after a specified duration.
 * The timer continues even if the user switches tabs.
 * 
 * @param children - The content to render
 * @param duration - The time in milliseconds before the component unmounts (default: 60000ms = 1 minute)
 * @param onDestruct - Callback function to run just before unmounting
 * @param className - Additional CSS classes to apply to the wrapper
 */
export default function SelfDestruct({
  children,
  duration = 60000, // Default: 1 minute
  onDestruct,
  className = "",
}: SelfDestructProps) {
  const [isVisible, setIsVisible] = useState(true);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const [timeLeft, setTimeLeft] = useState<number>(duration);

  useEffect(() => {
    // Start the timer
    const startTimer = () => {
      startTimeRef.current = Date.now();
      
      // Use requestAnimationFrame for smooth countdown
      const updateTimer = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, duration - elapsed);
        
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          // Time's up, unmount the component
          if (onDestruct) {
            onDestruct();
          }
          setIsVisible(false);
        } else {
          // Continue the animation frame
          timerRef.current = requestAnimationFrame(updateTimer);
        }
      };
      
      timerRef.current = requestAnimationFrame(updateTimer);
    };
    
    startTimer();
    
    // Clean up function
    return () => {
      if (timerRef.current !== null) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [duration, onDestruct]);

  // Format time left as MM:SS
  const formatTimeLeft = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {children}
      <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-bl">
        {formatTimeLeft(timeLeft)}
      </div>
    </div>
  );
} 