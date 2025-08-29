export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  section: 1 | 2 | 3;
  difficulty: 'easy' | 'moderate' | 'hard';
  timeLimit: number; // in seconds
  image_url?: string; // Optional image URL for questions
}

export interface QuizSession {
  email: string;
  accessCode: string;
  currentQuestionIndex: number;
  answers: (number | null)[];
  startTime: Date;
  sectionScores: {
    section1: number;
    section2: number;
    section3: number;
  };
  isCompleted: boolean;
}

export interface QuizResult {
  email: string;
  totalScore: number;
  sectionScores: {
    section1: number;
    section2: number;
    section3: number;
  };
  completionTime: number; // in minutes
  completedAt: Date;
}
