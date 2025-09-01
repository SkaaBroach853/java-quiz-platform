
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Question } from '../types/quiz';
import CircularTimer from './CircularTimer';
import ProgressBar from './ProgressBar';
import { CheckCircle } from 'lucide-react';

interface QuizQuestionProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answerIndex: number) => void;
  onTimeUp: () => void;
}

const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  onTimeUp,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer(null);
    setIsAnswered(false);
  }, [question.id]);

  const handleOptionClick = (optionIndex: number) => {
    if (isAnswered) return;
    
    setSelectedAnswer(optionIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer !== null && !isAnswered) {
      setIsAnswered(true);
      onAnswer(selectedAnswer);
      
      // Auto advance to next question after a short delay
      setTimeout(() => {
        onTimeUp(); // This will trigger moving to next question
      }, 500);
    }
  };

  const handleTimeUp = () => {
    if (!isAnswered) {
      setIsAnswered(true);
      onTimeUp();
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header with progress and timer */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <ProgressBar
              current={questionNumber}
              total={totalQuestions}
              section={question.section}
            />
          </div>
          <div className="ml-8">
            <CircularTimer
              key={question.id} // Force reset timer for each question
              duration={question.timeLimit}
              onTimeUp={handleTimeUp}
              isActive={!isAnswered}
            />
          </div>
        </div>

        {/* Question Card */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900 leading-relaxed">
              {question.question}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Display image if it exists */}
            {question.image_url && (
              <div className="flex justify-center mb-6">
                <img 
                  src={question.image_url} 
                  alt="Question illustration" 
                  className="max-w-full h-auto rounded-lg shadow-sm border border-gray-200"
                  style={{ maxHeight: '300px' }}
                  onError={(e) => {
                    console.error('Failed to load image:', question.image_url);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            {/* Options */}
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleOptionClick(index)}
                  disabled={isAnswered}
                  className={`
                    w-full text-left p-4 rounded-lg border-2 transition-all duration-200
                    hover:shadow-md hover:border-blue-300
                    ${selectedAnswer === index 
                      ? 'border-blue-400 bg-blue-50 shadow-md' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                    }
                    ${isAnswered ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`
                        w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold
                        ${selectedAnswer === index 
                          ? 'border-blue-500 bg-blue-500 text-white' 
                          : 'border-gray-300 text-gray-600 bg-white'
                        }
                      `}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="font-medium text-gray-900">{option}</span>
                    </div>
                    
                    {selectedAnswer === index && (
                      <CheckCircle size={20} className="text-blue-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer === null || isAnswered}
            className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 text-lg font-medium rounded-lg min-w-48 transition-colors duration-200"
          >
            {isAnswered ? 'Answer Submitted' : 'Submit Answer'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuizQuestion;
