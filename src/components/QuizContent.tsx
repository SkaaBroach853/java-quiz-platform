
import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Question } from '@/types/quiz';


interface QuizContentProps {
  questions: Question[];
  currentQuestionIndex: number;
  answers: (number | null)[];
  onAnswerQuestion: (answerIndex: number) => void;
  onNextQuestion: () => void;
  onPreviousQuestion: () => void;
  onSubmitQuiz: () => void;
  isLoading: boolean;
}

const QuizContent = ({
  questions,
  currentQuestionIndex,
  answers,
  onAnswerQuestion,
  onNextQuestion,
  onPreviousQuestion,
  onSubmitQuiz,
  isLoading
}: QuizContentProps) => {
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const currentAnswer = answers[currentQuestionIndex];

  // Save quiz state to localStorage for timer protection
  useEffect(() => {
    const quizState = {
      currentQuestionIndex,
      answers,
      timestamp: Date.now()
    };
    localStorage.setItem('quiz_state', JSON.stringify(quizState));
  }, [currentQuestionIndex, answers]);

  // Prevent page refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave? Your quiz progress will be lost.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  if (!currentQuestion) {
    return <div>Loading question...</div>;
  }

  return (
    <div className="min-h-screen p-4">
      <Card className="max-w-2xl mx-auto bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>
            Question {currentQuestionIndex + 1} of {questions.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">{currentQuestion.question}</h3>
            {currentQuestion.image_url && (
              <img 
                src={currentQuestion.image_url} 
                alt="Question" 
                className="max-w-full h-auto mb-4 rounded"
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                style={{ userSelect: 'none' }}
              />
            )}
          </div>

          <RadioGroup
            value={currentAnswer?.toString() || ""}
            onValueChange={(value) => onAnswerQuestion(parseInt(value))}
          >
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label 
                  htmlFor={`option-${index}`} 
                  className="cursor-pointer select-none"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex justify-between">
            <Button 
              onClick={onPreviousQuestion}
              disabled={currentQuestionIndex === 0}
              variant="outline"
            >
              Previous
            </Button>
            
            {isLastQuestion ? (
              <Button 
                onClick={onSubmitQuiz}
                disabled={isLoading}
              >
                {isLoading ? "Submitting..." : "Submit Quiz"}
              </Button>
            ) : (
              <Button 
                onClick={onNextQuestion}
                disabled={currentAnswer === null}
              >
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizContent;
