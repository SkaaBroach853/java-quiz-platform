import React, { useEffect } from 'react';
import { Trophy, Clock } from 'lucide-react';

// Define types locally to avoid import issues
interface QuizResult {
  completionTime: number;
  answers: number[];
  questions?: any[];
  score?: number;
  totalQuestions?: number;
}

interface ResultsScreenProps {
  result: QuizResult;
  userName?: string;
  onRestart?: () => void;
}

// Local Card components to replace @/components/ui/card
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`bg-white rounded-lg shadow-lg border ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <h2 className={`text-2xl font-bold ${className}`}>
    {children}
  </h2>
);

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`p-6 pt-0 ${className}`}>
    {children}
  </div>
);

// Local time formatting function
const formatCompletionTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

// Enhanced navigation guard with stronger protection
const useNavigationGuard = () => {
  useEffect(() => {
    // Mark quiz as submitted immediately
    sessionStorage.setItem('quizSubmitted', 'true');
    sessionStorage.setItem('quizCompletedAt', new Date().toISOString());
    
    // Disable browser back button
    const preventBack = () => {
      window.history.forward();
    };
    
    const handlePopState = (event: PopStateEvent) => {
      // Always prevent going back
      event.preventDefault();
      event.stopPropagation();
      
      // Force forward navigation
      window.history.pushState(null, '', window.location.href);
      
      // Show alert to user
      alert('Quiz has been submitted. You cannot go back to retake the quiz. Please use the application navigation.');
      
      // Optional: Clear all quiz data
      sessionStorage.removeItem('currentQuiz');
      sessionStorage.removeItem('quizAnswers');
      sessionStorage.removeItem('quizStartTime');
      
      return false;
    };

    // Multiple layers of protection
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', preventBack);
    
    // Push multiple states to make back harder
    for (let i = 0; i < 3; i++) {
      window.history.pushState(null, '', window.location.href);
    }
    
    // Disable right-click context menu
    const disableRightClick = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };
    
    document.addEventListener('contextmenu', disableRightClick);
    
    // Disable certain keyboard shortcuts
    const disableKeys = (e: KeyboardEvent) => {
      // Disable F5, Ctrl+R, Ctrl+F5 (refresh)
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.ctrlKey && e.key === 'R')) {
        e.preventDefault();
        e.stopPropagation();
        alert('Page refresh is disabled after quiz submission.');
        return false;
      }
      
      // Disable backspace navigation
      if (e.key === 'Backspace' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        return false;
      }
    };
    
    document.addEventListener('keydown', disableKeys);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', preventBack);
      document.removeEventListener('contextmenu', disableRightClick);
      document.removeEventListener('keydown', disableKeys);
    };
  }, []);
};

const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, userName }) => {
  // Use enhanced navigation guard
  useNavigationGuard();

  // Get quiz data from various sources
  const getQuizData = () => {
    // Try to get from props first
    if (result?.questions && result.answers) {
      return {
        questions: result.questions,
        answers: result.answers,
        totalQuestions: result.questions.length
      };
    }
    
    // Try to get from sessionStorage
    try {
      const storedQuestions = sessionStorage.getItem('quizQuestions');
      const storedAnswers = sessionStorage.getItem('quizAnswers') || sessionStorage.getItem('userAnswers');
      
      if (storedQuestions && storedAnswers) {
        const questions = JSON.parse(storedQuestions);
        const answers = JSON.parse(storedAnswers);
        
        return {
          questions,
          answers: Array.isArray(answers) ? answers : Object.values(answers),
          totalQuestions: questions.length
        };
      }
    } catch (error) {
      console.error('Error parsing stored quiz data:', error);
    }
    
    // Fallback: assume some default values
    return {
      questions: [],
      answers: result?.answers || [],
      totalQuestions: result?.totalQuestions || result?.answers?.length || 0
    };
  };

  const { questions, answers, totalQuestions } = getQuizData();

  // Calculate score with proper ID-based evaluation
  const calculateScore = () => {
    if (result?.score !== undefined) {
      return result.score;
    }
    
    if (!questions || !answers || questions.length === 0) {
      return 0;
    }
    
    let score = 0;
    
    for (let i = 0; i < Math.min(questions.length, answers.length); i++) {
      const question = questions[i];
      const userAnswer = answers[i];
      
      if (!question) continue;
      
      // Multiple ways to check correct answer
      const correctAnswer = question.correctAnswerId || 
                           question.correctAnswer || 
                           question.correct_answer_id || 
                           question.answer;
      
      // Compare using various methods
      if (userAnswer === correctAnswer || 
          parseInt(userAnswer) === parseInt(correctAnswer) ||
          userAnswer === question.options?.findIndex(opt => opt.isCorrect)) {
        score++;
      }
    }
    
    return score;
  };

  const calculatedScore = calculateScore();
  const totalQs = totalQuestions || questions?.length || 0;
  const percentage = totalQs > 0 ? Math.round((calculatedScore / totalQs) * 100) : 0;
  
  // Store final results
  useEffect(() => {
    const finalResult = {
      score: calculatedScore,
      totalQuestions: totalQs,
      percentage,
      completionTime: result?.completionTime || 0,
      submittedAt: new Date().toISOString(),
      userName: userName || 'Anonymous'
    };
    
    sessionStorage.setItem('finalQuizResult', JSON.stringify(finalResult));
  }, [calculatedScore, totalQs, percentage, result?.completionTime, userName]);

  const appreciationMessages = [
    "🎉 Congratulations on completing the Java Programming Quiz!",
    "🌟 Well done! You've successfully finished all the questions.",
    "👏 Great job completing the quiz! Your effort is commendable.",
    "💪 Excellent work! You've demonstrated your Java programming knowledge.",
    "🚀 Amazing! You've completed the entire quiz successfully."
  ];

  const randomMessage = appreciationMessages[Math.floor(Math.random() * appreciationMessages.length)];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Main Results Card */}
        <Card className="text-center">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-green-100">
                <Trophy 
                  size={48} 
                  className="text-green-600"
                />
              </div>
            </div>
            
            <CardTitle className="text-3xl font-bold text-gray-800">
              Quiz Complete!
            </CardTitle>
            
            <div className="text-xl text-green-600 font-semibold">
              Thank You{userName ? `, ${userName}` : ''} for Taking the Quiz
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* No Score Display - Hidden from user */}

            {/* Completion Time */}
            <div className="flex justify-center items-center space-x-2 text-gray-500">
              <Clock size={16} />
              <span>Completed in {formatCompletionTime(result?.completionTime || 0)}</span>
            </div>
            
            {/* Appreciation Message */}
            <div className="p-6 bg-blue-50 rounded-lg">
              <p className="text-lg text-gray-800 font-medium">
                {randomMessage}
              </p>
              <p className="text-gray-500 mt-3">
                Your responses have been submitted successfully. Thank you for your participation 
                and dedication to learning Java programming concepts.
              </p>
            </div>
            
            {/* Additional Thank You */}
            <div className="text-center">
              <p className="text-gray-800">
                🙏 We appreciate your time and effort in completing this assessment.
              </p>
            </div>

            {/* Strong Navigation Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-yellow-800">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-semibold">Quiz Submitted Successfully</p>
                  <p className="text-sm text-yellow-700">
                    Your quiz has been submitted and cannot be retaken. Browser navigation back 
                    to the quiz is disabled for security purposes.
                  </p>
                </div>
              </div>
            </div>

            {/* Debug Info (remove in production) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-gray-100 p-4 rounded text-xs text-left">
                <p><strong>Debug Info:</strong></p>
                <p>Calculated Score: {calculatedScore}</p>
                <p>Total Questions: {totalQs}</p>
                <p>Percentage: {percentage}%</p>
                <p>Answers: {JSON.stringify(answers)}</p>
                <p>Has Questions: {questions?.length > 0 ? 'Yes' : 'No'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResultsScreen;
