
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trophy, Clock } from 'lucide-react';
import { QuizResult } from '../types/quiz';
import { formatTime, minutesToSeconds } from '@/utils/timeFormat';

interface ResultsScreenProps {
  result: QuizResult;
  onRestart?: () => void;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ result }) => {
  const { completionTime } = result;

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
              Thank You for Taking the Quiz
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Completion Time */}
            <div className="flex justify-center items-center space-x-2 text-muted-foreground">
              <Clock size={16} />
              <span>Completed in {formatTime(minutesToSeconds(completionTime))}</span>
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
