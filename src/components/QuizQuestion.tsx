
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
    }
  };

  const handleTimeUp = () => {
    if (!isAnswered) {
      setIsAnswered(true);
      onTimeUp();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-quiz-surface to-background p-4">
      <div className="w-full max-w-4xl space-y-6 animate-fade-in">
        {/* Header with progress and timer */}
        <div className="flex justify-between items-start">
          <ProgressBar
            current={questionNumber}
            total={totalQuestions}
            section={question.section}
          />
          <CircularTimer
            key={question.id} // Force reset timer for each question
            duration={question.timeLimit}
            onTimeUp={handleTimeUp}
            isActive={!isAnswered}
          />
        </div>

        {/* Question Card */}
        <Card className="quiz-card">
          <CardHeader>
            <CardTitle className="text-xl font-medium text-quiz-surface-foreground leading-relaxed">
              {question.question}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionClick(index)}
                disabled={isAnswered}
                className={`
                  option-button w-full text-left
                  ${selectedAnswer === index ? 'option-button-selected' : ''}
                  ${isAnswered ? 'cursor-not-allowed opacity-75' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium
                      ${selectedAnswer === index 
                        ? 'border-quiz-primary bg-quiz-primary text-white' 
                        : 'border-quiz-border text-muted-foreground'
                      }
                    `}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="font-medium">{option}</span>
                  </div>
                  
                  {selectedAnswer === index && (
                    <CheckCircle size={20} className="text-quiz-primary" />
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer === null || isAnswered}
            className="quiz-button-primary min-w-40"
          >
            {isAnswered ? 'Answer Submitted' : 'Submit Answer'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuizQuestion;
