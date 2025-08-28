
import { Question } from '../types/quiz';

export const sampleQuestions: Question[] = [
  // Section 1: Easy Questions (15 seconds each)
  {
    id: '1',
    question: 'What is the correct syntax for a Java main method?',
    options: [
      'public static void main(String[] args)',
      'public void main(String[] args)',
      'static void main(String[] args)',
      'public main(String[] args)'
    ],
    correctAnswer: 0,
    section: 1,
    difficulty: 'easy',
    timeLimit: 15
  },
  {
    id: '2',
    question: 'Which keyword is used to create a class in Java?',
    options: ['class', 'Class', 'create', 'new'],
    correctAnswer: 0,
    section: 1,
    difficulty: 'easy',
    timeLimit: 15
  },
  {
    id: '3',
    question: 'What is the extension of Java source files?',
    options: ['.java', '.class', '.jar', '.exe'],
    correctAnswer: 0,
    section: 1,
    difficulty: 'easy',
    timeLimit: 15
  },
  {
    id: '4',
    question: 'Which of these is NOT a primitive data type in Java?',
    options: ['int', 'boolean', 'String', 'double'],
    correctAnswer: 2,
    section: 1,
    difficulty: 'easy',
    timeLimit: 15
  },
  {
    id: '5',
    question: 'What symbol is used for single-line comments in Java?',
    options: ['//', '/*', '#', '--'],
    correctAnswer: 0,
    section: 1,
    difficulty: 'easy',
    timeLimit: 15
  },
  
  // Section 2: Moderate Questions (30 seconds each)
  {
    id: '16',
    question: 'What is method overloading in Java?',
    options: [
      'Methods with same name but different parameters',
      'Methods with same name and same parameters',
      'Methods with different names but same parameters',
      'Methods that override parent class methods'
    ],
    correctAnswer: 0,
    section: 2,
    difficulty: 'moderate',
    timeLimit: 30
  },
  {
    id: '17',
    question: 'Which collection class allows duplicate elements?',
    options: ['Set', 'HashSet', 'ArrayList', 'TreeSet'],
    correctAnswer: 2,
    section: 2,
    difficulty: 'moderate',
    timeLimit: 30
  },
  {
    id: '18',
    question: 'What is the difference between == and equals() in Java?',
    options: [
      '== compares references, equals() compares content',
      '== compares content, equals() compares references',
      'They are exactly the same',
      '== is faster than equals()'
    ],
    correctAnswer: 0,
    section: 2,
    difficulty: 'moderate',
    timeLimit: 30
  },
  
  // Section 3: Hard Questions (60 seconds each)
  {
    id: '31',
    question: 'What happens when you call wait() method on an object?',
    options: [
      'Thread stops execution permanently',
      'Thread pauses and releases the lock',
      'Thread continues execution',
      'Thread throws an exception'
    ],
    correctAnswer: 1,
    section: 3,
    difficulty: 'hard',
    timeLimit: 60
  },
  {
    id: '32',
    question: 'Which design pattern ensures a class has only one instance?',
    options: ['Factory', 'Observer', 'Singleton', 'Builder'],
    correctAnswer: 2,
    section: 3,
    difficulty: 'hard',
    timeLimit: 60
  },
  
  // Add more questions to reach 15 per section (shortened for demo)
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `${6 + i}`,
    question: `Easy question ${6 + i}: Which is correct?`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctAnswer: 0,
    section: 1 as const,
    difficulty: 'easy' as const,
    timeLimit: 15
  })),
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `${19 + i}`,
    question: `Moderate question ${19 + i}: What is the best approach?`,
    options: ['Approach A', 'Approach B', 'Approach C', 'Approach D'],
    correctAnswer: 1,
    section: 2 as const,
    difficulty: 'moderate' as const,
    timeLimit: 30
  })),
  ...Array.from({ length: 13 }, (_, i) => ({
    id: `${33 + i}`,
    question: `Hard question ${33 + i}: How would you implement this?`,
    options: ['Implementation A', 'Implementation B', 'Implementation C', 'Implementation D'],
    correctAnswer: 2,
    section: 3 as const,
    difficulty: 'hard' as const,
    timeLimit: 60
  }))
];
