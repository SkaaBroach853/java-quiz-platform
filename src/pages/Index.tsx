
import React, { useState, useCallback } from 'react';
import LoginForm from '../components/LoginForm';
import QuizQuestion from '../components/QuizQuestion';
import ResultsScreen from '../components/ResultsScreen';
import { QuizSession, QuizResult, Question } from '../types/quiz';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

type AppState = 'login' | 'quiz' | 'results';

const Index = () => {
  const [appState, setAppState] = useState<AppState>('login');
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const { toast } = useToast();

  // Fetch questions from Supabase and map to our interface
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('section', { ascending: true });
      
      if (error) throw error;
      
      // Map database fields to interface fields
      return data.map((q): Question => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correct_answer,
        section: q.section as 1 | 2 | 3,
        difficulty: q.difficulty as 'easy' | 'moderate' | 'hard',
        timeLimit: q.time_limit,
      }));
    }
  });

  const handleLogin = useCallback(async (email: string, accessCode: string) => {
    try {
      // Check if user exists or create new one
      const { data: existingUser } = await supabase
        .from('quiz_users')
        .select('*')
        .eq('email', email)
        .eq('access_code', accessCode)
        .single();

      let userId;
      if (existingUser) {
        if (existingUser.has_completed) {
          toast({
            title: "Quiz Already Completed",
            description: "You have already taken this quiz.",
            variant: "destructive"
          });
          return;
        }
        userId = existingUser.id;
        setCurrentQuestionIndex(existingUser.current_question_index || 0);
      } else {
        // Create new user
        const { data: newUser, error } = await supabase
          .from('quiz_users')
          .insert({ email, access_code: accessCode, started_at: new Date().toISOString() })
          .select()
          .single();

        if (error) throw error;
        userId = newUser.id;
        setCurrentQuestionIndex(0);
      }

      // Create or update session
      const { error: sessionError } = await supabase
        .from('quiz_sessions')
        .upsert({
          user_id: userId,
          is_active: true,
          last_activity: new Date().toISOString()
        });

      if (sessionError) throw sessionError;

      // Initialize quiz session
      const session: QuizSession = {
        email,
        accessCode,
        currentQuestionIndex: currentQuestionIndex,
        answers: new Array(questions.length).fill(null),
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
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: "Failed to start quiz. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast, questions.length, currentQuestionIndex]);

  const handleAnswer = useCallback(async (answerIndex: number) => {
    if (!quizSession || !questions.length) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correctAnswer;
    
    // Update answers array
    const newAnswers = [...quizSession.answers];
    newAnswers[currentQuestionIndex] = answerIndex;

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

    // Update database
    try {
      const { data: user } = await supabase
        .from('quiz_users')
        .select('id')
        .eq('email', quizSession.email)
        .eq('access_code', quizSession.accessCode)
        .single();

      if (user) {
        await supabase
          .from('quiz_users')
          .update({ current_question_index: currentQuestionIndex + 1 })
          .eq('id', user.id);

        await supabase
          .from('quiz_sessions')
          .update({
            answers: newAnswers,
            section_scores: newSectionScores,
            last_activity: new Date().toISOString()
          })
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }

    // Move to next question or finish quiz
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setQuizSession(updatedSession);
      } else {
        // Quiz completed
        finishQuiz(updatedSession);
      }
    }, 1000);

    setQuizSession(updatedSession);
  }, [quizSession, questions, currentQuestionIndex]);

  const handleTimeUp = useCallback(() => {
    // Same as handleAnswer but with no answer selected
    handleAnswer(-1); // -1 indicates no answer
  }, [handleAnswer]);

  const finishQuiz = useCallback(async (session: QuizSession) => {
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

    try {
      // Get user ID
      const { data: user } = await supabase
        .from('quiz_users')
        .select('id')
        .eq('email', session.email)
        .eq('access_code', session.accessCode)
        .single();

      if (user) {
        // Mark as completed
        await supabase
          .from('quiz_users')
          .update({ 
            has_completed: true, 
            completed_at: endTime.toISOString() 
          })
          .eq('id', user.id);

        // Save result
        await supabase
          .from('quiz_results')
          .insert({
            user_id: user.id,
            total_score: totalScore,
            section_scores: session.sectionScores,
            completion_time: Math.round(completionTime),
            completed_at: endTime.toISOString()
          });

        // Deactivate session
        await supabase
          .from('quiz_sessions')
          .update({ is_active: false })
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error saving results:', error);
    }

    setResult(quizResult);
    setAppState('results');

    toast({
      title: "Quiz Completed!",
      description: `You scored ${totalScore}/${questions.length} questions correctly.`,
    });
  }, [toast, questions.length]);

  const handleRestart = useCallback(() => {
    setQuizSession(null);
    setResult(null);
    setCurrentQuestionIndex(0);
    setAppState('login');
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading quiz questions...</p>
        </div>
      </div>
    );
  }

  // Render based on current app state
  switch (appState) {
    case 'login':
      return <LoginForm onLogin={handleLogin} />;
      
    case 'quiz':
      if (!quizSession || !questions.length) return <LoginForm onLogin={handleLogin} />;
      
      const currentQuestion = questions[currentQuestionIndex];
      return (
        <QuizQuestion
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questions.length}
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
