import React, { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trophy, Clock } from 'lucide-react';
import { QuizResult } from '../types/quiz';
import { formatCompletionTime } from '@/utils/timeFormat';
import { useRouter } from 'next/router';

interface ResultsScreenProps {
  result: QuizResult;
  userName?: string;
  onRestart?: () => void;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, userName }) => {
  const { completionTime, answers, questions } = result;
  const router = useRouter();

  // ✅ Prevent going back & redirect to login
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = function () {
      router.replace("/login");
    };
  }, [router]);

  // ✅ Fixed scoring logic - proper index-based comparison
  const score = questions.reduce((acc: number, q: any, i: number) => {
    const userAnswer = answers[i];
    const correctAnswer = q.correctAnswer;
    
    // Handle different correctAnswer formats
    let isCorrect = false;
    
    if (typeof correctAnswer === 'number') {
      // If correctAnswer is stored as index (0, 1, 2, 3)
      isCorrect = userAnswer === correctAnswer;
    } else if (typeof correctAnswer === 'string') {
      // If correctAnswer is stored as option ID ('a', 'b', 'c', 'd') or option text
      if (correctAnswer.length === 1 && ['a', 'b', 'c', 'd'].includes(correctAnswer.toLowerCase())) {
        // Convert option letter to index
        const correctIndex = correctAnswer.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0);
        isCorrect = userAnswer === correctIndex;
      } else {
        // If correctAnswer is stored as full option text, compare with user's selected option text
        const userSelectedText = q.options && q.options[userAnswer] ? q.options[userAnswer] : '';
        isCorrect = correctAnswer === userSelectedText;
      }
    }
    
    return isCorrect ? acc + 1 : acc;
  }, 0);

  const appreciationMessages = [
    "🎉 Congratulations on completing the Java Programming Quiz!",
    "🌟 Well done! You've successfully finished all the questions.",
    "👏 Great job completing the quiz! Your effort is commendable.",
    "💪 Excellent work! You've demonstrated your Java programming knowledge.",
    "🚀 Amazing! You've completed the entire quiz successfully."
  ];

  const randomMessage = appreciationMessages[Math.floor(Math.random() * appreciationMessages.length)];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-quiz-surface to-background p-4">
      <div className="w-full max-w-2xl space-y-6 animate-scale-in">
        {/* Main Results Card */}
        <Card className="quiz-card text-center">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-quiz-success/10">
                <Trophy 
                  size={48} 
                  className="text-quiz-success"
                />
              </div>
            </div>
            
            <CardTitle className="text-3xl font-bold text-quiz-surface-foreground">
              Quiz Complete!
            </CardTitle>
            
            <div className="text-xl text-quiz-success font-semibold">
              Thank You{userName ? `, ${userName}` : ''} for Taking the Quiz
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Score */}
            <div className="text-lg font-bold text-quiz-surface-foreground">
              Your Score: {score}/{questions.length}
            </div>

            {/* Completion Time */}
            <div className="flex justify-center items-center space-x-2 text-muted-foreground">
              <Clock size={16} />
              <span>Completed in {formatCompletionTime(completionTime)}</span>
            </div>
            
            {/* Appreciation Message */}
            <div className="p-6 bg-quiz-primary/5 rounded-lg">
              <p className="text-lg text-quiz-surface-foreground font-medium">
                {randomMessage}
              </p>
              <p className="text-muted-foreground mt-3">
                Your responses have been submitted successfully. Thank you for your participation and dedication to learning Java programming concepts.
              </p>
            </div>
            
            {/* Additional Thank You */}
            <div className="text-center">
              <p className="text-quiz-surface-foreground">
                🙏 We appreciate your time and effort in completing this assessment.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResultsScreen;
