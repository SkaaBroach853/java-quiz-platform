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
  
  // Separate warning states for different violation types (now supporting 3 warnings each)
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(0);
  const [fullscreenWarnings, setFullscreenWarnings] = useState(0);
  
  // Dialog states
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [showCheatingDialog, setShowCheatingDialog] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [currentWarningCount, setCurrentWarningCount] = useState(0);
  const [totalWarningCount, setTotalWarningCount] = useState(3);
  
  // Refs for managing state and timers
  const activationTimeRef = useRef<number | null>(null);
  const isProcessingViolationRef = useRef(false);
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const forceFullscreenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const forceFullscreen = async (reason: string = 'enforcement') => {
    try {
      const el: any = document.documentElement as any;
      if (!document.fullscreenElement && el.requestFullscreen) {
        await el.requestFullscreen();
        console.log(`Forced fullscreen: ${reason}`);
        logCheatingEvent('fullscreen_forced', `Fullscreen forced: ${reason}`, currentQuestionNumber);
      }
    } catch (error) {
      console.warn('Could not force fullscreen:', error);
      // Try alternative methods for different browsers
      try {
        if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
          await el.msRequestFullscreen();
        } else if (el.mozRequestFullScreen) {
          await el.mozRequestFullScreen();
        }
      } catch (altError) {
        console.warn('Alternative fullscreen methods also failed:', altError);
      }
    }
  };

  const showWarning = (message: string, logType: string, logDescription: string, warningCount: number) => {
    const remainingWarnings = totalWarningCount - warningCount;
    const warningText = remainingWarnings > 0 
      ? `${message}\n\nWarning ${warningCount} of ${totalWarningCount}. You have ${remainingWarnings} warning${remainingWarnings > 1 ? 's' : ''} remaining.`
      : message;
    
    setWarningMessage(warningText);
    setCurrentWarningCount(warningCount);
    setShowWarningDialog(true);
    logCheatingEvent(logType, logDescription, currentQuestionNumber);
    
    // Force fullscreen after showing warning
    setTimeout(() => {
      forceFullscreen('after_warning');
    }, 500);
    
    toast({
      title: `⚠️ Warning ${warningCount}/${totalWarningCount}`,
      description: message,
      variant: 'destructive',
      duration: 5000,
    });
  };

  const handleAutoSubmit = (reason: string) => {
    if (isProcessingViolationRef.current) return;
    
    isProcessingViolationRef.current = true;
    
    // Clear any pending force fullscreen timeouts
    if (forceFullscreenTimeoutRef.current) {
      clearTimeout(forceFullscreenTimeoutRef.current);
    }
    
    // First show the dialog popup
    setShowCheatingDialog(true);
    logCheatingEvent('auto_submit', reason, currentQuestionNumber);
    
    // Force fullscreen after showing dialog
    setTimeout(() => {
      forceFullscreen('auto_submit_enforcement');
    }, 500);
    
    toast({
      title: '❌ Quiz Auto-Submitted',
      description: 'Your quiz has been submitted due to repeated violations.',
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
    return Date.now() - activationTimeRef.current < 5000; // 5 second grace period for initial setup
  };

  // Fullscreen enforcement and monitoring
  useEffect(() => {
    if (!isActive) return;

    activationTimeRef.current = Date.now();

    // Request fullscreen with a slight delay to avoid immediate violations
    const requestFullscreenTimer = setTimeout(() => {
      forceFullscreen('initial_activation');
    }, 1000);

    const handleFullscreenChange = () => {
      // Skip if within grace period or already processing a violation
      if (isWithinGracePeriod() || isProcessingViolationRef.current) return;
      
      const isInFullscreen = !!document.fullscreenElement;
      
      if (!isInFullscreen && isActive) {
        const newWarningCount = fullscreenWarnings + 1;
        
        if (newWarningCount <= totalWarningCount) {
          setFullscreenWarnings(newWarningCount);
          showWarning(
            'You exited fullscreen mode. Please stay in fullscreen during the quiz.',
            'fullscreen_exit_warning',
            `User exited fullscreen - warning ${newWarningCount}`,
            newWarningCount
          );
        } else {
          handleAutoSubmit('Exited fullscreen mode after receiving all warnings');
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    return () => {
      clearTimeout(requestFullscreenTimer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
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
        
        const newWarningCount = tabSwitchWarnings + 1;
        
        if (newWarningCount <= totalWarningCount) {
          setTabSwitchWarnings(newWarningCount);
          showWarning(
            'You switched tabs or left the quiz window. Please stay on the quiz page.',
            'tab_switch_warning',
            `User switched tabs - warning ${newWarningCount}`,
            newWarningCount
          );
        } else {
          handleAutoSubmit('User switched tabs after receiving all warnings');
        }
      } else {
        // User came back to the tab, force fullscreen
        setTimeout(() => {
          if (isActive && !isProcessingViolationRef.current) {
            forceFullscreen('tab_return');
          }
        }, 500);
      }
    };

    const handleWindowBlur = () => {
      // Skip if within grace period or already processing a violation
      if (isWithinGracePeriod() || isProcessingViolationRef.current) return;
      
      // Additional check to avoid false positives from dialog boxes
      setTimeout(() => {
        if (!document.hasFocus() && isActive && !isProcessingViolationRef.current) {
          console.log('Window blur detected. Current warnings:', tabSwitchWarnings);
          
          const newWarningCount = tabSwitchWarnings + 1;
          
          if (newWarningCount <= totalWarningCount) {
            setTabSwitchWarnings(newWarningCount);
            showWarning(
              'You left the quiz window. Please stay focused on the quiz.',
              'window_blur_warning',
              `User lost window focus - warning ${newWarningCount}`,
              newWarningCount
            );
          } else {
            handleAutoSubmit('User lost window focus after receiving all warnings');
          }
        }
      }, 100);
    };

    const handleWindowFocus = () => {
      // User focused back on the window, force fullscreen
      if (isActive && !isProcessingViolationRef.current) {
        setTimeout(() => {
          forceFullscreen('window_focus_return');
        }, 300);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isActive || isProcessingViolationRef.current) return;
      
      console.log('Before unload detected. Current warnings:', tabSwitchWarnings);
      
      const newWarningCount = tabSwitchWarnings + 1;
      
      if (newWarningCount <= totalWarningCount) {
        setTabSwitchWarnings(newWarningCount);
        logCheatingEvent('attempt_close_warning', `User attempted to close or reload - warning ${newWarningCount}`, currentQuestionNumber);
        e.preventDefault();
        e.returnValue = `Warning ${newWarningCount}/${totalWarningCount}: You have unsaved changes. Leaving will count as a violation.`;
        return e.returnValue;
      } else {
        handleAutoSubmit('User attempted to close/reload window after receiving all warnings');
        e.preventDefault();
        e.returnValue = 'Quiz is being auto-submitted due to repeated violations.';
        return e.returnValue;
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
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
          e.key.toLowerCase() === 'u' ||
          e.key.toLowerCase() === 'r'
        )
        || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J'))
        || e.key === 'F12'
        || e.key === 'F5'
        || e.key === 'PrintScreen'
        || (e.altKey && e.key === 'Tab')
        || e.key === 'Escape' // Prevent ESC from exiting fullscreen
      ) {
        e.preventDefault();
        e.stopPropagation();
        logCheatingEvent('keyboard_shortcut', `User attempted: ${e.ctrlKey ? 'Ctrl+' : ''}${e.metaKey ? 'Meta+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.altKey ? 'Alt+' : ''}${e.key}`, currentQuestionNumber);
        toast({
          title: "❌ Shortcut Blocked",
          description: "Keyboard shortcuts are disabled during the quiz.",
          variant: "destructive",
        });
        
        // If someone tries to exit fullscreen with ESC, force it back
        if (e.key === 'Escape') {
          setTimeout(() => {
            forceFullscreen('escape_key_attempt');
          }, 100);
        }
        
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
    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    document.addEventListener('copy', handleCopy as any);
    document.addEventListener('paste', handlePaste as any);
    document.addEventListener('cut', handleCut as any);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragover', handleDragOver);

    // Add CSS to prevent text selection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.mozUserSelect = 'none';
    document.body.style.msUserSelect = 'none';

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('copy', handleCopy as any);
      document.removeEventListener('paste', handlePaste as any);
      document.removeEventListener('cut', handleCut as any);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragover', handleDragOver);

      // Restore text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.mozUserSelect = '';
      document.body.style.msUserSelect = '';
    };
  }, [isActive, currentQuestionNumber]);

  // Periodic fullscreen enforcement
  useEffect(() => {
    if (!isActive) return;

    const fullscreenCheckInterval = setInterval(() => {
      if (isActive && !document.fullscreenElement && !isProcessingViolationRef.current) {
        console.log('Periodic fullscreen check - not in fullscreen, forcing...');
        forceFullscreen('periodic_check');
      }
    }, 2000); // Check every 2 seconds

    return () => {
      clearInterval(fullscreenCheckInterval);
    };
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
      }
      if (forceFullscreenTimeoutRef.current) {
        clearTimeout(forceFullscreenTimeoutRef.current);
      }
    };
  }, []);

  // Reset processing flag when dialogs close
  useEffect(() => {
    if (!showWarningDialog && !showCheatingDialog) {
      setTimeout(() => {
        isProcessingViolationRef.current = false;
      }, 500);
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
              ⚠️ Warning {currentWarningCount}/{totalWarningCount}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base whitespace-pre-line">
              {warningMessage}
              <br />
              {currentWarningCount < totalWarningCount ? (
                <strong className="text-amber-600">
                  Please follow the quiz rules to avoid auto-submission.
                </strong>
              ) : (
                <strong className="text-red-600">
                  This was your final warning. Any further violations will result in automatic submission.
                </strong>
              )}
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
              Your quiz has been automatically submitted due to repeated rule violations.
              <br /><br />
              <div className="bg-red-50 p-3 rounded-lg mt-2">
                <strong>What happened:</strong> You violated the quiz rules after receiving {totalWarningCount} warnings.
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