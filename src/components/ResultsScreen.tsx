
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, CheckCircle, XCircle, Clock } from 'lucide-react';
import { QuizResult } from '../types/quiz';

interface ResultsScreenProps {
  result: QuizResult;
  onRestart?: () => void;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, onRestart }) => {
  const { totalScore, sectionScores, completionTime } = result;
  const percentage = Math.round((totalScore / 45) * 100);
  
  const getGradeColor = (score: number, total: number) => {
    const percent = (score / total) * 100;
    if (percent >= 80) return 'text-quiz-success';
    if (percent >= 60) return 'text-quiz-warning';
    return 'text-destructive';
  };

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes % 1) * 60);
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-quiz-surface to-background p-4">
      <div className="w-full max-w-2xl space-y-6 animate-scale-in">
        {/* Main Results Card */}
        <Card className="quiz-card text-center">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <div className={`p-4 rounded-full ${percentage >= 70 ? 'bg-quiz-success/10' : 'bg-quiz-warning/10'}`}>
                <Trophy 
                  size={48} 
                  className={percentage >= 70 ? 'text-quiz-success' : 'text-quiz-warning'}
                />
              </div>
            </div>
            
            <CardTitle className="text-3xl font-bold text-quiz-surface-foreground">
              Quiz Complete!
            </CardTitle>
            
            <div className="space-y-2">
              <div className={`text-5xl font-bold ${getGradeColor(totalScore, 45)}`}>
                {totalScore}/45
              </div>
              <div className="text-xl text-muted-foreground">
                {percentage}% Correct
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Section Breakdown */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <h3 className="font-medium text-quiz-success">Easy</h3>
                <div className={`text-2xl font-bold ${getGradeColor(sectionScores.section1, 15)}`}>
                  {sectionScores.section1}/15
                </div>
                <div className="text-sm text-muted-foreground">
                  {Math.round((sectionScores.section1 / 15) * 100)}%
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium text-quiz-warning">Moderate</h3>
                <div className={`text-2xl font-bold ${getGradeColor(sectionScores.section2, 15)}`}>
                  {sectionScores.section2}/15
                </div>
                <div className="text-sm text-muted-foreground">
                  {Math.round((sectionScores.section2 / 15) * 100)}%
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium text-destructive">Hard</h3>
                <div className={`text-2xl font-bold ${getGradeColor(sectionScores.section3, 15)}`}>
                  {sectionScores.section3}/15
                </div>
                <div className="text-sm text-muted-foreground">
                  {Math.round((sectionScores.section3 / 15) * 100)}%
                </div>
              </div>
            </div>
            
            {/* Performance Metrics */}
            <div className="flex justify-center items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Clock size={16} />
                <span>Completed in {formatTime(completionTime)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={16} className="text-quiz-success" />
                <span>{totalScore} Correct</span>
              </div>
              <div className="flex items-center space-x-2">
                <XCircle size={16} className="text-destructive" />
                <span>{45 - totalScore} Incorrect</span>
              </div>
            </div>
            
            {/* Congratulations Message */}
            <div className="p-4 bg-quiz-primary/5 rounded-lg">
              <p className="text-quiz-surface-foreground">
                {percentage >= 90 
                  ? "🎉 Outstanding performance! You've mastered Java programming concepts."
                  : percentage >= 80
                  ? "🌟 Excellent work! You have a strong understanding of Java."
                  : percentage >= 70
                  ? "👏 Good job! You've demonstrated solid Java knowledge."
                  : percentage >= 60
                  ? "📚 Not bad! Consider reviewing the concepts you missed."
                  : "💪 Keep practicing! Review the fundamentals and try again."
                }
              </p>
            </div>
            
            {onRestart && percentage < 70 && (
              <Button onClick={onRestart} className="quiz-button-primary">
                Try Again
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResultsScreen;
