import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface AntiCheatContextType {
  isActive: boolean;
  setIsActive: (active: boolean) => void;
  logCheatingEvent: (eventType: string, description: string, questionNumber?: number) => void;
}

const AntiCheatContext = createContext<AntiCheatContextType | null>(null);

export const useAntiCheat = () => {
  const context = useContext(AntiCheatContext);
  if (!context) {
    throw new Error('useAntiCheat must be used within AntiCheatProvider');
  }
  return context;
};

interface AntiCheatProviderProps {
  children: ReactNode;
  userEmail: string;
  userId: string;
  currentQuestionNumber?: number;
  onAutoSubmit: () => void;
}

export const AntiCheatProvider: React.FC<AntiCheatProviderProps> = ({
  children,
  userEmail,
  userId,
  currentQuestionNumber = 1,
  onAutoSubmit,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(0);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [showCheatingDialog, setShowCheatingDialog] = useState(false);
  const [multipleScreenWarnings, setMultipleScreenWarnings] = useState(0);

  const logCheatingEvent = async (eventType: string, description: string, questionNumber?: number) => {
    try {
      await supabase.from('cheating_logs').insert({
        user_id: userId,
        user_email: userEmail,
        event_type: eventType,
        event_description: description,
        question_number: questionNumber || currentQuestionNumber,
        user_agent: navigator.userAgent,
        session_id: `${userEmail}_${Date.now()}`
      });
    } catch (error) {
      console.error('Failed to log cheating event:', error);
    }
  };

  const handleAutoSubmit = (reason: string) => {
    setShowCheatingDialog(true);
    logCheatingEvent('auto_submit', reason, currentQuestionNumber);
    setTimeout(() => {
      onAutoSubmit();
    }, 3000); // Give user 3 seconds to see the warning before auto-submit
  };

  // Tab switching / Window blur detection
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (tabSwitchWarnings === 0) {
          setTabSwitchWarnings(1);
          setShowWarningDialog(true);
          logCheatingEvent('tab_switch_warning', 'User switched tabs - first warning', currentQuestionNumber);
          toast({
            title: "⚠️ Warning",
            description: "You switched tabs or tried to leave. One more attempt will auto-submit your quiz.",
            variant: "destructive",
          });
        } else {
          handleAutoSubmit('User switched tabs after warning');
        }
      }
    };

    const handleBlur = () => {
      if (tabSwitchWarnings === 0) {
        setTabSwitchWarnings(1);
        setShowWarningDialog(true);
        logCheatingEvent('window_blur_warning', 'User minimized or lost focus - first warning', currentQuestionNumber);
      } else {
        handleAutoSubmit('User lost window focus after warning');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isActive, tabSwitchWarnings, currentQuestionNumber]);

  // Multiple screen detection
  useEffect(() => {
    if (!isActive) return;

    const checkScreens = () => {
      if (screen.availWidth !== window.screen.width || screen.availHeight !== window.screen.height) {
        if (multipleScreenWarnings === 0) {
          setMultipleScreenWarnings(1);
          logCheatingEvent('multiple_screens_warning', 'Multiple screens detected - first warning', currentQuestionNumber);
          toast({
            title: "⚠️ Multiple Screens Detected",
            description: "Multiple display setup detected. One more violation will auto-submit your quiz.",
            variant: "destructive",
          });
        } else {
          handleAutoSubmit('Multiple screens detected after warning');
        }
      }
    };

    // Check periodically
    const interval = setInterval(checkScreens, 5000);
    return () => clearInterval(interval);
  }, [isActive, multipleScreenWarnings, currentQuestionNumber]);

  // Disable right-click, copy-paste, text selection, keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;

    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logCheatingEvent('right_click', 'User attempted right-click', currentQuestionNumber);
      toast({
        title: "❌ Action Blocked",
        description: "Right-click is disabled during the quiz.",
        variant: "destructive",
      });
    };

    // Disable text selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Disable keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable common shortcuts
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a' || e.key === 's' || e.key === 'p')) ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'u') ||
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        logCheatingEvent('keyboard_shortcut', `User attempted: ${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.altKey ? 'Alt+' : ''}${e.key}`, currentQuestionNumber);
        toast({
          title: "❌ Shortcut Blocked",
          description: "Keyboard shortcuts are disabled during the quiz.",
          variant: "destructive",
        });
        return false;
      }
    };

    // Disable drag and drop
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragover', handleDragOver);

    // Add CSS to prevent text selection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragover', handleDragOver);

      // Restore text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [isActive, currentQuestionNumber]);

  return (
    <AntiCheatContext.Provider value={{ isActive, setIsActive, logCheatingEvent }}>
      {children}
      
      {/* Warning Dialog */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-600">⚠️ Warning</AlertDialogTitle>
            <AlertDialogDescription>
              You switched tabs or tried to leave. One more attempt will auto-submit your quiz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowWarningDialog(false)}>
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cheating Detected Dialog */}
      <AlertDialog open={showCheatingDialog} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">⚠️ Cheating Detected!</AlertDialogTitle>
            <AlertDialogDescription>
              Your quiz has been auto-submitted due to suspicious activity. The page will redirect automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </AntiCheatContext.Provider>
  );
};