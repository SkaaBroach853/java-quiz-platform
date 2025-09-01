
import React, { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AntiCheatProviderProps {
  children: React.ReactNode;
}

const AntiCheatProvider: React.FC<AntiCheatProviderProps> = ({ children }) => {
  const [warnings, setWarnings] = useState(0);
  const [fullscreenWarnings, setFullscreenWarnings] = useState(0);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isEliminated, setIsEliminated] = useState(false);
  const { toast } = useToast();
  const tabSwitchCount = useRef(0);
  const fullscreenExitCount = useRef(0);

  // Function to eliminate user from quiz
  const eliminateUser = async (reason: string) => {
    setIsEliminated(true);
    
    try {
      // Update user status in database
      const { error } = await supabase
        .from('quiz_users')
        .update({ 
          has_completed: true, 
          completed_at: new Date().toISOString(),
          elimination_reason: reason 
        } as any)
        .eq('id', localStorage.getItem('quiz_user_id'));

      if (error) {
        console.error('Error updating elimination status:', error);
      }
    } catch (error) {
      console.error('Error eliminating user:', error);
    }

    toast({
      title: "Quiz Ended",
      description: `You have been eliminated: ${reason}`,
      variant: "destructive",
    });

    // Redirect to home after 3 seconds
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
  };

  // Disable right-click context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Disable copy/paste and other keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable common shortcuts
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a' || e.key === 's' || e.key === 'p')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.shiftKey && e.key === 'Delete')
      ) {
        e.preventDefault();
        toast({
          title: "Action Blocked",
          description: "This action is not allowed during the quiz.",
          variant: "destructive",
        });
        return false;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toast]);

  // Handle tab switching and window focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchCount.current += 1;
        
        if (tabSwitchCount.current === 1) {
          setWarningMessage('Warning: Tab switching detected. You have 1 warning remaining.');
          setShowWarningDialog(true);
        } else if (tabSwitchCount.current >= 2) {
          eliminateUser('Multiple tab switches detected');
        }
      }
    };

    const handleBlur = () => {
      if (!document.hidden) {
        // Window minimized
        tabSwitchCount.current += 1;
        
        if (tabSwitchCount.current === 1) {
          setWarningMessage('Warning: Window minimization detected. You have 1 warning remaining.');
          setShowWarningDialog(true);
        } else if (tabSwitchCount.current >= 2) {
          eliminateUser('Multiple window focus changes detected');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Force fullscreen mode
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (error) {
        console.error('Error entering fullscreen:', error);
        toast({
          title: "Fullscreen Required",
          description: "Please enable fullscreen mode to continue the quiz.",
          variant: "destructive",
        });
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        fullscreenExitCount.current += 1;
        
        if (fullscreenExitCount.current === 1) {
          setWarningMessage('Warning: You exited fullscreen mode. You have 1 warning remaining.');
          setShowWarningDialog(true);
          // Try to re-enter fullscreen
          enterFullscreen();
        } else if (fullscreenExitCount.current >= 2) {
          eliminateUser('Exited fullscreen mode multiple times');
        }
      }
    };

    // Enter fullscreen on component mount
    enterFullscreen();

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [toast]);

  // Single login enforcement
  useEffect(() => {
    const userId = localStorage.getItem('quiz_user_id');
    if (!userId) return;

    const checkSingleLogin = async () => {
      try {
        const sessionId = Math.random().toString(36).substr(2, 9);
        localStorage.setItem('session_id', sessionId);

        // Update session in database
        const { error } = await supabase
          .from('quiz_users')
          .update({ current_session_id: sessionId } as any)
          .eq('id', userId);

        if (error) {
          console.error('Error updating session:', error);
        }

        // Check periodically if session is still valid
        const interval = setInterval(async () => {
          const { data, error } = await supabase
            .from('quiz_users')
            .select('current_session_id')
            .eq('id', userId)
            .single();

          if (error) {
            console.error('Error checking session:', error);
            return;
          }

          if ((data as any).current_session_id !== sessionId) {
            eliminateUser('Account logged in from another device');
            clearInterval(interval);
          }
        }, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
      } catch (error) {
        console.error('Error setting up single login check:', error);
      }
    };

    checkSingleLogin();
  }, []);

  if (isEliminated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Quiz Ended</h2>
          <p className="text-gray-700 mb-4">You have been eliminated from the quiz.</p>
          <p className="text-sm text-gray-500">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-yellow-600">⚠️ Warning</AlertDialogTitle>
            <AlertDialogDescription>
              {warningMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowWarningDialog(false)}>
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AntiCheatProvider;
