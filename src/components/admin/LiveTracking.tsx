import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Database,
  Activity,
  Eye,
  Users
} from 'lucide-react';

interface QuizUser {
  id: string;
  email: string;
  access_code: string;
  has_completed: boolean;
  current_question_index: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface QuizSession {
  id: string;
  user_id: string;
  is_active: boolean;
  started_at: string;
  last_activity: string;
  ended_at: string | null;
  quiz_users: QuizUser;
}

const LiveTracking: React.FC = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  const queryClient = useQueryClient();

  // Cleanup inactive sessions
  const cleanupInactiveSessions = useCallback(async () => {
    try {
      const { error } = await supabase.rpc('cleanup_inactive_sessions');
      if (error) {
        console.error('Error cleaning up inactive sessions:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error calling cleanup function:', error);
      return false;
    }
  }, []);

  // Create backup before clearing sessions
  const createSessionBackup = useCallback(async () => {
    try {
      const { data: sessions, error: sessionsError } = await supabase
        .from('quiz_sessions')
        .select(`
          *,
          quiz_users (*)
        `);

      if (sessionsError) throw sessionsError;

      const { data: users, error: usersError } = await supabase
        .from('quiz_users')
        .select('*');

      if (usersError) throw usersError;

      const backupData = {
        sessions: sessions || [],
        users: users || [],
        backup_timestamp: new Date().toISOString(),
        total_sessions: sessions?.length || 0,
        total_users: users?.length || 0
      };

      const backupName = `quiz_backup_${new Date().toISOString().split('T')[0]}_${Date.now()}`;

      const { error: backupError } = await supabase
        .from('session_backups')
        .insert({
          backup_name: backupName,
          backup_data: backupData,
          table_name: 'quiz_sessions_and_users',
          record_count: (sessions?.length || 0) + (users?.length || 0)
        });

      if (backupError) throw backupError;

      return { success: true, backupName };
    } catch (error) {
      console.error('Error creating backup:', error);
      return { success: false, error };
    }
  }, []);

  // Clear all sessions
  const clearAllSessions = useCallback(async () => {
    if (!confirm('Are you sure you want to clear all sessions? This action cannot be undone. A backup will be created first.')) {
      return;
    }

    setIsClearing(true);
    try {
      const backupResult = await createSessionBackup();
      if (!backupResult.success) {
        alert('Failed to create backup. Aborting clear operation.');
        return;
      }

      // Clear sessions first (due to foreign key constraints)
      const { error: sessionsError } = await supabase
        .from('quiz_sessions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (sessionsError) throw sessionsError;

      // Then clear users
      const { error: usersError } = await supabase
        .from('quiz_users')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (usersError) throw usersError;

      await queryClient.invalidateQueries({ queryKey: ['quiz-sessions'] });
      
      alert(`All sessions cleared successfully! Backup created: ${backupResult.backupName}`);
    } catch (error) {
      console.error('Error clearing sessions:', error);
      alert(`Failed to clear sessions: ${error.message}`);
    } finally {
      setIsClearing(false);
    }
  }, [createSessionBackup, queryClient]);

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    await cleanupInactiveSessions();
    await queryClient.invalidateQueries({ queryKey: ['quiz-sessions'] });
    setLastRefresh(new Date());
  }, [cleanupInactiveSessions, queryClient]);

