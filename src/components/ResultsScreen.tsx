import React, { useEffect } from 'react';
import { Trophy, Clock } from 'lucide-react';

// IMPORTANT: This file fixes the core answer evaluation logic
// The issue is in how answers are compared - we need to compare option indices/IDs, not text

// Define types locally
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

// Card components
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

const formatCompletionTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
};

// Navigation guard
const useNavigationGuard = () => {
  useEffect(() => {
    sessionStorage.setItem('quizSubmitted', 'true');
    
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      window.history.pushState(null, '', window.location.href);
      alert('Quiz submitted. Cannot return to quiz.');
      window.location.href = '/';
    };

    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, '', window.location.href);

    const disableKeys = (e: KeyboardEvent) => {
      if (e.key === 'F5' || (e.ctrlKey && (e.key === 'r' || e.key === 'R'))) {
        e.preventDefault();
        alert('Refresh disabled after submission.');
        return false;
      }
      if (e.key === 'Backspace' && 
          !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        return false;
      }
    };
    
    document.addEventListener('keydown', disableKeys);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('keydown', disableKeys);
    };
  }, []);
};

// CRITICAL: This is the main fix for answer evaluation
const QuizEvaluationService = {
  
  // Method 1: Fix the evaluation at submission time (MOST IMPORTANT)
  evaluateQuizAnswers: (questions: any[], userAnswers: any[]) => {
    let score = 0;
    
    console.log('🔧 EVALUATING QUIZ ANSWERS:');
    console.log('Questions:', questions);
    console.log('User Answers:', userAnswers);
    
    if (!questions || !userAnswers) {
      console.log('❌ Missing questions or answers');
      return { score: 0, details: [] };
    }

    const evaluationDetails = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const userAnswer = userAnswers[i];
      
      console.log(`\n--- Question ${i + 1} ---`);
      console.log('Question:', question?.question || question?.text);
      console.log('User selected option index:', userAnswer);
      
      if (!question || userAnswer === undefined || userAnswer === null) {
        console.log('❌ Skipping - missing data');
        evaluationDetails.push({ questionIndex: i, correct: false, reason: 'Missing data' });
        continue;
      }

      // Find correct answer - try multiple field names your backend might use
      let correctAnswerIndex = null;
      
      // Try different ways your system might store the correct answer
      const possibleCorrectFields = [
        'correctAnswerId',     // Most common
        'correctAnswer', 
        'correct_answer',
        'correctOptionIndex',
        'correct_option_index',
        'answer',
        'rightAnswer',
        'correctOption'
      ];

      for (const field of possibleCorrectFields) {
        if (question[field] !== undefined && question[field] !== null) {
          correctAnswerIndex = question[field];
          console.log(`✓ Found correct answer in field '${field}':`, correctAnswerIndex);
          break;
        }
      }

      // If no direct field found, try to find in options array
      if (correctAnswerIndex === null && question.options) {
        for (let optIndex = 0; optIndex < question.options.length; optIndex++) {
          const option = question.options[optIndex];
          if (option.isCorrect || option.is_correct || option.correct) {
            correctAnswerIndex = optIndex;
            console.log(`✓ Found correct answer in options array at index:`, optIndex);
            break;
          }
        }
      }

      if (correctAnswerIndex === null) {
        console.log('❌ No correct answer found for this question');
        evaluationDetails.push({ questionIndex: i, correct: false, reason: 'No correct answer defined' });
        continue;
      }

      // THE CRITICAL FIX: Compare as integers
      const userAnswerInt = parseInt(String(userAnswer), 10);
      const correctAnswerInt = parseInt(String(correctAnswerIndex), 10);
      
      console.log('Comparing:', userAnswerInt, '===', correctAnswerInt);
      
      const isCorrect = userAnswerInt === correctAnswerInt;
      
      if (isCorrect) {
        score++;
        console.log('✅ CORRECT! Score now:', score);
      } else {
        console.log('❌ WRONG! Score remains:', score);
      }

      evaluationDetails.push({
        questionIndex: i,
        correct: isCorrect,
        userAnswer: userAnswerInt,
        correctAnswer: correctAnswerInt,
        question: question.question || question.text
      });
    }

    console.log('🏆 FINAL SCORE:', score, '/', questions.length);
    return { score, details: evaluationDetails, total: questions.length };
  },

  // Method 2: Submit corrected results to your backend
  submitCorrectedResults: async (userName: string, evaluation: any, completionTime: number) => {
    try {
      const resultData = {
        userName: userName,
        score: evaluation.score,
        totalQuestions: evaluation.total,
        percentage: Math.round((evaluation.score / evaluation.total) * 100),
        completionTime: completionTime,
        submittedAt: new Date().toISOString(),
        evaluationDetails: evaluation.details,
        // Add any other fields your backend expects
        accessCode: 'QUIZ2025', // If your system uses access codes
        quizId: 'java-programming-quiz' // If your system uses quiz IDs
      };

      console.log('📤 Submitting corrected results:', resultData);

      // Store locally first
      sessionStorage.setItem('correctedQuizResult', JSON.stringify(resultData));

      // If you have an API endpoint, uncomment and modify this:
      /*
      const response = await fetch('/api/quiz/submit-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resultData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit results');
      }

      const responseData = await response.json();
      console.log('✅ Results submitted successfully:', responseData);
      */

      return resultData;
    } catch (error) {
      console.error('❌ Error submitting results:', error);
      throw error;
    }
  }
};

