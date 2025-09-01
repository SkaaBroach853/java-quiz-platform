
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
        return { name: 'Easy', color: 'bg-green-500' };
      case 2:
        return { name: 'Medium', color: 'bg-yellow-500' };
      case 3:
        return { name: 'Hard', color: 'bg-red-500' };
      default:
        return { name: 'Section', color: 'bg-blue-500' };
    }
  };

  const sectionInfo = getSectionInfo(section);

  return (
    <div className="w-full max-w-lg space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-gray-700 font-medium text-lg">
          Question {current} of {total}
        </span>
        <span className={`px-4 py-2 rounded-full text-sm font-medium text-white ${sectionInfo.color}`}>
          {sectionInfo.name}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="text-center text-sm text-gray-600 font-medium">
        {Math.round(progress)}% Complete
      </div>
    </div>
  );
};

export default ProgressBar;