  // Test database connection
  const testConnection = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_sessions')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      
      setConnectionStatus('connected');
      console.log('Database connection test successful:', data);
      alert('Database connection is working!');
    } catch (error) {
      setConnectionStatus('error');
      console.error('Database connection test failed:', error);
      alert(`Database connection failed: ${error.message}`);
    }
  }, []);

  // Fetch quiz sessions with better error handling
  const { data: sessions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['quiz-sessions'],
    queryFn: async () => {
      try {
        setConnectionStatus('connecting');
        
        // First cleanup inactive sessions
        await cleanupInactiveSessions();
        
        const { data, error } = await supabase
          .from('quiz_sessions')
          .select(`
            id,
            user_id,
            is_active,
            started_at,
            last_activity,
            ended_at,
            quiz_users (
              id,
              email,
              access_code,
              has_completed,
              current_question_index,
              started_at,
              completed_at,
              created_at
            )
          `)
          .order('started_at', { ascending: false });
        
        if (error) {
          console.error('Supabase query error:', error);
          setConnectionStatus('error');
          throw error;
        }
        
        setConnectionStatus('connected');
        console.log('Fetched sessions:', data?.length || 0, 'records');
        
        return (data || []) as QuizSession[];
      } catch (error) {
        setConnectionStatus('error');
        console.error('Error in queryFn:', error);
        throw error;
      }
    },
    refetchInterval: 15000, // 15 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Real-time subscription
  useEffect(() => {
    console.log('Setting up real-time subscription...');
    
    const channel = supabase
      .channel('quiz-tracking-realtime', {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_sessions'
        },
        (payload) => {
          console.log('Quiz sessions real-time update:', payload);
          queryClient.invalidateQueries({ queryKey: ['quiz-sessions'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_users'
        },
        (payload) => {
          console.log('Quiz users real-time update:', payload);
          queryClient.invalidateQueries({ queryKey: ['quiz-sessions'] });
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        }
      });

    return () => {
      console.log('Cleaning up real-time subscription...');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Auto cleanup every 3 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Running auto cleanup...');
      cleanupInactiveSessions();
    }, 3 * 60 * 1000);

    return () => clearInterval(interval);
  }, [cleanupInactiveSessions]);

  // Helper functions
  const getTimeElapsed = useCallback((startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
  }, []);

  const getLastActivity = useCallback((lastActivity: string) => {
    const last = new Date(lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    return `${diffMins} minutes ago`;
  }, []);

  // Filter sessions
  const activeSessions = sessions.filter(session => 
    session.is_active && 
    session.quiz_users && 
    !session.quiz_users.has_completed
  );
  
  const completedSessions = sessions.filter(session => 
    session.quiz_users?.has_completed
  );
  
  const droppedOutSessions = sessions.filter(session => 
    !session.is_active && 
    session.quiz_users && 
    !session.quiz_users.has_completed
  );

  // Connection status indicator
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2 text-red-600">Connection Error</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              {error.message || 'Failed to load quiz sessions'}
            </p>
            <div className="space-y-2">
              <Button onClick={() => refetch()} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection
              </Button>
              <Button onClick={testConnection} variant="secondary" className="w-full">
                <Database className="w-4 h-4 mr-2" />
                Test Database
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading live tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Live Quiz Tracking
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}></div>
                <span className="text-sm text-muted-foreground capitalize">
                  {connectionStatus}
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleRefresh} 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  onClick={clearAllSessions} 
                  variant="destructive" 
                  size="sm"
                  disabled={isClearing || sessions.length === 0}
                >
                  {isClearing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Clear All ({sessions.length})
                </Button>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
            <span>•</span>
            <span>Auto-refresh: Every 15s</span>
            <span>•</span>
            <span>Auto-cleanup: Every 3min</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{sessions.length}</p>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{activeSessions.length}</p>
                <p className="text-sm text-muted-foreground">Active Now</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedSessions.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{droppedOutSessions.length}</p>
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
              <Activity className="w-5 h-5 text-orange-500" />
              Active Sessions ({activeSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="font-medium">{session.quiz_users?.email || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">
                        Access Code: {session.quiz_users?.access_code || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Question {(session.quiz_users?.current_question_index || 0) + 1}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getTimeElapsed(session.started_at)} elapsed
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        ● Active
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
            <div className="space-y-3">
              {completedSessions.slice(0, 10).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-4">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium">{session.quiz_users?.email || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.quiz_users?.completed_at ? 
                          `Completed ${new Date(session.quiz_users.completed_at).toLocaleString()}` :
                          'Completion time unknown'
                        }
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

      {/* Empty State */}
      {sessions.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">No Quiz Sessions Found</h3>
            <p className="text-muted-foreground mb-6">
              Sessions will appear here when students start taking quizzes.
            </p>
            
            <div className="max-w-md mx-auto bg-blue-50 p-6 rounded-lg text-left">
              <h4 className="font-medium mb-3 text-center">Troubleshooting Steps:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Ensure all SQL functions are installed</li>
                <li>Check that quiz components call session functions</li>
                <li>Verify database permissions (RLS policies)</li>
                <li>Test the database connection</li>
              </ol>
              
              <div className="mt-4 flex justify-center">
                <Button onClick={testConnection} variant="outline" size="sm">
                  <Database className="w-4 h-4 mr-2" />
                  Test Database Connection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Info (only show if there are sessions but something seems wrong) */}
      {sessions.length > 0 && (activeSessions.length === 0 && completedSessions.length === 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="w-5 h-5" />
              Debug Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-yellow-700">
              <p className="mb-2">Found {sessions.length} sessions, but none are active or completed.</p>
              <details>
                <summary className="cursor-pointer font-medium">View session data</summary>
                <pre className="mt-2 p-3 bg-white border rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(sessions.slice(0, 2), null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LiveTracking;