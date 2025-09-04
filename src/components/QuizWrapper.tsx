import React, { useEffect } from 'react';
import { useAntiCheat } from '@/components/AntiCheatProvider';
import QuizQuestion from '@/components/QuizQuestion';
import { Question } from '@/types/quiz';

interface QuizWrapperProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answerIndex: number) => void;
  onTimeUp: () => void;
}

const QuizWrapper: React.FC<QuizWrapperProps> = (props) => {
  const { setIsActive } = useAntiCheat();

  useEffect(() => {
    // Activate anti-cheat when quiz starts
    setIsActive(true);

    // Deactivate when component unmounts (quiz ends)
    return () => {
      setIsActive(false);
    };
  }, [setIsActive]);

  return <QuizQuestion {...props} />;
};

export default QuizWrapper;