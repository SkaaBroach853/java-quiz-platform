
import React, { useState, useCallback } from 'react';
import LoginForm from '../components/LoginForm';
import QuizQuestion from '../components/QuizQuestion';
import ResultsScreen from '../components/ResultsScreen';
import { QuizSession, QuizResult } from '../types/quiz';
import { sampleQuestions } from '../data/sampleQuestions';
import { useToast } from '@/hooks/use-toast';

type AppState = 'login' | 'quiz' | 'results';

const Index = () => {
  const [appState, setAppState] = useState<AppState>('login');
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const { toast } = useToast();

  const handleLogin = useCallback((email: string, accessCode: string) => {
    // Initialize quiz session
    const session: QuizSession = {
      email,
      accessCode,
      currentQuestionIndex: 0,
      answers: new Array(45).fill(null),
      startTime: new Date(),
      sectionScores: {
        section1: 0,
        section2: 0,
        section3: 0,
      },
      isCompleted: false,
    };

    setQuizSession(session);
    setAppState('quiz');
    
    toast({
      title: "Quiz Started",
      description: "Good luck! Take your time and read each question carefully.",
    });
  }, [toast]);

  const handleAnswer = useCallback((answerIndex: number) => {
    if (!quizSession) return;

    const currentQuestion = sampleQuestions[quizSession.currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correctAnswer;
    
    // Update answers array
    const newAnswers = [...quizSession.answers];
    newAnswers[quizSession.currentQuestionIndex] = answerIndex;

    // Update section scores
    const newSectionScores = { ...quizSession.sectionScores };
    if (isCorrect) {
      if (currentQuestion.section === 1) newSectionScores.section1++;
      else if (currentQuestion.section === 2) newSectionScores.section2++;
      else if (currentQuestion.section === 3) newSectionScores.section3++;
    }

    const updatedSession = {
      ...quizSession,
      answers: newAnswers,
      sectionScores: newSectionScores,
    };

    // Move to next question or finish quiz
    setTimeout(() => {
      if (quizSession.currentQuestionIndex < sampleQuestions.length - 1) {
        setQuizSession({
          ...updatedSession,
          currentQuestionIndex: quizSession.currentQuestionIndex + 1,
        });
      } else {
        // Quiz completed
        finishQuiz(updatedSession);
      }
    }, 1000);

    setQuizSession(updatedSession);
  }, [quizSession]);

  const handleTimeUp = useCallback(() => {
    // Same as handleAnswer but with no answer selected
    handleAnswer(-1); // -1 indicates no answer
  }, [handleAnswer]);

  const finishQuiz = useCallback((session: QuizSession) => {
    const endTime = new Date();
    const completionTime = (endTime.getTime() - session.startTime.getTime()) / (1000 * 60); // in minutes
    
    const totalScore = session.sectionScores.section1 + 
                      session.sectionScores.section2 + 
                      session.sectionScores.section3;

    const quizResult: QuizResult = {
      email: session.email,
      totalScore,
      sectionScores: session.sectionScores,
      completionTime,
      completedAt: endTime,
    };

    setResult(quizResult);
    setAppState('results');

    toast({
      title: "Quiz Completed!",
      description: `You scored ${totalScore}/45 questions correctly.`,
    });
  }, [toast]);

  const handleRestart = useCallback(() => {
    setQuizSession(null);
    setResult(null);
    setAppState('login');
  }, []);

  // Render based on current app state
  switch (appState) {
    case 'login':
      return <LoginForm onLogin={handleLogin} />;
      
    case 'quiz':
      if (!quizSession) return <LoginForm onLogin={handleLogin} />;
      
      const currentQuestion = sampleQuestions[quizSession.currentQuestionIndex];
      return (
        <QuizQuestion
          question={currentQuestion}
          questionNumber={quizSession.currentQuestionIndex + 1}
          totalQuestions={sampleQuestions.length}
          onAnswer={handleAnswer}
          onTimeUp={handleTimeUp}
        />
      );
      
    case 'results':
      if (!result) return <LoginForm onLogin={handleLogin} />;
      
      return (
        <ResultsScreen
          result={result}
          onRestart={handleRestart}
        />
      );
      
    default:
      return <LoginForm onLogin={handleLogin} />;
  }
};

export default Index;
