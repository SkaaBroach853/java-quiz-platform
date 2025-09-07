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
  user?: QuizUser;
}

const LiveTracking: React.FC = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  const queryClient = useQueryClient();

  // Cleanup inactive sessions - FIXED VERSION
  const cleanupInactiveSessions = useCallback(async () => {
    try {
      // Mark sessions as inactive if last activity is more than 5 minutes ago
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      // Only update is_active field - remove ended_at since it doesn't exist
      const { error } = await supabase
        .from('quiz_sessions')
        .update({ is_active: false })
        .lt('last_activity', fiveMinutesAgo)
        .eq('is_active', true);

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
      // Fetch all sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('quiz_sessions')
        .select('*')
        .order('started_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch all users
      const { data: users, error: usersError } = await supabase
        .from('quiz_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const backupData = {
        sessions: sessions || [],
        users: users || [],
        backup_timestamp: new Date().toISOString(),
        total_sessions: sessions?.length || 0,
        total_users: users?.length || 0
      };

      const backupName = `quiz_backup_${new Date().toISOString().split('T')[0]}_${Date.now()}`;

      // Store backup in memory/state instead of database
      const backupJson = JSON.stringify(backupData, null, 2);
      console.log('Backup created:', backupName, backupData);
      
      // Offer download of backup
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${backupName}.json`;
      a.click();
      URL.revokeObjectURL(url);

      return { success: true, backupName, data: backupData };
    } catch (error) {
      console.error('Error creating backup:', error);
      return { success: false, error };
    }
  }, []);

  // Clear all sessions with confirmation - FIXED VERSION
  const clearAllSessions = useCallback(async () => {
    if (!confirm(`Are you sure you want to clear all sessions? This will delete all quiz session data. A backup will be downloaded first.

Current data:
- Quiz Sessions: ${sessions.length}
- Total Users: ${sessions.filter(s => s.user).length}

This action cannot be undone.`)) {
      return;
    }

    setIsClearing(true);
    try {
      // Create backup first
      const backupResult = await createSessionBackup();
      if (!backupResult.success) {
        const proceed = confirm('Failed to create backup. Do you want to proceed anyway? This is risky!');
        if (!proceed) {
          setIsClearing(false);
          return;
        }
      }

      // Clear sessions first (due to potential foreign key constraints)
      const { error: sessionsError } = await supabase
        .from('quiz_sessions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (sessionsError) throw sessionsError;

      // Clear quiz users
      const { error: usersError } = await supabase
        .from('quiz_users')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (usersError) throw usersError;

      // Clear cheating logs if they exist
      try {
        await supabase
          .from('cheating_logs')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (err) {
        console.warn('Could not clear cheating logs (table may not exist):', err);
      }

      // Refresh the data
      await queryClient.invalidateQueries({ queryKey: ['quiz-sessions'] });
      setLastRefresh(new Date());
      
      const backupInfo = backupResult.success ? 
        `\n\nBackup downloaded successfully: ${backupResult.backupName}.json` : 
        '\n\nBackup creation failed, but data was cleared.';
      
      alert(`✅ All sessions cleared successfully!${backupInfo}`);
      
    } catch (error) {
      console.error('Error clearing sessions:', error);
      alert(`❌ Failed to clear sessions: ${error.message}`);
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

  // Test database connection - IMPROVED VERSION
  const testConnection = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      
      // Test quiz_sessions table structure
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('quiz_sessions')
        .select('id, user_id, is_active, started_at, last_activity')
        .limit(1);
      
      if (sessionsError) throw new Error(`quiz_sessions: ${sessionsError.message}`);
      
      // Test quiz_users table
      const { data: usersData, error: usersError } = await supabase
        .from('quiz_users')
        .select('id, email, access_code, has_completed, current_question_index, started_at, completed_at, created_at')
        .limit(1);
      
      if (usersError) throw new Error(`quiz_users: ${usersError.message}`);
      
      setConnectionStatus('connected');
      
      // Get table info
      const sessionsCount = sessionsData?.length || 0;
      const usersCount = usersData?.length || 0;
      
      alert(`✅ Database connection successful!\n\nTables accessible:\n- quiz_sessions ✓ (${sessionsCount} records tested)\n- quiz_users ✓ (${usersCount} records tested)\n\nNote: Only testing column structure, not all data.`);
      
    } catch (error) {
      setConnectionStatus('error');
      console.error('Database connection test failed:', error);
      alert(`❌ Database connection failed:\n\n${error.message}\n\nCommon issues:\n1. Database is offline\n2. Tables don't exist\n3. Column mismatch\n4. RLS policies blocking access`);
    }
  }, []);

  // Fetch quiz sessions - FIXED VERSION WITH BETTER ERROR HANDLING
  const { data: sessions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['quiz-sessions'],
    queryFn: async () => {
      try {
        setConnectionStatus('connecting');
        
        // First cleanup inactive sessions
        await cleanupInactiveSessions();
        
        // Fetch sessions with only fields that exist
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('quiz_sessions')
          .select('id, user_id, is_active, started_at, last_activity')
          .order('started_at', { ascending: false });
        
        if (sessionsError) {
          console.error('Sessions query error:', sessionsError);
          setConnectionStatus('error');
          throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
        }
        
        // Fetch all users separately 
        const { data: allUsers, error: usersError } = await supabase
          .from('quiz_users')
          .select('id, email, access_code, has_completed, current_question_index, started_at, completed_at, created_at');
        
        if (usersError) {
          console.error('Users query error:', usersError);
          console.warn('Proceeding without user data due to error:', usersError);
        }
        
        // Manually join the data
        const sessionsWithUsers = (sessionsData || []).map(session => {
          const user = allUsers?.find(u => u.id === session.user_id) || null;
          return {
            ...session,
            user
          };
        });
        
        setConnectionStatus('connected');
        console.log('Successfully fetched:', sessionsWithUsers.length, 'sessions');
        
        return sessionsWithUsers as QuizSession[];
        
      } catch (error) {
        setConnectionStatus('error');
        console.error('Error in queryFn:', error);
        throw error;
      }
    },
    refetchInterval: 15000, // 15 seconds
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
  });

  // Real-time subscription - SIMPLIFIED AND MORE ROBUST
  useEffect(() => {
    console.log('Setting up real-time subscription...');
    
    const channel = supabase
      .channel('quiz-tracking-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_sessions'
        },
        (payload) => {
          console.log('Quiz sessions update:', payload);
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
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time connection established');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time connection failed');
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

  // Filter sessions safely
  const activeSessions = sessions.filter(session => 
    session.is_active && 
    session.user && 
    !session.user.has_completed
  );
  
  const completedSessions = sessions.filter(session => 
    session.user?.has_completed === true
  );
  
  const droppedOutSessions = sessions.filter(session => 
    !session.is_active && 
    session.user && 
    !session.user.has_completed
  );

  const totalUsers = sessions.filter(s => s.user).length;

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
            <div className="mt-4 p-3 bg-red-50 rounded-lg text-left">
              <p className="text-xs text-red-600 font-mono">
                Debug: {error.message}
              </p>
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
          <p className="text-sm text-muted-foreground mt-2">
            Connecting to database...
          </p>
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
                <Button 
                  onClick={testConnection} 
                  variant="secondary" 
                  size="sm"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Test DB
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
                      <p className="font-medium">{session.user?.email || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">
                        Access Code: {session.user?.access_code || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Question {(session.user?.current_question_index || 0) + 1}
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
                      <p className="font-medium">{session.user?.email || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.user?.completed_at ? 
                          `Completed ${new Date(session.user.completed_at).toLocaleString()}` :
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
                <li>Check that students are actually taking quizzes</li>
                <li>Verify quiz components create sessions properly</li>
                <li>Test the database connection</li>
                <li>Check browser console for errors</li>
                <li>Verify database table structure</li>
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