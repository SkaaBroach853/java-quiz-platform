import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Question, QuizResult } from '@/types/quiz';
import QuizWrapper from '@/components/QuizWrapper';
import ResultsScreen from '@/components/ResultsScreen';
import EntryForm from '@/components/EntryForm';
import { AntiCheatProvider } from '@/components/AntiCheatProvider';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

interface QuizSession {
  name: string;
  email: string;
  branch: string;
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
  const [userId, setUserId] = useState<string | null>(null);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const name = searchParams.get('name');
    const email = searchParams.get('email');
    const branch = searchParams.get('branch');
    const accessCode = searchParams.get('accessCode');

    if (name && email && branch && accessCode) {
      setQuizSession({ name, email, branch, accessCode });
    } else {
      // For now, set loading to false to prevent infinite loading
      setLoading(false);
    }
  }, [navigate, searchParams]);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!quizSession) return;

      try {
        setLoading(true);
        // Check if user exists
        const { data: existingUser, error: userError } = await supabase
          .from('quiz_users')
          .select('*')
          .eq('email', quizSession.email)
          .eq('access_code', quizSession.accessCode)
          .maybeSingle(); // Use maybeSingle instead of single to handle no results
  
        if (userError) {
          console.error("Error fetching user:", userError);
          alert("Error fetching user. Please try again.");
          return;
        }

        if (!existingUser) {
          // User doesn't exist, create new user
          console.log("User not found, creating new user");
          const { data: newUser, error: newUserError } = await supabase
            .from('quiz_users')
            .insert([{ 
              email: quizSession.email, 
              access_code: quizSession.accessCode,
              name: quizSession.name,
              branch: quizSession.branch
            }])
            .select()
            .single();
  
          if (newUserError) {
            console.error("Error creating user:", newUserError);
            alert("Error creating user. Please try again.");
            return;
          }
          
          setUserId(newUser.id);
        } else {
          if (existingUser.has_completed) {
            alert("You have already completed this quiz and cannot attempt it again.");
            navigate('/');
            return;
          }
          
          setUserId(existingUser.id);
          
          // Update name and branch if not present
          if ((!existingUser.name && quizSession.name) || (!existingUser.branch && quizSession.branch)) {
            await supabase
              .from('quiz_users')
              .update({ 
                name: quizSession.name,
                branch: quizSession.branch
              })
              .eq('id', existingUser.id);
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
        
        // Shuffle questions within each section
        const shuffleArray = (array: Question[]) => {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        };

        const section1Questions = shuffleArray(mappedQuestions.filter(q => q.section === 1));
        const section2Questions = shuffleArray(mappedQuestions.filter(q => q.section === 2));
        const section3Questions = shuffleArray(mappedQuestions.filter(q => q.section === 3));
        
        const shuffledQuestions = [...section1Questions, ...section2Questions, ...section3Questions];
        
        setQuestions(shuffledQuestions);
        setAnswers(Array(mappedQuestions.length).fill(null));
        setQuizStartTime(Date.now());
      } catch (err) {
        console.error("Unexpected error:", err);
        alert("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [quizSession]);

  // Prevent going back after quiz completion
  useEffect(() => {
    if (isCompleted) {
      // Replace current history entry to prevent going back to quiz
      window.history.replaceState(null, '', window.location.pathname);
      
      // Add popstate listener to handle back button after completion
      const handlePopState = (event: PopStateEvent) => {
        // Redirect to login page when user tries to go back after completion
        navigate('/', { replace: true });
      };

      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isCompleted, navigate]);

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
    // ADD THIS DEBUG CODE TO SEE WHAT'S HAPPENING
    console.log("=== QUIZ SCORING DEBUG ===");
    console.log("Total questions:", questions.length);
    console.log("User answers:", answers);
    
    let correctCount = 0;
    questions.forEach((question, index) => {
      const userAnswer = answers[index];
      const correctAnswer = question.correctAnswer;
      const isCorrect = userAnswer === correctAnswer;
      
      if (isCorrect) correctCount++;
      
      console.log(`Question ${index + 1}:`);
      console.log(`  Question: ${question.question}`);
      console.log(`  Options: ${question.options}`);
      console.log(`  User selected index: ${userAnswer} (${userAnswer !== null ? question.options[userAnswer] : 'No answer'})`);
      console.log(`  Correct answer index: ${correctAnswer} (${question.options[correctAnswer]})`);
      console.log(`  Is correct: ${isCorrect}`);
      console.log("---");
    });
    
    console.log(`Total correct: ${correctCount} out of ${questions.length}`);
    console.log("=== END DEBUG ===");

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

    // Calculate actual elapsed time in seconds
    const completionTimeInSeconds = Math.max(1, Math.round(((Date.now() - (quizStartTime || Date.now())) / 1000)));

    const quizResult = {
      totalScore: correctAnswers,
      sectionScores,
      completionTime: completionTimeInSeconds,
      completedAt: new Date()
    };

    setResult(quizResult);
    setIsCompleted(true);

    // Rest of your existing code for saving to database...
  }
};

      // Save result to Supabase with enhanced error handling
      try {
        console.log("Saving quiz result for:", quizSession?.email);
        
        const { data: user, error: userError } = await supabase
          .from('quiz_users')
          .select('id')
          .eq('email', quizSession?.email)
          .eq('access_code', quizSession?.accessCode)
          .single();
    
        if (userError) {
          console.error("Error fetching user for result save:", userError);
          return;
        }
    
        if (!user) {
          console.error("User not found for result save");
          return;
        }

        console.log("User found, saving result with user_id:", user.id);

        // Mark user as completed first
        const { error: updateError } = await supabase
          .from('quiz_users')
          .update({ 
            has_completed: true,
            completed_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error("Error updating user completion status:", updateError);
        }

        console.log("Inserting quiz result...");
        const { data: resultData, error: resultError } = await supabase
          .from('quiz_results')
          .insert([
            {
              user_id: user.id,
              total_score: correctAnswers,
              section_scores: sectionScores,
              completion_time: completionTimeInSeconds, // Store as seconds, not minutes
              completed_at: new Date().toISOString(),
              total_questions: totalQuestions,
            },
          ])
          .select()
          .single();

        if (resultError) {
          console.error("Error saving quiz result:", resultError);
          alert("Error saving quiz result. Please contact support.");
        } else {
          console.log("Quiz result saved successfully:", resultData);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      }
    }
  };

  const handleAutoSubmit = async () => {
    if (!questions) return;

    // Auto-submit the quiz
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

    const completionTimeInSeconds = Math.max(1, Math.round(((Date.now() - (quizStartTime || Date.now())) / 1000))); // Use actual time tracking

    const quizResult = {
      totalScore: correctAnswers,
      sectionScores,
      completionTime: completionTimeInSeconds,
      completedAt: new Date()
    };

    setResult(quizResult);
    setIsCompleted(true);

    // Save to database
    if (userId) {
      try {
        await supabase
          .from('quiz_users')
          .update({ 
            has_completed: true,
            completed_at: new Date().toISOString()
          })
          .eq('id', userId);

        await supabase
          .from('quiz_results')
          .insert([{
            user_id: userId,
            total_score: correctAnswers,
            section_scores: sectionScores,
            completion_time: completionTimeInSeconds,
            completed_at: new Date().toISOString(),
            total_questions: totalQuestions,
          }]);
      } catch (error) {
        console.error("Error saving auto-submit result:", error);
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading...</div>;
  }

  if (!quizSession) {
    return <EntryForm />;
  }

  if (!questions || questions.length === 0) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">No questions found.</div>;
  }

  // Fix the QuizResult type issue in the completion handler
  if (isCompleted && result) {
    const quizResult: QuizResult = {
      email: quizSession?.email || '',
      totalScore: result.totalScore || 0,
      sectionScores: result.sectionScores || { section1: 0, section2: 0, section3: 0 },
      completionTime: result.completionTime || 0,
      completedAt: result.completedAt || new Date()
    };
    
    return <ResultsScreen result={quizResult} userName={quizSession?.name} />;
  }

  if (!userId || !quizSession) {
    return <div>Loading...</div>;
  }

  return (
    <AntiCheatProvider
      userEmail={quizSession.email}
      userId={userId}
      currentQuestionNumber={currentQuestionIndex + 1}
      onAutoSubmit={handleAutoSubmit}
    >
      <div>
        {questions && questions.length > 0 && (
          <QuizWrapper
            question={questions[currentQuestionIndex]}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            onAnswer={handleAnswer}
            onTimeUp={handleNextQuestion}
          />
        )}
      </div>
    </AntiCheatProvider>
  );
};

export default Index;
