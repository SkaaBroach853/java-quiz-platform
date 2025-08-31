
import React, { useState, useEffect } from 'react';
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
import QuizContent from '@/components/QuizContent';
import { useTotalQuestions } from '@/hooks/useTotalQuestions';

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
  const [showRulesDialog, setShowRulesDialog] = useState(false);
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
        setQuestions(transformedQuestions);
        setAnswers(Array(transformedQuestions.length).fill(null));
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
      // Step 1: Check if the user exists
      let { data: existingUser, error: userError } = await supabase
        .from('quiz_users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
  
      if (userError && userError.code !== 'PGRST116') {
        console.error("Error checking user:", userError);
        throw new Error("Failed to check user existence.");
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
        setIsQuizActive(true);
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
        setIsQuizActive(true);
        toast({
          title: "Quiz Started",
          description: `Good luck!`,
        })
      }
    },
    onSuccess: () => {
      fetchQuestions();
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: `Failed to start quiz: ${error}`,
        variant: "destructive",
      })
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

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

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
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
    setIsLoading(true);
    try {
      const sectionScores = calculateSectionScores();
      const totalScore = Object.values(sectionScores).reduce((sum, score) => sum + score, 0);
      const completionTime = 25; // TODO: track real time

      // Step 1: Update quiz_users table
      const { error: userUpdateError } = await supabase
        .from('quiz_users')
        .update({ has_completed: true, completed_at: new Date().toISOString() })
        .eq('id', quizUser?.id);

      if (userUpdateError) {
        console.error("Error updating quiz_users:", userUpdateError);
        throw new Error("Failed to update user completion status.");
      }

      // Step 2: Insert into quiz_results table
      const { error: resultsError } = await supabase
        .from('quiz_results')
        .insert([
          {
            user_id: quizUser?.id,
            total_score: totalScore,
            section_scores: sectionScores,
            completion_time: completionTime,
            completed_at: new Date().toISOString(),
            total_questions: totalQuestions || questions.length
          }
        ]);

      if (resultsError) {
        console.error("Error inserting quiz_results:", resultsError);
        throw new Error("Failed to save quiz results.");
      }

      // Step 3: Update quiz_sessions table
      const { error: sessionUpdateError } = await supabase
        .from('quiz_sessions')
        .update({ is_active: false })
        .eq('id', quizSession?.id);

      if (sessionUpdateError) {
        console.error("Error updating quiz_sessions:", sessionUpdateError);
        throw new Error("Failed to update session status.");
      }

      toast({
        title: "Quiz Submitted",
        description: `Your score: ${totalScore}/${totalQuestions || questions.length}`,
      })
      setIsQuizActive(false);
      navigate('/admin');
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Error",
        description: `Failed to submit quiz: ${error}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      {!isQuizActive ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-blue-600 text-2xl font-bold">QuizPlat</CardTitle>
            <CardDescription className="text-center">Enter your details to begin the quiz.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accessCode">Access Code</Label>
              <Input
                type="text"
                id="accessCode"
                placeholder="Enter access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
              />
            </div>
            <Button onClick={handleStartQuiz} disabled={isLoading}>
              {isLoading ? "Loading..." : "Start Quiz"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <QuizContent
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          answers={answers}
          onAnswerQuestion={handleAnswerQuestion}
          onNextQuestion={handleNextQuestion}
          onPreviousQuestion={handlePreviousQuestion}
          onSubmitQuiz={handleSubmitQuiz}
          isLoading={isLoading}
        />
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
    </div>
  );
};

export default Index;
