import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, AlertTriangle, Smartphone, Eye } from 'lucide-react';

interface QuizRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartQuiz: () => void;
}

const QuizRulesModal = ({ isOpen, onClose, onStartQuiz }: QuizRulesModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-blue-600 mb-4">
            📜 Quiz Rules
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-gray-800 font-medium mb-3">
              The quiz has 3 sections with a total of 45 questions:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span><strong>Type I →</strong> 15 Questions (Basics)</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span><strong>Type II →</strong> 15 Questions (Mixed Programming MCQs)</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-600" />
                <span><strong>Type III →</strong> 10 Questions (Programming-only MCQs)</span>
                <Clock className="h-4 w-4 text-red-600" />
                <span><strong>Time limit: 35 minutes →</strong> All the questions are Objective-type questions. Difficulty level Easy to Complex</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-800">
                Solve all the question within the time limit. Unanswered questions will be Automatically-Submitted and marked with 0 point.
              </p>
            </div>

            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-800">
                Once the question is submitted, you cannot return to it.
              </p>
            </div>

            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <Eye className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-800">
                Do not switch browser tabs or minimize the window. If detected, your quiz will be immediately submitted.
              </p>
            </div>

            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <Smartphone className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-800">
                Mobile devices are not allowed. Attempt the quiz only on a laptop or desktop.
              </p>
            </div>

            <div className="flex items-start gap-3 p-3 bg-red-100 rounded-lg border border-red-300">
              <AlertTriangle className="h-5 w-5 text-red-700 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-800 font-semibold">
                If caught cheating, you will be permanently eliminated from the quiz.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                👉 Ready to begin? Click the button below to start your quiz.
              </p>
              <Button 
                onClick={onStartQuiz}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium text-lg"
              >
                Click to Begin the Quiz
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuizRulesModal;
