
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface QuizUser {
  id: string;
  email: string;
  access_code: string;
  has_completed: boolean;
  current_question_index: number;
  started_at: string | null;
  completed_at: string | null;
}

interface QuizSession {
  id: string;
  user_id: string;
  is_active: boolean;
  started_at: string;
  last_activity: string;
  quiz_users: QuizUser;
}

const LiveTracking = () => {
  const [liveUsers, setLiveUsers] = useState<QuizSession[]>([]);

  // Fetch all users and their sessions
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['quiz-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_sessions')
        .select(`
          *,
          quiz_users (*)
        `)
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      return data as QuizSession[];
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('quiz-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_sessions'
        },
        (payload) => {
          console.log('Real-time update:', payload);
          // Trigger a refetch when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getTimeElapsed = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
  };

  const getLastActivity = (lastActivity: string) => {
    const last = new Date(lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    return `${diffMins} minutes ago`;
  };

  const activeSessions = sessions.filter(session => session.is_active && !session.quiz_users?.has_completed);
  const completedSessions = sessions.filter(session => session.quiz_users?.has_completed);
  const totalUsers = sessions.length;

  if (isLoading) {
    return <div className="text-center py-8">Loading live data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{activeSessions.length}</p>
                <p className="text-sm text-muted-foreground">Active Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedSessions.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {sessions.filter(s => !s.is_active && !s.quiz_users?.has_completed).length}
                </p>
                <p className="text-sm text-muted-foreground">Dropped Out</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Active Quiz Sessions ({activeSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="font-medium">{session.quiz_users?.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Code: {session.quiz_users?.access_code}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Question {(session.quiz_users?.current_question_index || 0) + 1}/45
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.started_at && getTimeElapsed(session.started_at)} elapsed
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Active
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getLastActivity(session.last_activity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Sessions */}
      {completedSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Recently Completed ({completedSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedSessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium">{session.quiz_users?.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Completed {session.quiz_users?.completed_at && 
                          new Date(session.quiz_users.completed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Completed
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeSessions.length === 0 && completedSessions.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Active Sessions</h3>
            <p className="text-muted-foreground">
              Quiz sessions will appear here when students start taking the quiz.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LiveTracking;
