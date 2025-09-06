import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QuizSessionData {
  sessionId: string;
  userId: string;
  isNewSession: boolean;
}

interface UseQuizSessionProps {
  userEmail: string;
  accessCode: string;
}

export const useQuizSession = ({ userEmail, accessCode }: UseQuizSessionProps) => {
  const [sessionData, setSessionData] = useState<QuizSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeSession = useCallback(async (currentQuestionIndex: number = 0) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use any type casting to bypass TypeScript issues with function calls
      const { data, error } = await (supabase as any).rpc('upsert_quiz_session', {
        p_user_email: userEmail,
        p_access_code: accessCode,
        p_current_question_index: currentQuestionIndex
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const sessionInfo = data[0];
        setSessionData({
          sessionId: sessionInfo.session_id,
          userId: sessionInfo.user_id,
          isNewSession: sessionInfo.is_new_session
        });
        
        console.log('Quiz session initialized:', sessionInfo);
        return sessionInfo;
      }
    } catch (err: any) {
      console.error('Error initializing session:', err);
      setError(err.message || 'Failed to initialize session');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userEmail, accessCode]);

  const updateActivity = useCallback(async (currentQuestionIndex?: number) => {
    if (!sessionData?.userId) return false;

    try {
      const { data, error } = await (supabase as any).rpc('update_session_activity', {
        p_user_id: sessionData.userId,
        p_current_question_index: currentQuestionIndex
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error updating activity:', err);
      return false;
    }
  }, [sessionData?.userId]);

  const completeSession = useCallback(async () => {
    if (!sessionData?.userId) return false;

    try {
      const { data, error } = await (supabase as any).rpc('complete_quiz_session', {
        p_user_id: sessionData.userId
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error completing session:', err);
      return false;
    }
  }, [sessionData?.userId]);

  // Auto-update activity every 30 seconds
  useEffect(() => {
    if (!sessionData?.userId) return;

    const interval = setInterval(() => {
      updateActivity();
    }, 30000);

    return () => clearInterval(interval);
  }, [sessionData?.userId, updateActivity]);

  return {
    sessionData,
    isLoading,
    error,
    initializeSession,
    updateActivity,
    completeSession
  };
};