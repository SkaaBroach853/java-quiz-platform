
import React from 'react';
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

  if (!currentQuestion) {
    return <div>Loading question...</div>;
  }

  return (
    <Card className="max-w-2xl mx-auto">
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
              <Label htmlFor={`option-${index}`} className="cursor-pointer">
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
  );
};

export default QuizContent;
