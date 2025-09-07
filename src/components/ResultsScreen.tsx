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

// Navigation guard to prevent going back to quiz
const useNavigationGuard = () => {
  useEffect(() => {
    // Mark quiz as submitted
    sessionStorage.setItem('quizSubmitted', 'true');
    
    const handlePopState = (event: PopStateEvent) => {
      // Prevent going back to quiz, redirect to login instead
      event.preventDefault();
      window.history.pushState(null, '', window.location.href);
      
      // Clear quiz data and redirect
      sessionStorage.removeItem('quizSubmitted');
      sessionStorage.removeItem('quizResult');
      sessionStorage.removeItem('userName');
      
      // Alert user
      alert('Quiz has been submitted and cannot be retaken. Redirecting to main page.');
      
      // Redirect to login or home page
      setTimeout(() => {
        window.location.href = '/'; // Change this to your login page URL
      }, 1000);
    };

    // Add event listener for browser back button
    window.addEventListener('popstate', handlePopState);
    
    // Push current state to prevent immediate back navigation
    window.history.pushState(null, '', window.location.href);

    // Disable certain keyboard shortcuts
    const disableKeys = (e: KeyboardEvent) => {
      // Disable F5, Ctrl+R, Ctrl+F5 (refresh)
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.ctrlKey && e.key === 'R')) {
        e.preventDefault();
        alert('Page refresh is disabled after quiz submission.');
        return false;
      }
      
      // Disable backspace navigation
      if (e.key === 'Backspace' && 
          (e.target as HTMLElement).tagName !== 'INPUT' && 
          (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        return false;
      }
    };
    
    document.addEventListener('keydown', disableKeys);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('keydown', disableKeys);
    };
  }, []);
};

const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, userName }) => {
  const { completionTime } = result;
  
  // Use navigation guard to prevent back navigation
  useNavigationGuard();

  // Store submission data for backend/admin tracking (but don't show to user)
  useEffect(() => {
    // This is for admin/backend use only - calculate and store score
    const storeResultsForAdmin = async () => {
      try {
        let calculatedScore = 0;
        let totalQuestions = 0;
        
        // Get quiz data from various possible sources
        const getStoredData = () => {
          // Try different storage keys your app might use
          const possibleKeys = [
            'quizQuestions', 'questions', 'currentQuiz', 'quizData',
            'quiz_questions', 'allQuestions', 'questionsData'
          ];
          
          const answerKeys = [
            'quizAnswers', 'userAnswers', 'answers', 'selectedAnswers',
            'quiz_answers', 'user_answers', 'quizResponses'
          ];
          
          let questions = result?.questions || [];
          let answers = result?.answers || [];
          
          // Try sessionStorage for questions
          if (questions.length === 0) {
            for (const key of possibleKeys) {
              try {
                const data = sessionStorage.getItem(key);
                if (data) {
                  const parsed = JSON.parse(data);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    questions = parsed;
                    break;
                  }
                }
              } catch (e) {
                continue;
              }
            }
          }
          
          // Try sessionStorage for answers
          if (answers.length === 0) {
            for (const key of answerKeys) {
              try {
                const data = sessionStorage.getItem(key);
                if (data) {
                  const parsed = JSON.parse(data);
                  if (Array.isArray(parsed)) {
                    answers = parsed;
                    break;
                  } else if (typeof parsed === 'object') {
                    answers = Object.values(parsed);
                    break;
                  }
                }
              } catch (e) {
                continue;
              }
            }
          }
          
          return { questions, answers };
        };
        
        const { questions, answers } = getStoredData();
        totalQuestions = questions.length;
        
        // Calculate score using proper ID-based comparison
        if (questions.length > 0 && answers.length > 0) {
          for (let i = 0; i < Math.min(questions.length, answers.length); i++) {
            const question = questions[i];
            const userAnswer = answers[i];
            
            if (question && userAnswer !== undefined && userAnswer !== null) {
              // Get correct answer - try multiple possible field names
              const correctAnswer = 
                question.correctAnswerId || 
                question.correctAnswer || 
                question.correct_answer_id ||
                question.correct_answer ||
                question.answer;
              
              // Compare using ID-based matching (not text)
              if (parseInt(userAnswer) === parseInt(correctAnswer)) {
                calculatedScore++;
              }
            }
          }
        }
        
        // Store complete results for admin/backend (hidden from user)
        const adminResult = {
          score: calculatedScore,
          totalQuestions,
          percentage: totalQuestions > 0 ? Math.round((calculatedScore / totalQuestions) * 100) : 0,
          completionTime: completionTime || 0,
          submittedAt: new Date().toISOString(),
          userName: userName || 'Anonymous',
          answers: answers,
          questions: questions.map(q => ({
            id: q.id,
            question: q.question,
            correctAnswer: q.correctAnswerId || q.correctAnswer || q.answer
          }))
        };
        
        // Store in sessionStorage for admin panel access
        sessionStorage.setItem('adminQuizResult', JSON.stringify(adminResult));
        
        // If you have an API endpoint to submit results, call it here:
        // await fetch('/api/submit-quiz-results', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(adminResult)
        // });
        
      } catch (error) {
        console.error('Error storing quiz results:', error);
      }
    };
    
    storeResultsForAdmin();
  }, [result, userName, completionTime]);

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
            {/* Completion Time */}
            <div className="flex justify-center items-center space-x-2 text-gray-500">
              <Clock size={16} />
              <span>Completed in {formatCompletionTime(completionTime)}</span>
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

            {/* Important Notice */}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResultsScreen;
