import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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
  
  // Separate warning states for different violation types
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(0);
  const [fullscreenWarnings, setFullscreenWarnings] = useState(0);
  
  // Dialog states
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [showCheatingDialog, setShowCheatingDialog] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  
  // Refs for managing state and timers
  const activationTimeRef = useRef<number | null>(null);
  const isProcessingViolationRef = useRef(false);
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      console.log(`Cheating event logged: ${eventType} - ${description}`);
    } catch (error) {
      console.error('Failed to log cheating event:', error);
    }
  };

  const showWarning = (message: string, logType: string, logDescription: string) => {
    setWarningMessage(message);
    setShowWarningDialog(true);
    logCheatingEvent(logType, logDescription, currentQuestionNumber);
    
    toast({
      title: '⚠️ Warning',
      description: message,
      variant: 'destructive',
      duration: 5000,
    });
  };

  const handleAutoSubmit = (reason: string) => {
    if (isProcessingViolationRef.current) return;
    
    isProcessingViolationRef.current = true;
    
    // First show the dialog popup
    setShowCheatingDialog(true);
    logCheatingEvent('auto_submit', reason, currentQuestionNumber);
    
    // Force fullscreen mode after showing dialog
    const forceFullscreen = async () => {
      try {
        const el: any = document.documentElement as any;
        if (!document.fullscreenElement && el.requestFullscreen) {
          await el.requestFullscreen();
          console.log('Forced fullscreen for auto-submit');
        }
      } catch (error) {
        console.warn('Could not force fullscreen for auto-submit:', error);
      }
    };
    
    // Force fullscreen after a brief delay to show the dialog first
    setTimeout(() => {
      forceFullscreen();
    }, 500);
    
    toast({
      title: '❌ Quiz Auto-Submitted',
      description: 'Your quiz has been submitted due to suspicious activity.',
      variant: 'destructive',
      duration: 3000,
    });
    
    // Auto-submit after 3 seconds
    autoSubmitTimeoutRef.current = setTimeout(() => {
      onAutoSubmit();
    }, 3000);
  };

  const isWithinGracePeriod = (): boolean => {
    if (!activationTimeRef.current) return false;
    return Date.now() - activationTimeRef.current < 3000; // 3 second grace period
  };

  // Fullscreen enforcement and monitoring
  useEffect(() => {
    if (!isActive) return;

    activationTimeRef.current = Date.now();

    // Request fullscreen with a slight delay to avoid immediate violations
    const requestFullscreenTimer = setTimeout(() => {
      const el: any = document.documentElement as any;
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen().catch((err: any) => {
          console.warn('Fullscreen request failed:', err);
        });
      }
    }, 1000);

    const handleFullscreenChange = () => {
      // Skip if within grace period or already processing a violation
      if (isWithinGracePeriod() || isProcessingViolationRef.current) return;
      
      const isInFullscreen = !!document.fullscreenElement;
      
      if (!isInFullscreen && isActive) {
        if (fullscreenWarnings === 0) {
          setFullscreenWarnings(1);
          showWarning(
            'You exited fullscreen mode. Exiting fullscreen again will auto-submit your quiz.',
            'fullscreen_exit_warning',
            'User exited fullscreen - first warning'
          );
        } else {
          handleAutoSubmit('Exited fullscreen mode after receiving warning');
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      clearTimeout(requestFullscreenTimer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isActive, fullscreenWarnings, currentQuestionNumber]);

  // Enhanced Tab switching / Window focus detection
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      // Skip if within grace period or already processing a violation
      if (isWithinGracePeriod() || isProcessingViolationRef.current) return;
      
      if (document.hidden) {
        console.log('Tab switch detected. Current warnings:', tabSwitchWarnings);
        
        if (tabSwitchWarnings === 0) {
          setTabSwitchWarnings(1);
          showWarning(
            'You switched tabs or left the quiz window. Doing this again will auto-submit your quiz.',
            'tab_switch_warning',
            'User switched tabs - first warning'
          );
        } else {
          handleAutoSubmit('User switched tabs after receiving warning');
        }
      }
    };

    const handleWindowBlur = () => {
      // Skip if within grace period or already processing a violation
      if (isWithinGracePeriod() || isProcessingViolationRef.current) return;
      
      // Additional check to avoid false positives from dialog boxes
      setTimeout(() => {
        if (!document.hasFocus() && isActive && !isProcessingViolationRef.current) {
          console.log('Window blur detected. Current warnings:', tabSwitchWarnings);
          
          if (tabSwitchWarnings === 0) {
            setTabSwitchWarnings(1);
            showWarning(
              'You left the quiz window. Doing this again will auto-submit your quiz.',
              'window_blur_warning',
              'User lost window focus - first warning'
            );
          } else {
            handleAutoSubmit('User lost window focus after receiving warning');
          }
        }
      }, 100);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isActive || isProcessingViolationRef.current) return;
      
      console.log('Before unload detected. Current warnings:', tabSwitchWarnings);
      
      if (tabSwitchWarnings === 0) {
        setTabSwitchWarnings(1);
        logCheatingEvent('attempt_close_warning', 'User attempted to close or reload - first warning', currentQuestionNumber);
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Leaving will result in auto-submission of your quiz.';
        return e.returnValue;
      } else {
        handleAutoSubmit('User attempted to close/reload window after receiving warning');
        e.preventDefault();
        e.returnValue = '';
        return e.returnValue;
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isActive, tabSwitchWarnings, currentQuestionNumber]);

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
      // Disable common shortcuts (including Meta for macOS)
      if (
        (e.ctrlKey || e.metaKey || e.altKey) && (
          e.key.toLowerCase() === 'c' ||
          e.key.toLowerCase() === 'v' ||
          e.key.toLowerCase() === 'a' ||
          e.key.toLowerCase() === 's' ||
          e.key.toLowerCase() === 'p' ||
          e.key.toLowerCase() === 'u'
        )
        || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C'))
        || e.key === 'F12'
        || e.key === 'PrintScreen'
        || (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        logCheatingEvent('keyboard_shortcut', `User attempted: ${e.ctrlKey ? 'Ctrl+' : ''}${e.metaKey ? 'Meta+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.altKey ? 'Alt+' : ''}${e.key}`, currentQuestionNumber);
        toast({
          title: "❌ Shortcut Blocked",
          description: "Keyboard shortcuts are disabled during the quiz.",
          variant: "destructive",
        });
        return false;
      }
    };

    // Block clipboard actions
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      logCheatingEvent('clipboard_copy', 'User attempted to copy content', currentQuestionNumber);
      toast({ title: '❌ Copy Blocked', description: 'Copy is disabled during the quiz.', variant: 'destructive' });
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logCheatingEvent('clipboard_paste', 'User attempted to paste content', currentQuestionNumber);
      toast({ title: '❌ Paste Blocked', description: 'Paste is disabled during the quiz.', variant: 'destructive' });
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      logCheatingEvent('clipboard_cut', 'User attempted to cut content', currentQuestionNumber);
      toast({ title: '❌ Cut Blocked', description: 'Cut is disabled during the quiz.', variant: 'destructive' });
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
    document.addEventListener('copy', handleCopy as any);
    document.addEventListener('paste', handlePaste as any);
    document.addEventListener('cut', handleCut as any);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragover', handleDragOver);

    // Add CSS to prevent text selection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy as any);
      document.removeEventListener('paste', handlePaste as any);
      document.removeEventListener('cut', handleCut as any);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragover', handleDragOver);

      // Restore text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [isActive, currentQuestionNumber]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
      }
    };
  }, []);

  // Reset processing flag when dialogs close
  useEffect(() => {
    if (!showWarningDialog && !showCheatingDialog) {
      isProcessingViolationRef.current = false;
    }
  }, [showWarningDialog, showCheatingDialog]);

  return (
    <AntiCheatContext.Provider value={{ isActive, setIsActive, logCheatingEvent }}>
      {children}
      
      {/* Enhanced Warning Dialog */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-600 flex items-center gap-2">
              ⚠️ Final Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {warningMessage}
              <br /><br />
              <strong className="text-red-600">
                This is your only warning. Any further violations will result in automatic submission of your quiz.
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setShowWarningDialog(false)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              I Understand - Continue Quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enhanced Cheating Detected Dialog */}
      <AlertDialog open={showCheatingDialog} onOpenChange={() => {}}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              ❌ Quiz Auto-Submitted
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Your quiz has been automatically submitted due to suspected cheating behavior.
              <br /><br />
              <div className="bg-red-50 p-3 rounded-lg mt-2">
                <strong>What happened:</strong> You violated the quiz rules after receiving a warning.
                <br />
                <strong>Action taken:</strong> Your current answers have been submitted automatically.
              </div>
              <br />
              The page will redirect automatically in a few seconds...
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </AntiCheatContext.Provider>
  );
};