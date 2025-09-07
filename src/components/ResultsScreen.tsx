import React, { useEffect } from 'react';
import { Trophy, Clock } from 'lucide-react';

// Define types locally to avoid import issues
interface QuizResult {
  completionTime: number;
  answers: number[];
  questions: any[];
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

// Local time formatting function to replace @/utils/timeFormat
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
      
      // Optional: Clear quiz data and redirect to login
      sessionStorage.removeItem('quizSubmitted');
      sessionStorage.removeItem('quizResult');
      sessionStorage.removeItem('userName');
      
      // If you have a router, redirect to login page
      // For example with React Router: navigate('/login');
      // For now, we'll reload to reset the application state
      window.location.href = '/login'; // Adjust path as needed
    };

    // Add event listener for browser back button
    window.addEventListener('popstate', handlePopState);
    
    // Push current state to prevent immediate back navigation
    window.history.pushState(null, '', window.location.href);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
};

const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, userName }) => {
  const { completionTime, score, totalQuestions, questions } = result;
  
  // Use navigation guard to prevent back navigation
  useNavigationGuard();

  // Calculate score if not provided (using fixed evaluation logic)
  const calculatedScore = score !== undefined ? score : (() => {
    if (!result.answers || !questions) return 0;
    
    return result.answers.reduce((total, userAnswerId, index) => {
      const question = questions[index];
      if (!question) return total;
      
      // Use ID-based comparison instead of text comparison
      const correctAnswerId = question.correctAnswerId || question.correctAnswer;
      return total + (userAnswerId === correctAnswerId ? 1 : 0);
    }, 0);
  })();

  const totalQs = totalQuestions || questions?.length || result.answers?.length || 0;
  const percentage = totalQs > 0 ? Math.round((calculatedScore / totalQs) * 100) : 0;

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
            {/* Score Display */}
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gray-800">
                {calculatedScore}/{totalQs}
              </div>
              <div className="text-lg text-gray-600">
                Score: {percentage}%
              </div>
              <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                percentage >= 80 ? 'bg-green-100 text-green-800' :
                percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {percentage >= 80 ? 'Excellent!' : 
                 percentage >= 60 ? 'Good Job!' : 'Keep Learning!'}
              </div>
            </div>

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

            {/* Navigation Note */}
            <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
              <p>
                📝 <strong>Note:</strong> Your quiz has been submitted and cannot be retaken. 
                Use the browser's navigation to return to the main application.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResultsScreen;
