
export const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const minutesToSeconds = (minutes: number): number => {
  return Math.round(minutes * 60);
};

export const formatCompletionTime = (timeInSeconds: number): string => {
  if (timeInSeconds < 60) {
    return `${Math.round(timeInSeconds)} seconds`;
  }
  
  const minutes = Math.floor(timeInSeconds / 60);
  const remainingSeconds = Math.round(timeInSeconds % 60);
  
  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
