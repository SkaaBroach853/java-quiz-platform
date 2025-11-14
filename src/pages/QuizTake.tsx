import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AntiCheatProvider } from '@/components/AntiCheatProvider';
import QuizWrapper from '@/components/QuizWrapper';
import ResultsScreen from '@/components/ResultsScreen';
import { Question } from '@/types/quiz';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const QuizTake = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const quizLink = searchParams.get('link');

  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !quizLink) {
      navigate('/auth');
      return;
    }

    loadQuiz();
  }, [user, quizLink]);

  const loadQuiz = async () => {
    try {
      // Load quiz by unique link
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('unique_link', quizLink)
        .eq('status', 'active')
        .single();

      if (quizError || !quizData) {
        toast.error('Quiz not found or inactive');
        navigate('/');
        return;
      }

      setQuiz(quizData);

      // Load questions for this quiz
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizData.id)
        .order('section', { ascending: true });

      if (questionsError) throw questionsError;

      // Map database fields to Question type
      const mappedQuestions: Question[] = (questionsData || []).map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correct_answer,
        section: q.section as 1 | 2 | 3,
        difficulty: q.difficulty as 'easy' | 'moderate' | 'hard',
        timeLimit: q.time_limit,
        image_url: q.image_url || undefined,
      }));
      
      setQuestions(mappedQuestions);
      setAnswers(new Array(mappedQuestions.length).fill(null));

      // Create quiz session
      const { data: sessionData, error: sessionError } = await supabase
        .from('quiz_sessions')
        .insert({
          user_id: user!.id,
          started_at: new Date().toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      setSessionId(sessionData.id);

      setLoading(false);

      // Enter fullscreen
      enterFullscreen();
    } catch (error: any) {
      toast.error('Failed to load quiz');
      console.error(error);
      navigate('/');
    }
  };

  const enterFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.log('Fullscreen request failed:', err);
      });
    }
  };

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setAnswers(newAnswers);

    // Save progress
    saveProgress(newAnswers);

    // Move to next question or complete
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      completeQuiz(newAnswers);
    }
  };

  const saveProgress = async (currentAnswers: (number | null)[]) => {
    if (!sessionId) return;

    await supabase
      .from('quiz_sessions')
      .update({
        answers: currentAnswers,
        last_activity: new Date().toISOString(),
      })
      .eq('id', sessionId);
  };

  const completeQuiz = async (finalAnswers: (number | null)[]) => {
    if (!quiz || !sessionId) return;

    try {
      // Calculate scores
      let totalScore = 0;
      const sectionScores = { section1: 0, section2: 0, section3: 0 };

      questions.forEach((question, index) => {
        if (finalAnswers[index] === question.correctAnswer) {
          totalScore++;
          if (question.section === 1) sectionScores.section1++;
          if (question.section === 2) sectionScores.section2++;
          if (question.section === 3) sectionScores.section3++;
        }
      });

      // Save results
      await supabase.from('quiz_results').insert({
        user_id: user!.id,
        quiz_id: quiz.id,
        total_score: totalScore,
        total_questions: questions.length,
        section_scores: sectionScores,
        completed_at: new Date().toISOString(),
      });

      // Mark session as completed
      await supabase
        .from('quiz_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      setIsCompleted(true);

      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    } catch (error: any) {
      toast.error('Failed to save results');
      console.error(error);
    }
  };

  const handleTimeUp = () => {
    handleAnswer(-1); // Mark as unanswered
  };

  const handleAutoSubmit = () => {
    completeQuiz(answers);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isCompleted) {
    const totalScore = answers.filter((a, i) => a === questions[i]?.correctAnswer).length;
    
    const result = {
      email: user?.email || '',
      totalScore,
      sectionScores: {
        section1: questions
          .filter((q) => q.section === 1)
          .filter((q, i) => answers[questions.indexOf(q)] === q.correctAnswer).length,
        section2: questions
          .filter((q) => q.section === 2)
          .filter((q, i) => answers[questions.indexOf(q)] === q.correctAnswer).length,
        section3: questions
          .filter((q) => q.section === 3)
          .filter((q, i) => answers[questions.indexOf(q)] === q.correctAnswer).length,
      },
      completionTime: 0,
      completedAt: new Date(),
    };

    return <ResultsScreen result={result} userName={user?.email} />;
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <AntiCheatProvider
      userEmail={user?.email || ''}
      userId={user?.id || ''}
      currentQuestionNumber={currentQuestionIndex + 1}
      onAutoSubmit={handleAutoSubmit}
    >
      <div className="min-h-screen bg-background">
        <QuizWrapper
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          onAnswer={handleAnswer}
          onTimeUp={handleTimeUp}
        />
      </div>
    </AntiCheatProvider>
  );
};

export default QuizTake;
