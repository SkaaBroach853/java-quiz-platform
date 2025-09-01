import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Question } from '@/types/quiz';
import QuizQuestion from '@/components/QuizQuestion';
import { useTotalQuestions } from '@/hooks/useTotalQuestions';
import AntiCheatProvider from '@/components/AntiCheatProvider';
import LoginForm from '@/components/LoginForm';
import ResultsScreen from '@/components/ResultsScreen'; // Import ResultsScreen

interface QuizUser {
  id: string;
  email: string;
  access_code: string;
  has_completed: boolean;
  current_question_index: number;
  started_at: string | null;
  completed_at: string | null;
}

interface QuizSession {
  id: string;
  user_id: string;
  is_active: boolean;
  started_at: string;
  last_activity: string;
  answers?: any;
  isCompleted?: boolean;
}

const Index = () => {
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [quizUser, setQuizUser] = useState<QuizUser | null>(null);
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [showResultScreen, setShowResultScreen] = useState(false); // Add state for showing result screen
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null); // Track quiz start time
  const [actualCompletionTime, setActualCompletionTime] = useState<number>(0); // Track actual completion time in seconds
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: totalQuestions } = useTotalQuestions();

  // Function to update session activity
  const updateSessionActivity = async () => {
    if (quizUser?.id) {
      try {
        // Update the user record to trigger the activity update
        const { error } = await supabase
          .from('quiz_users')
          .update({ 
            current_question_index: currentQuestionIndex 
          })
          .eq('id', quizUser.id);

        if (error) {
          console.error('Error updating session activity:', error);
        }
      } catch (error) {
        console.error('Error updating activity:', error);
      }
    }
  };

  // Update activity whenever user answers a question or navigates
  useEffect(() => {
    if (quizSession && quizUser?.has_completed !== true) {
      updateSessionActivity();
    }
  }, [currentQuestionIndex, quizUser?.id]);

  // Update activity every 2 minutes while quiz is active
  useEffect(() => {
    if (quizSession && quizUser?.has_completed !== true) {
      const interval = setInterval(() => {
        updateSessionActivity();
      }, 2 * 60 * 1000); // 2 minutes

      return () => clearInterval(interval);
    }
  }, [quizUser?.has_completed, quizUser?.id]);

  const fetchQuestions = async () => {
    console.log('Fetching questions...');
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('section', { ascending: true })
        .order('difficulty', { ascending: true });

      if (error) {
        console.error("Error fetching questions:", error);
        toast({
          title: "Error",
          description: "Failed to retrieve quiz questions.",
          variant: "destructive",
        })
      } else {
        // Transform database fields to match Question interface
        const transformedQuestions: Question[] = (data || []).map(q => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correct_answer,
          section: q.section as 1 | 2 | 3,
          difficulty: q.difficulty as 'easy' | 'moderate' | 'hard',
          timeLimit: q.time_limit,
          image_url: q.image_url
        }));
        console.log('Questions loaded:', transformedQuestions.length);
        setQuestions(transformedQuestions);
        setAnswers(Array(transformedQuestions.length).fill(null));
        setQuestionsLoaded(true);
      }
    } catch (error) {
      console.error("Unexpected error fetching questions:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching questions.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false);
    }
  };

  const startQuizMutation = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      
      // Step 1: Check if the user already exists and has completed the quiz
      let { data: existingUser, error: userError } = await supabase
        .from('quiz_users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
  
      if (userError && userError.code !== 'PGRST116') {
        console.error("Error checking user:", userError);
        throw new Error("Failed to check user existence.");
      }
  
      // If user exists and has completed the quiz, prevent access
      if (existingUser && existingUser.has_completed) {
        throw new Error("This email has already been used to complete the quiz. Multiple attempts are not allowed.");
      }
  
      let userId;
  
      if (!existingUser) {
        // Step 2: If the user doesn't exist, create a new user
        const { data: newUser, error: newUserError } = await supabase
          .from('quiz_users')
          .insert([{ email, access_code: accessCode }])
          .select('*')
          .single();
  
        if (newUserError) {
          console.error("Error creating user:", newUserError);
          throw new Error("Failed to create new user.");
        }
  
        userId = newUser.id;
        setQuizUser(newUser);
      } else {
        userId = existingUser.id;
        setQuizUser(existingUser);
      }
  
      // Step 3: Check if there's an existing session for the user
      let { data: existingSession, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
  
      if (sessionError && sessionError.code !== 'PGRST116') {
        console.error("Error checking session:", sessionError);
        throw new Error("Failed to check existing session.");
      }
  
      if (existingSession) {
        setQuizSession(existingSession);
        const answersLength = Array.isArray(existingSession.answers) ? existingSession.answers.length : 0;
        setCurrentQuestionIndex(answersLength);
        
        toast({
          title: "Welcome Back",
          description: `Resuming your previous session.`,
        })
      } else {
        // Step 4: If no session exists, create a new session
        const { data: newSession, error: newSessionError } = await supabase
          .from('quiz_sessions')
          .insert([{ user_id: userId, is_active: true, started_at: new Date().toISOString(), last_activity: new Date().toISOString() }])
          .select('*')
          .single();
  
        if (newSessionError) {
          console.error("Error creating session:", newSessionError);
          throw new Error("Failed to create new session.");
        }
  
        setQuizSession(newSession);
        toast({
          title: "Quiz Started",
          description: `Good luck!`,
        })
      }
    },
    onSuccess: async () => {
      await fetchQuestions();
      // Set quiz start time when quiz actually begins
      setQuizStartTime(Date.now());
      // Only set quiz as active after questions are loaded
      setIsQuizActive(true);
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: `${error}`,
        variant: "destructive",
      })
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleLogin = (userEmail: string, userAccessCode: string) => {
    setEmail(userEmail);
    setAccessCode(userAccessCode);
    handleStartQuiz();
  };

  const handleStartQuiz = async () => {
    setShowRulesDialog(true);
  };

  const handleConfirmStart = () => {
    setShowRulesDialog(false);
    startQuizMutation.mutate();
  };

  const handleAnswerQuestion = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleTimeUp = () => {
    // Move to next question automatically when time runs out
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Last question - submit quiz
      handleSubmitQuiz();
    }
  };

  const calculateSectionScores = () => {
    const section1Questions = questions.filter(q => q.section === 1);
    const section2Questions = questions.filter(q => q.section === 2);
    const section3Questions = questions.filter(q => q.section === 3);

    const calculateScore = (questionsInSection: Question[]) => {
        let score = 0;
        questionsInSection.forEach(question => {
            const questionIndex = questions.findIndex(q => q.id === question.id);
            if (questionIndex !== -1 && answers[questionIndex] === question.correctAnswer) {
                score++;
            }
        });
        return score;
    };

    const section1Score = calculateScore(section1Questions);
    const section2Score = calculateScore(section2Questions);
    const section3Score = calculateScore(section3Questions);

    return {
        section1: section1Score,
        section2: section2Score,
        section3: section3Score
    };
  };

  const handleSubmitQuiz = async () => {
    console.log('Starting quiz submission...');
    setIsLoading(true);
    
    // Calculate actual completion time
    const completionTimeInSeconds = quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1000) : 0;
    setActualCompletionTime(completionTimeInSeconds);
    
    try {
      if (!quizUser?.id) {
        throw new Error("No user ID found");
      }

      const sectionScores = calculateSectionScores();
      const totalScore = Object.values(sectionScores).reduce((sum, score) => sum + score, 0);
      const questionsCount = totalQuestions || questions.length;

      console.log('Quiz submission data:', {
        user_id: quizUser.id,
        total_score: totalScore,
        section_scores: sectionScores,
        completion_time: completionTimeInSeconds, // Use actual time in seconds
        total_questions: questionsCount
      });

      // Step 1: Update quiz_users table first
      console.log('Updating user completion status...');
      const { error: userUpdateError } = await supabase
        .from('quiz_users')
        .update({ 
          has_completed: true, 
          completed_at: new Date().toISOString(),
          current_question_index: questions.length 
        })
        .eq('id', quizUser.id);

      if (userUpdateError) {
        console.error("Error updating quiz_users:", userUpdateError);
        throw new Error(`Failed to update user completion status: ${userUpdateError.message}`);
      }
      console.log('User completion status updated successfully');

      // Step 2: Insert into quiz_results table
      console.log('Inserting quiz results...');
      const { error: resultsError } = await supabase
        .from('quiz_results')
        .insert([
          {
            user_id: quizUser.id,
            total_score: totalScore,
            section_scores: sectionScores,
            completion_time: completionTimeInSeconds, // Use actual time in seconds
            completed_at: new Date().toISOString(),
            total_questions: questionsCount
          }
        ]);

      if (resultsError) {
        console.error("Error inserting quiz_results:", resultsError);
        throw new Error(`Failed to save quiz results: ${resultsError.message}`);
      }
      console.log('Quiz results inserted successfully');

      // Step 3: Update quiz_sessions table
      console.log('Updating session status...');
      if (quizSession?.id) {
        const { error: sessionUpdateError } = await supabase
          .from('quiz_sessions')
          .update({ is_active: false })
          .eq('id', quizSession.id);

        if (sessionUpdateError) {
          console.error("Error updating quiz_sessions:", sessionUpdateError);
          // Don't throw error here as it's not critical
        } else {
          console.log('Session status updated successfully');
        }
      }

      // Remove the toast that shows the score
      // toast({
      //   title: "Quiz Submitted Successfully",
      //   description: `Your score: ${totalScore}/${questionsCount}`,
      // });
      
      // Instead of navigating to admin, show the result screen
      setIsQuizActive(false);
      setShowResultScreen(true);
      
    } catch (error: any) {
      console.error("Quiz submission error:", error);
      toast({
        title: "Submission Error",
        description: error.message || "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen while questions are being fetched
  if (isQuizActive && !questionsLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz questions...</p>
        </div>
      </div>
    );
  }

  // Show result screen after quiz completion
  if (showResultScreen) {
    console.log('Showing results screen');
    
    // Simple thank you modal/prompt instead of detailed results
    return (
      <div className="min-h-screen bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-auto text-center p-8 animate-scale-in">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Quiz Ended</h2>
          <p className="text-lg text-gray-600 mb-6">
            Thank you for participating!
          </p>
          <div className="text-sm text-gray-500">
            Your responses have been submitted successfully.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isQuizActive ? (
        <LoginForm onLogin={handleLogin} />
      ) : questionsLoaded && questions.length > 0 && questions[currentQuestionIndex] ? (
        <AntiCheatProvider>
          <QuizQuestion
            question={questions[currentQuestionIndex]}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            onAnswer={handleAnswerQuestion}
            onTimeUp={handleTimeUp}
          />
        </AntiCheatProvider>
      ) : (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">No questions available</p>
          </div>
        </div>
      )}

      <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">📜 Quiz Rules</DialogTitle>
          </DialogHeader>
          <DialogDescription className="space-y-4 text-sm">
            <p>The quiz has 3 sections with a total of 45 questions.</p>
            
            <div className="space-y-2">
              <p><strong>Section I (15 Questions, Basics)</strong> → Each question has 15 seconds.</p>
              <p><strong>Section II (15 Questions, Mixed Programming MCQs)</strong> → Each question has 15 seconds.</p>
              <p><strong>Section III (15 Questions, Only Programming MCQs)</strong> → Each question has 10 seconds.</p>
            </div>

            <div className="space-y-2">
              <p>• You cannot skip questions once the timer starts.</p>
              <p>• Once a section is completed, you cannot return to it.</p>
              <p>• The timer runs automatically, and unanswered questions will be marked as wrong.</p>
              <p>• Do not switch browser tabs or minimize the window. If detected, your quiz will be immediately submitted.</p>
              <p>• Mobile devices are not allowed. Attempt the quiz only on a laptop or desktop.</p>
              <p>• <strong>If caught cheating, you will be permanently eliminated from the quiz.</strong></p>
            </div>

            <p className="text-center font-medium">Click below to begin the quiz.</p>
          </DialogDescription>
          <DialogFooter className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => setShowRulesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmStart} disabled={isLoading}>
              {isLoading ? "Starting..." : "Begin Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Index;
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Question } from '@/types/quiz';
import QuizQuestion from '@/components/QuizQuestion';
import { useTotalQuestions } from '@/hooks/useTotalQuestions';
import AntiCheatProvider from '@/components/AntiCheatProvider';
import LoginForm from '@/components/LoginForm';
import ResultsScreen from '@/components/ResultsScreen'; // Import ResultsScreen

interface QuizUser {
  id: string;
  email: string;
  access_code: string;
  has_completed: boolean;
  current_question_index: number;
  started_at: string | null;
  completed_at: string | null;
}

interface QuizSession {
  id: string;
  user_id: string;
  is_active: boolean;
  started_at: string;
  last_activity: string;
  answers?: any;
  isCompleted?: boolean;
}

const Index = () => {
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [quizUser, setQuizUser] = useState<QuizUser | null>(null);
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [showResultScreen, setShowResultScreen] = useState(false); // Add state for showing result screen
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null); // Track quiz start time
  const [actualCompletionTime, setActualCompletionTime] = useState<number>(0); // Track actual completion time in seconds
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: totalQuestions } = useTotalQuestions();

  // Function to update session activity
  const updateSessionActivity = async () => {
    if (quizUser?.id) {
      try {
        // Update the user record to trigger the activity update
        const { error } = await supabase
          .from('quiz_users')
          .update({ 
            current_question_index: currentQuestionIndex 
          })
          .eq('id', quizUser.id);

        if (error) {
          console.error('Error updating session activity:', error);
        }
      } catch (error) {
        console.error('Error updating activity:', error);
      }
    }
  };

  // Update activity whenever user answers a question or navigates
  useEffect(() => {
    if (quizSession && quizUser?.has_completed !== true) {
      updateSessionActivity();
    }
  }, [currentQuestionIndex, quizUser?.id]);

  // Update activity every 2 minutes while quiz is active
  useEffect(() => {
    if (quizSession && quizUser?.has_completed !== true) {
      const interval = setInterval(() => {
        updateSessionActivity();
      }, 2 * 60 * 1000); // 2 minutes

      return () => clearInterval(interval);
    }
  }, [quizUser?.has_completed, quizUser?.id]);

  const fetchQuestions = async () => {
    console.log('Fetching questions...');
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('section', { ascending: true })
        .order('difficulty', { ascending: true });

      if (error) {
        console.error("Error fetching questions:", error);
        toast({
          title: "Error",
          description: "Failed to retrieve quiz questions.",
          variant: "destructive",
        })
      } else {
        // Transform database fields to match Question interface
        const transformedQuestions: Question[] = (data || []).map(q => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correct_answer,
          section: q.section as 1 | 2 | 3,
          difficulty: q.difficulty as 'easy' | 'moderate' | 'hard',
          timeLimit: q.time_limit,
          image_url: q.image_url
        }));
        console.log('Questions loaded:', transformedQuestions.length);
        setQuestions(transformedQuestions);
        setAnswers(Array(transformedQuestions.length).fill(null));
        setQuestionsLoaded(true);
      }
    } catch (error) {
      console.error("Unexpected error fetching questions:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching questions.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false);
    }
  };

  const startQuizMutation = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      
      // Step 1: Check if the user already exists and has completed the quiz
      let { data: existingUser, error: userError } = await supabase
        .from('quiz_users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
  
      if (userError && userError.code !== 'PGRST116') {
        console.error("Error checking user:", userError);
        throw new Error("Failed to check user existence.");
      }
  
      // If user exists and has completed the quiz, prevent access
      if (existingUser && existingUser.has_completed) {
        throw new Error("This email has already been used to complete the quiz. Multiple attempts are not allowed.");
      }
  
      let userId;
  
      if (!existingUser) {
        // Step 2: If the user doesn't exist, create a new user
        const { data: newUser, error: newUserError } = await supabase
          .from('quiz_users')
          .insert([{ email, access_code: accessCode }])
          .select('*')
          .single();
  
        if (newUserError) {
          console.error("Error creating user:", newUserError);
          throw new Error("Failed to create new user.");
        }
  
        userId = newUser.id;
        setQuizUser(newUser);
      } else {
        userId = existingUser.id;
        setQuizUser(existingUser);
      }
  
      // Step 3: Check if there's an existing session for the user
      let { data: existingSession, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
  
      if (sessionError && sessionError.code !== 'PGRST116') {
        console.error("Error checking session:", sessionError);
        throw new Error("Failed to check existing session.");
      }
  
      if (existingSession) {
        setQuizSession(existingSession);
        const answersLength = Array.isArray(existingSession.answers) ? existingSession.answers.length : 0;
        setCurrentQuestionIndex(answersLength);
        
        toast({
          title: "Welcome Back",
          description: `Resuming your previous session.`,
        })
      } else {
        // Step 4: If no session exists, create a new session
        const { data: newSession, error: newSessionError } = await supabase
          .from('quiz_sessions')
          .insert([{ user_id: userId, is_active: true, started_at: new Date().toISOString(), last_activity: new Date().toISOString() }])
          .select('*')
          .single();
  
        if (newSessionError) {
          console.error("Error creating session:", newSessionError);
          throw new Error("Failed to create new session.");
        }
  
        setQuizSession(newSession);
        toast({
          title: "Quiz Started",
          description: `Good luck!`,
        })
      }
    },
    onSuccess: async () => {
      await fetchQuestions();
      // Set quiz start time when quiz actually begins
      setQuizStartTime(Date.now());
      // Only set quiz as active after questions are loaded
      setIsQuizActive(true);
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: `${error}`,
        variant: "destructive",
      })
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleLogin = (userEmail: string, userAccessCode: string) => {
    setEmail(userEmail);
    setAccessCode(userAccessCode);
    handleStartQuiz();
  };

  const handleStartQuiz = async () => {
    setShowRulesDialog(true);
  };

  const handleConfirmStart = () => {
    setShowRulesDialog(false);
    startQuizMutation.mutate();
  };

  const handleAnswerQuestion = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleTimeUp = () => {
    // Move to next question automatically when time runs out
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Last question - submit quiz
      handleSubmitQuiz();
    }
  };

  const calculateSectionScores = () => {
    const section1Questions = questions.filter(q => q.section === 1);
    const section2Questions = questions.filter(q => q.section === 2);
    const section3Questions = questions.filter(q => q.section === 3);

    const calculateScore = (questionsInSection: Question[]) => {
        let score = 0;
        questionsInSection.forEach(question => {
            const questionIndex = questions.findIndex(q => q.id === question.id);
            if (questionIndex !== -1 && answers[questionIndex] === question.correctAnswer) {
                score++;
            }
        });
        return score;
    };

    const section1Score = calculateScore(section1Questions);
    const section2Score = calculateScore(section2Questions);
    const section3Score = calculateScore(section3Questions);

    return {
        section1: section1Score,
        section2: section2Score,
        section3: section3Score
    };
  };

  const handleSubmitQuiz = async () => {
    console.log('Starting quiz submission...');
    setIsLoading(true);
    
    // Calculate actual completion time
    const completionTimeInSeconds = quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1000) : 0;
    setActualCompletionTime(completionTimeInSeconds);
    
    try {
      if (!quizUser?.id) {
        throw new Error("No user ID found");
      }

      const sectionScores = calculateSectionScores();
      const totalScore = Object.values(sectionScores).reduce((sum, score) => sum + score, 0);
      const questionsCount = totalQuestions || questions.length;

      console.log('Quiz submission data:', {
        user_id: quizUser.id,
        total_score: totalScore,
        section_scores: sectionScores,
        completion_time: completionTimeInSeconds, // Use actual time in seconds
        total_questions: questionsCount
      });

      // Step 1: Update quiz_users table first
      console.log('Updating user completion status...');
      const { error: userUpdateError } = await supabase
        .from('quiz_users')
        .update({ 
          has_completed: true, 
          completed_at: new Date().toISOString(),
          current_question_index: questions.length 
        })
        .eq('id', quizUser.id);

      if (userUpdateError) {
        console.error("Error updating quiz_users:", userUpdateError);
        throw new Error(`Failed to update user completion status: ${userUpdateError.message}`);
      }
      console.log('User completion status updated successfully');

      // Step 2: Insert into quiz_results table
      console.log('Inserting quiz results...');
      const { error: resultsError } = await supabase
        .from('quiz_results')
        .insert([
          {
            user_id: quizUser.id,
            total_score: totalScore,
            section_scores: sectionScores,
            completion_time: completionTimeInSeconds, // Use actual time in seconds
            completed_at: new Date().toISOString(),
            total_questions: questionsCount
          }
        ]);

      if (resultsError) {
        console.error("Error inserting quiz_results:", resultsError);
        throw new Error(`Failed to save quiz results: ${resultsError.message}`);
      }
      console.log('Quiz results inserted successfully');

      // Step 3: Update quiz_sessions table
      console.log('Updating session status...');
      if (quizSession?.id) {
        const { error: sessionUpdateError } = await supabase
          .from('quiz_sessions')
          .update({ is_active: false })
          .eq('id', quizSession.id);

        if (sessionUpdateError) {
          console.error("Error updating quiz_sessions:", sessionUpdateError);
          // Don't throw error here as it's not critical
        } else {
          console.log('Session status updated successfully');
        }
      }

      // Remove the toast that shows the score
      // toast({
      //   title: "Quiz Submitted Successfully",
      //   description: `Your score: ${totalScore}/${questionsCount}`,
      // });
      
      // Instead of navigating to admin, show the result screen
      setIsQuizActive(false);
      setShowResultScreen(true);
      
    } catch (error: any) {
      console.error("Quiz submission error:", error);
      toast({
        title: "Submission Error",
        description: error.message || "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen while questions are being fetched
  if (isQuizActive && !questionsLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz questions...</p>
        </div>
      </div>
    );
  }

  // Show result screen after quiz completion
  if (showResultScreen) {
    console.log('Showing results screen');
    
    // Create the result object that ResultsScreen expects
    // Convert seconds to minutes for the component
    const result = {
      completionTime: actualCompletionTime / 60, // Convert seconds to minutes for the formatTime function
      // Add any other properties that QuizResult type might require
    };
    
    return <ResultsScreen result={result} />;
  }

  return (
    <>
      {!isQuizActive ? (
        <LoginForm onLogin={handleLogin} />
      ) : questionsLoaded && questions.length > 0 && questions[currentQuestionIndex] ? (
        <AntiCheatProvider>
          <QuizQuestion
            question={questions[currentQuestionIndex]}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            onAnswer={handleAnswerQuestion}
            onTimeUp={handleTimeUp}
          />
        </AntiCheatProvider>
      ) : (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">No questions available</p>
          </div>
        </div>
      )}

      <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">📜 Quiz Rules</DialogTitle>
          </DialogHeader>
          <DialogDescription className="space-y-4 text-sm">
            <p>The quiz has 3 sections with a total of 45 questions.</p>
            
            <div className="space-y-2">
              <p><strong>Section I (15 Questions, Basics)</strong> → Each question has 15 seconds.</p>
              <p><strong>Section II (15 Questions, Mixed Programming MCQs)</strong> → Each question has 15 seconds.</p>
              <p><strong>Section III (15 Questions, Only Programming MCQs)</strong> → Each question has 10 seconds.</p>
            </div>

            <div className="space-y-2">
              <p>• You cannot skip questions once the timer starts.</p>
              <p>• Once a section is completed, you cannot return to it.</p>
              <p>• The timer runs automatically, and unanswered questions will be marked as wrong.</p>
              <p>• Do not switch browser tabs or minimize the window. If detected, your quiz will be immediately submitted.</p>
              <p>• Mobile devices are not allowed. Attempt the quiz only on a laptop or desktop.</p>
              <p>• <strong>If caught cheating, you will be permanently eliminated from the quiz.</strong></p>
            </div>

            <p className="text-center font-medium">Click below to begin the quiz.</p>
          </DialogDescription>
          <DialogFooter className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => setShowRulesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmStart} disabled={isLoading}>
              {isLoading ? "Starting..." : "Begin Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Index;