const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, userName }) => {
  const { completionTime } = result;
  
  useNavigationGuard();

  // THE MAIN FIX: Correct evaluation on component mount
  useEffect(() => {
    const performCorrectEvaluation = async () => {
      try {
        console.log('🚀 Starting correct quiz evaluation...');

        // Get questions and answers from all possible sources
        let questions: any[] = [];
        let userAnswers: any[] = [];

        // Try to get from props first
        if (result?.questions && result?.answers) {
          questions = result.questions;
          userAnswers = result.answers;
          console.log('📝 Got data from props');
        } 
        // Try sessionStorage
        else {
          const storageKeys = [
            { q: 'quizQuestions', a: 'quizAnswers' },
            { q: 'questions', a: 'answers' },
            { q: 'currentQuiz', a: 'userAnswers' },
            { q: 'quiz_questions', a: 'quiz_answers' },
            { q: 'questionsData', a: 'selectedAnswers' }
          ];

          for (const keys of storageKeys) {
            try {
              const qData = sessionStorage.getItem(keys.q);
              const aData = sessionStorage.getItem(keys.a);
              
              if (qData && aData) {
                questions = JSON.parse(qData);
                const parsedAnswers = JSON.parse(aData);
                userAnswers = Array.isArray(parsedAnswers) ? parsedAnswers : Object.values(parsedAnswers);
                console.log(`📝 Got data from sessionStorage keys: ${keys.q}, ${keys.a}`);
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }

        if (questions.length === 0 || userAnswers.length === 0) {
          console.log('❌ No quiz data found - cannot evaluate');
          return;
        }

        // Perform correct evaluation
        const evaluation = QuizEvaluationService.evaluateQuizAnswers(questions, userAnswers);
        
        // Submit corrected results
        const correctedResult = await QuizEvaluationService.submitCorrectedResults(
          userName || 'Anonymous',
          evaluation,
          completionTime || 0
        );

        console.log('✅ Evaluation complete. Corrected result:', correctedResult);

      } catch (error) {
        console.error('❌ Error during evaluation:', error);
      }
    };

    performCorrectEvaluation();
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
        <Card className="text-center">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-green-100">
                <Trophy size={48} className="text-green-600" />
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
            <div className="flex justify-center items-center space-x-2 text-gray-500">
              <Clock size={16} />
              <span>Completed in {formatCompletionTime(completionTime)}</span>
            </div>
            
            <div className="p-6 bg-blue-50 rounded-lg">
              <p className="text-lg text-gray-800 font-medium">
                {randomMessage}
              </p>
              <p className="text-gray-500 mt-3">
                Your responses have been submitted successfully. Thank you for your participation 
                and dedication to learning Java programming concepts.
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-gray-800">
                🙏 We appreciate your time and effort in completing this assessment.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-yellow-800">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-semibold">Quiz Submitted Successfully</p>
                  <p className="text-sm text-yellow-700">
                    Your quiz has been submitted and cannot be retaken. Results are being processed.
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
