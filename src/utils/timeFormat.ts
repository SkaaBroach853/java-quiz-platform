
// Utility function to format time in seconds to human-readable format
export const formatTime = (totalSeconds: number): string => {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

// Convert minutes to seconds for consistent time handling
export const minutesToSeconds = (minutes: number): number => {
  return Math.round(minutes * 60);
};

// Convert seconds to minutes for backward compatibility
export const secondsToMinutes = (seconds: number): number => {
  return seconds / 60;
};
