
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Users, BarChart3, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DataManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active sessions for live tracking
  const { data: activeSessions = [] } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_sessions')
        .select(`
          *,
          quiz_users!fk_quiz_sessions_user (email, access_code)
        `)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch quiz results
  const { data: quizResults = [] } = useQuery({
    queryKey: ['quiz-results-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_results')
        .select(`
          *,
          quiz_users!fk_quiz_results_user (email, access_code)
        `)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Mutation to clear individual session
  const clearSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('quiz_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-sessions'] });
      toast({
        title: "Success",
        description: "User removed from live tracking",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove user from live tracking",
        variant: "destructive"
      });
    }
  });

  // Mutation to clear all sessions
  const clearAllSessionsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('quiz_sessions')
        .update({ is_active: false })
        .eq('is_active', true);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-sessions'] });
      toast({
        title: "Success",
        description: "All users removed from live tracking",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear live tracking data",
        variant: "destructive"
      });
    }
  });

  // Mutation to delete individual result
  const deleteResultMutation = useMutation({
    mutationFn: async (resultId: string) => {
      const { error } = await supabase
        .from('quiz_results')
        .delete()
        .eq('id', resultId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-results-management'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-results'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      toast({
        title: "Success",
        description: "Quiz result deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete quiz result",
        variant: "destructive"
      });
    }
  });

  // Mutation to clear all results
  const clearAllResultsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('quiz_results')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-results-management'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-results'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      toast({
        title: "Success",
        description: "All quiz results cleared successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear quiz results",
        variant: "destructive"
      });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-6 h-6 text-orange-500" />
        <h2 className="text-2xl font-bold">Data Management</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Tracking Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Live Tracking Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                {activeSessions.length} active sessions
              </Badge>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={activeSessions.length === 0}
                  >
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Live Tracking Data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all users from the live tracking dashboard. 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => clearAllSessionsMutation.mutate()}
                      className="bg-destructive text-destructive-foreground"
                    >
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activeSessions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No active sessions to manage
                </p>
              ) : (
                activeSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium text-sm">{session.quiz_users?.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Code: {session.quiz_users?.access_code}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove User from Live Tracking?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {session.quiz_users?.email} from the live tracking dashboard.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => clearSessionMutation.mutate(session.id)}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quiz Results Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-500" />
              Quiz Results Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                {quizResults.length} quiz results
              </Badge>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={quizResults.length === 0}
                  >
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Quiz Results?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all quiz results and leaderboard data. 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => clearAllResultsMutation.mutate()}
                      className="bg-destructive text-destructive-foreground"
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {quizResults.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No quiz results to manage
                </p>
              ) : (
                quizResults.slice(0, 10).map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium text-sm">{result.quiz_users?.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Score: {result.total_score} • {new Date(result.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Quiz Result?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the quiz result for {result.quiz_users?.email}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteResultMutation.mutate(result.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataManagement;
