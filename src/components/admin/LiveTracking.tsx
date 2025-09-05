import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User, Clock, CheckCircle, AlertCircle, Trash2, Archive, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
  const [isClearing, setIsClearing] = useState(false);
  const queryClient = useQueryClient();

  // Function to cleanup inactive sessions
  const cleanupInactiveSessions = async () => {
    try {
      const { error } = await supabase.rpc('cleanup_inactive_sessions');
      if (error) {
        console.error('Error cleaning up inactive sessions:', error);
      }
    } catch (error) {
      console.error('Error calling cleanup function:', error);
    }
  };

  // Function to create backup and clear current session data
  const clearSessionsWithBackup = async () => {
    setIsClearing(true);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Step 1: Create backup tables with timestamp
      const backupQuizUsersTable = `quiz_users_backup_${timestamp.substring(0, 19)}`;
      const backupQuizSessionsTable = `quiz_sessions_backup_${timestamp.substring(0, 19)}`;
      const backupCheatingLogsTable = `cheating_logs_backup_${timestamp.substring(0, 19)}`;

      // Create backup of quiz_users
      const { error: backupUsersError } = await supabase.rpc('create_backup_table', {
        source_table: 'quiz_users',
        backup_table: backupQuizUsersTable
      });

      if (backupUsersError) {
        // If RPC doesn't exist, try direct SQL approach
        const { data: usersData, error: fetchUsersError } = await supabase
          .from('quiz_users')
          .select('*');
        
        if (fetchUsersError) throw fetchUsersError;
        
        // Store backup info in a backup log table (you'll need to create this)
        const { error: logError } = await supabase
          .from('session_backups')
          .insert({
            backup_name: `Quiz Users Backup - ${new Date().toLocaleString()}`,
            backup_data: JSON.stringify(usersData),
            table_name: 'quiz_users',
            created_at: new Date().toISOString(),
            record_count: usersData?.length || 0
          });
      }

      // Create backup of quiz_sessions
      const { data: sessionsData, error: fetchSessionsError } = await supabase
        .from('quiz_sessions')
        .select('*');
      
      if (!fetchSessionsError && sessionsData) {
        const { error: logError } = await supabase
          .from('session_backups')
          .insert({
            backup_name: `Quiz Sessions Backup - ${new Date().toLocaleString()}`,
            backup_data: JSON.stringify(sessionsData),
            table_name: 'quiz_sessions',
            created_at: new Date().toISOString(),
            record_count: sessionsData.length
          });
      }

      // Create backup of cheating_logs
      const { data: cheatingData, error: fetchCheatingError } = await supabase
        .from('cheating_logs')
        .select('*');
      
      if (!fetchCheatingError && cheatingData) {
        const { error: logError } = await supabase
          .from('session_backups')
          .insert({
            backup_name: `Cheating Logs Backup - ${new Date().toLocaleString()}`,
            backup_data: JSON.stringify(cheatingData),
            table_name: 'cheating_logs',
            created_at: new Date().toISOString(),
            record_count: cheatingData.length
          });
      }

      // Step 2: Clear current data
      // Delete quiz sessions first (foreign key dependency)
      const { error: deleteSessionsError } = await supabase
        .from('quiz_sessions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (deleteSessionsError) throw deleteSessionsError;

      // Delete quiz users
      const { error: deleteUsersError } = await supabase
        .from('quiz_users')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (deleteUsersError) throw deleteUsersError;

      // Delete cheating logs
      const { error: deleteCheatingError } = await supabase
        .from('cheating_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (deleteCheatingError) throw deleteCheatingError;

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['quiz-sessions'] });

      toast({
        title: "✅ Session Cleared Successfully",
        description: `All session data has been backed up and cleared. Backup created at ${new Date().toLocaleString()}`,
        duration: 5000,
      });

    } catch (error) {
      console.error('Error clearing sessions:', error);
      toast({
        title: "❌ Error Clearing Sessions",
        description: "Failed to clear session data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  // Function to just clear without backup (for quick reset)
  const quickClearSessions = async () => {
    setIsClearing(true);
    try {
      // Delete all current session data without backup
      await supabase.from('quiz_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('quiz_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('cheating_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      queryClient.invalidateQueries({ queryKey: ['quiz-sessions'] });

      toast({
        title: "✅ Quick Clear Successful",
        description: "All session data has been cleared.",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error in quick clear:', error);
      toast({
        title: "❌ Error",
        description: "Failed to clear session data.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  // Fetch all users and their sessions
  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['quiz-sessions'],
    queryFn: async () => {
      // First cleanup inactive sessions
      await cleanupInactiveSessions();
      
      const { data, error } = await supabase
        .from('quiz_sessions')
        .select(`
          *,
          quiz_users!fk_quiz_sessions_user (*)
        `)
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      return data as QuizSession[];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
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
          console.log('Quiz users update:', payload);
          queryClient.invalidateQueries({ queryKey: ['quiz-sessions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Cleanup inactive sessions every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      cleanupInactiveSessions();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
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
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Session Management</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isClearing}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isClearing || totalUsers === 0}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Quick Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Quick Clear Sessions</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will immediately delete all session data without creating a backup. 
                      This action cannot be undone. Are you sure?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={quickClearSessions} className="bg-red-600 hover:bg-red-700">
                      Clear Now
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={isClearing || totalUsers === 0}
                  >
                    <Archive className="w-4 h-4 mr-1" />
                    Clear with Backup
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Sessions with Backup</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will create a backup of all current session data and then clear it for a fresh start. 
                      You'll be able to restore the data later if needed.
                      <br /><br />
                      <strong>What will be backed up:</strong>
                      <ul className="list-disc list-inside mt-2">
                        <li>All quiz user data ({totalUsers} users)</li>
                        <li>All quiz sessions ({sessions.length} sessions)</li>
                        <li>All cheating logs</li>
                      </ul>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={clearSessionsWithBackup}>
                      Create Backup & Clear
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

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
                        Question {(session.quiz_users?.current_question_index || 0) + 1}
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

      {/* Loading overlay */}
      {isClearing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <span className="font-medium">Processing... Please wait</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTracking;