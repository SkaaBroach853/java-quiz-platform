
import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  section: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, section }) => {
  const progress = (current / total) * 100;
  
  const getSectionInfo = (sectionNum: number) => {
    switch (sectionNum) {
      case 1:
        return { name: 'Easy', color: 'bg-quiz-success' };
      case 2:
        return { name: 'Moderate', color: 'bg-quiz-warning' };
      case 3:
        return { name: 'Hard', color: 'bg-destructive' };
      default:
        return { name: 'Section', color: 'bg-quiz-primary' };
    }
  };

  const sectionInfo = getSectionInfo(section);

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">
          Question {current} of {total}
        </span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${sectionInfo.color}`}>
          {sectionInfo.name}
        </span>
      </div>
      
      <div className="progress-bar h-2">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="text-center text-xs text-muted-foreground">
        {Math.round(progress)}% Complete
      </div>
    </div>
  );
};

export default ProgressBar;
