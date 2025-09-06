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
      // First, try to find or create the user
      let userId: string | null = null;

      // Check if user exists by email
      const { data: existingUser, error: userSelectError } = await supabase
        .from('quiz_users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (existingUser) {
        userId = existingUser.id;
        
        // Update the existing user
        const { error: updateError } = await supabase
          .from('quiz_users')
          .update({
            access_code: accessCode,
            current_question_index: currentQuestionIndex,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) throw updateError;
      } else {
        // Create new user
        const { data: newUser, error: insertError } = await supabase
          .from('quiz_users')
          .insert({
            email: userEmail,
            access_code: accessCode,
            current_question_index: currentQuestionIndex,
            started_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        if (!newUser) throw new Error('Failed to create user');
        
        userId = newUser.id;
      }

      // Check for existing active session
      const { data: existingSession, error: sessionSelectError } = await supabase
        .from('quiz_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      let sessionId: string;
      let isNewSession = false;

      if (existingSession) {
        sessionId = existingSession.id;
        
        // Update existing session
        const { error: updateSessionError } = await supabase
          .from('quiz_sessions')
          .update({
            last_activity: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (updateSessionError) throw updateSessionError;
      } else {
        // Create new session
        const { data: newSession, error: insertSessionError } = await supabase
          .from('quiz_sessions')
          .insert({
            user_id: userId,
            started_at: new Date().toISOString(),
            last_activity: new Date().toISOString()
          })
          .select('id')
          .single();

        if (insertSessionError) throw insertSessionError;
        if (!newSession) throw new Error('Failed to create session');
        
        sessionId = newSession.id;
        isNewSession = true;
      }

      const sessionInfo = {
        sessionId,
        userId,
        isNewSession
      };

      setSessionData(sessionInfo);
      console.log('Quiz session initialized:', sessionInfo);
      return sessionInfo;

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
      // Update the active session's last activity
      const { error: sessionError } = await supabase
        .from('quiz_sessions')
        .update({
          last_activity: new Date().toISOString()
        })
        .eq('user_id', sessionData.userId)
        .eq('is_active', true);

      if (sessionError) throw sessionError;

      // Update user's current question index if provided
      if (currentQuestionIndex !== undefined) {
        const { error: userError } = await supabase
          .from('quiz_users')
          .update({
            current_question_index: currentQuestionIndex,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionData.userId);

        if (userError) throw userError;
      }

      return true;
    } catch (err: any) {
      console.error('Error updating activity:', err);
      return false;
    }
  }, [sessionData?.userId]);

  const completeSession = useCallback(async () => {
    if (!sessionData?.userId) return false;

    try {
      // Mark the active session as completed
      const { error: sessionError } = await supabase
        .from('quiz_sessions')
        .update({
          is_active: false,
          last_activity: new Date().toISOString()
        })
        .eq('user_id', sessionData.userId)
        .eq('is_active', true);

      if (sessionError) throw sessionError;

      // Mark user as completed
      const { error: userError } = await supabase
        .from('quiz_users')
        .update({
          has_completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionData.userId);

      if (userError) throw userError;

      return true;
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