import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Question, QuizResult } from '@/types/quiz';
import QuizQuestion from '@/components/QuizQuestion';
import ResultsScreen from '@/components/ResultsScreen';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

interface QuizSession {
  email: string;
  accessCode: string;
}

const Index = () => {
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<Omit<QuizResult, 'email'> | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const email = searchParams.get('email');
    const accessCode = searchParams.get('accessCode');

    if (email && accessCode) {
      setQuizSession({ email, accessCode });
    } else {
      // Redirect to the entry page if email or accessCode is missing
      navigate('/');
    }
  }, [navigate, searchParams]);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!quizSession) return;

      try {
        setLoading(true);
        const { data: existingUser, error: userError } = await supabase
          .from('quiz_users')
          .select('*')
          .eq('email', quizSession.email)
          .eq('access_code', quizSession.accessCode)
          .single();
  
        if (userError) {
          console.error("Error fetching user:", userError);
          alert("Error fetching user. Please try again.");
          return;
        }
  
        if (!existingUser) {
          console.log("User not found, creating new user");
          const { data: newUser, error: newUserError } = await supabase
            .from('quiz_users')
            .insert([{ email: quizSession.email, access_code: quizSession.accessCode }])
            .select()
            .single();
  
          if (newUserError) {
            console.error("Error creating user:", newUserError);
            alert("Error creating user. Please try again.");
            return;
          }
        }

        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.error("Error fetching questions:", error);
          alert("Error fetching questions. Please try again.");
          return;
        }

        // Map database response to Question interface
        const mappedQuestions: Question[] = data.map(q => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correct_answer,
          section: q.section as 1 | 2 | 3,
          difficulty: q.difficulty as 'easy' | 'moderate' | 'hard',
          timeLimit: q.time_limit,
          image_url: q.image_url
        }));
        
        setQuestions(mappedQuestions);
        setAnswers(Array(mappedQuestions.length).fill(null));
      } catch (err) {
        console.error("Unexpected error:", err);
        alert("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [quizSession]);

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleNextQuestion = async () => {
    if (!questions) return;

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Quiz is complete, calculate the result
      const totalQuestions = questions.length;
      const correctAnswers = questions.reduce((count, question, index) => {
        return answers[index] === question.correctAnswer ? count + 1 : count;
      }, 0);

      const sectionScores = questions.reduce((scores, question, index) => {
        if (answers[index] === question.correctAnswer) {
          scores[`section${question.section}` as keyof typeof scores] += 1;
        }
        return scores;
      }, { section1: 0, section2: 0, section3: 0 });

      // Mock completion time (replace with actual calculation)
      const completionTime = Math.random() * 30; // in minutes

      const quizResult = {
        totalScore: correctAnswers,
        sectionScores,
        completionTime,
        completedAt: new Date()
      };

      setResult(quizResult);
      setIsCompleted(true);

      // Save result to Supabase
      try {
        const { data: user, error: userError } = await supabase
          .from('quiz_users')
          .select('id')
          .eq('email', quizSession?.email)
          .eq('access_code', quizSession?.accessCode)
          .single();
    
        if (userError) {
          console.error("Error fetching user:", userError);
          return;
        }
    
        if (!user) {
          console.error("User not found");
          return;
        }

        const { error: resultError } = await supabase
          .from('quiz_results')
          .insert([
            {
              user_id: user.id,
              total_score: correctAnswers,
              section_scores: sectionScores,
              completion_time: completionTime,
              completed_at: new Date().toISOString(),
              total_questions: totalQuestions,
            },
          ]);

        if (resultError) {
          console.error("Error saving quiz result:", resultError);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading...</div>;
  }

  if (!quizSession) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Invalid Quiz Session.</div>;
  }

  if (!questions || questions.length === 0) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">No questions found.</div>;
  }

  // Fix the QuizResult type issue in the completion handler
  if (isCompleted && result) {
    const quizResult: QuizResult = {
      email: quizSession.email || '',
      totalScore: result.totalScore || 0,
      sectionScores: result.sectionScores || { section1: 0, section2: 0, section3: 0 },
      completionTime: result.completionTime || 0,
      completedAt: result.completedAt || new Date()
    };
    
    return <ResultsScreen result={quizResult} />;
  }

  return (
    <div>
      {questions && questions.length > 0 && (
        <QuizQuestion
          question={questions[currentQuestionIndex]}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          onAnswer={handleAnswer}
          onTimeUp={handleNextQuestion}
        />
      )}
    </div>
  );
};

export default Index;
