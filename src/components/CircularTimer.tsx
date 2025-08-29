
import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CircularTimerProps {
  duration: number; // in seconds
  onTimeUp: () => void;
  isActive: boolean;
  key?: string | number; // Add key prop to force reset
}

const CircularTimer: React.FC<CircularTimerProps> = ({
  duration,
  onTimeUp,
  isActive
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isWarning, setIsWarning] = useState(false);

  // Reset timer when duration changes or component remounts
  useEffect(() => {
    setTimeLeft(duration);
    setIsWarning(false);
  }, [duration]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        
        // Warning when 5 seconds or less
        if (newTime <= 5 && newTime > 0) {
          setIsWarning(true);
        }
        
        if (newTime <= 0) {
          onTimeUp();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onTimeUp]);

  const progress = (timeLeft / duration) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="relative w-24 h-24">
        <svg
          className="w-24 h-24 transform -rotate-90"
          viewBox="0 0 100 100"
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="hsl(var(--quiz-timer-bg))"
            strokeWidth="6"
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={isWarning ? "hsl(var(--quiz-warning))" : "hsl(var(--quiz-timer))"}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        
        {/* Timer icon and text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Clock 
            size={16} 
            className={`mb-1 ${isWarning ? 'text-quiz-warning animate-pulse-gentle' : 'timer-circle'}`}
          />
          <span 
            className={`text-lg font-semibold ${
              isWarning ? 'text-quiz-warning' : 'text-quiz-timer'
            }`}
          >
            {timeLeft}
          </span>
        </div>
      </div>
      
      <div className="text-sm text-muted-foreground">
        {isWarning ? 'Time running out!' : 'Time remaining'}
      </div>
    </div>
  );
};

export default CircularTimer;
