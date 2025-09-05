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
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(0);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [showCheatingDialog, setShowCheatingDialog] = useState(false);
  // Remove multiple screen warnings state
  const [fullscreenWarnings, setFullscreenWarnings] = useState(0);
  const activationTimeRef = useRef<number | null>(null);

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

  // Fullscreen enforcement and monitoring
  useEffect(() => {
    if (!isActive) return;

    activationTimeRef.current = Date.now();
    
    // Add a 2-second grace period to prevent immediate triggering
    setTimeout(() => {
      if (activationTimeRef.current) {
        activationTimeRef.current = Date.now();
      }
    }, 2000);

    const el: any = document.documentElement as any;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch((err: any) => {
        console.warn('Fullscreen request failed:', err);
      });
    }

    const onFsChange = () => {
      const inFs = !!document.fullscreenElement;
      const withinGrace = activationTimeRef.current && Date.now() - (activationTimeRef.current || 0) < 1000;
      if (!inFs) {
        if (withinGrace) return;
        if (fullscreenWarnings === 0) {
          setFullscreenWarnings(1);
          setShowWarningDialog(true);
          logCheatingEvent('fullscreen_exit_warning', 'User exited fullscreen - first warning', currentQuestionNumber);
          toast({
            title: '⚠️ Warning',
            description: 'You exited fullscreen. One more attempt will auto-submit your quiz.',
            variant: 'destructive',
          });
        } else {
          handleAutoSubmit('Exited fullscreen after warning');
        }
      }
    };

    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [isActive, fullscreenWarnings, currentQuestionNumber]);

  // Tab switching / Window blur detection
  useEffect(() => {
    if (!isActive) return;

    const withinGrace = () => {
      if (!activationTimeRef.current) return false;
      return Date.now() - activationTimeRef.current < 3000; // 3 second grace period
    };

    const handleVisibilityChange = () => {
      if (withinGrace()) return;
      if (document.hidden) {
        if (tabSwitchWarnings === 0) {
          setTabSwitchWarnings(1);
          setShowWarningDialog(true);
          logCheatingEvent('tab_switch_warning', 'User switched tabs - first warning', currentQuestionNumber);
          toast({
            title: '⚠️ Warning',
            description: 'You switched tabs or tried to leave. One more attempt will auto-submit your quiz.',
            variant: 'destructive',
          });
        } else {
          handleAutoSubmit('User switched tabs after warning');
        }
      }
    };

    const handleBlur = () => {
      if (withinGrace()) return;
      if (tabSwitchWarnings === 0) {
        setTabSwitchWarnings(1);
        setShowWarningDialog(true);
        logCheatingEvent('window_blur_warning', 'User minimized or lost focus - first warning', currentQuestionNumber);
      } else {
        handleAutoSubmit('User lost window focus after warning');
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isActive) return;
      if (tabSwitchWarnings === 0) {
        setTabSwitchWarnings(1);
        setShowWarningDialog(true);
        logCheatingEvent('attempt_close_warning', 'User attempted to close or reload - first warning', currentQuestionNumber);
      } else {
        handleAutoSubmit('Window close or reload after warning');
      }
      e.preventDefault();
      e.returnValue = '';
    };

    const handlePageHide = () => {
      if (withinGrace()) return;
      if (tabSwitchWarnings === 0) {
        setTabSwitchWarnings(1);
        setShowWarningDialog(true);
        logCheatingEvent('page_hide_warning', 'Page hidden - first warning', currentQuestionNumber);
      } else {
        handleAutoSubmit('Page hidden after warning');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isActive, tabSwitchWarnings, currentQuestionNumber]);

  // Remove multiple screen detection as per user request

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