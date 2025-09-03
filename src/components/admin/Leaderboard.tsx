
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, Award, Crown } from 'lucide-react';
import { useTotalQuestions } from '@/hooks/useTotalQuestions';
import { formatTime, minutesToSeconds } from '@/utils/timeFormat';

interface LeaderboardEntry {
  id: string;
  email: string;
  access_code: string;
  total_score: number;
  completion_time: number;
  completed_at: string;
  rank: number;
}

const Leaderboard = () => {
  // Fetch total questions count
  const { data: totalQuestions = 0 } = useTotalQuestions();

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_results')
        .select(`
          *,
          quiz_users!fk_quiz_results_user (email, access_code)
        `)
        .order('total_score', { ascending: false })
        .order('completion_time', { ascending: true });
      
      if (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
      }

      // Add ranking to the results
      const rankedResults = data.map((result, index): LeaderboardEntry => ({
        id: result.id,
        email: result.quiz_users?.email || 'Unknown',
        access_code: result.quiz_users?.access_code || 'N/A',
        total_score: result.total_score,
        completion_time: result.completion_time || 0,
        completed_at: result.completed_at,
        rank: index + 1
      }));

      return rankedResults;
    }
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Trophy className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-orange-500" />;
      default:
        return <Award className="w-5 h-5 text-blue-500" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 2:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 3:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Dynamic pass threshold (67% of total questions)
  const passThreshold = Math.ceil(totalQuestions * 0.67);

  if (isLoading) {
    return <div className="text-center py-8">Loading leaderboard...</div>;
  }

  if (leaderboard.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
          <p className="text-muted-foreground">
            The leaderboard will show up here once students complete the quiz.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h2 className="text-2xl font-bold">Leaderboard</h2>
        <Badge variant="secondary" className="ml-2">
          {leaderboard.length} participants
        </Badge>
      </div>

      <div className="space-y-3">
        {leaderboard.map((entry) => (
          <Card key={entry.id} className={`transition-all hover:shadow-md ${entry.rank <= 3 ? 'ring-2 ' + (entry.rank === 1 ? 'ring-yellow-200' : entry.rank === 2 ? 'ring-gray-200' : 'ring-orange-200') : ''}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${getRankColor(entry.rank)}`}>
                    <div className="flex items-center gap-1">
                      {getRankIcon(entry.rank)}
                      <span className="font-bold text-lg">#{entry.rank}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg">{entry.email}</h3>
                    <p className="text-sm text-muted-foreground">
                      Access Code: {entry.access_code}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Completed: {new Date(entry.completed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      variant={entry.total_score >= passThreshold ? 'default' : entry.total_score >= Math.ceil(totalQuestions * 0.5) ? 'secondary' : 'destructive'}
                      className="text-lg px-3 py-1"
                    >
                      {entry.total_score}/{totalQuestions}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Time: {formatTime(minutesToSeconds(entry.completion_time))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((entry.total_score / totalQuestions) * 100)}% accuracy
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Statistics Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {leaderboard[0]?.total_score || 0}/{totalQuestions}
              </p>
              <p className="text-sm text-muted-foreground">Highest Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {leaderboard.length > 0 
                  ? Math.round(leaderboard.reduce((sum, entry) => sum + entry.total_score, 0) / leaderboard.length)
                  : 0
                }/{totalQuestions}
              </p>
              <p className="text-sm text-muted-foreground">Average Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {leaderboard.filter(entry => entry.total_score >= passThreshold).length}
              </p>
              <p className="text-sm text-muted-foreground">Passed (≥{passThreshold})</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {leaderboard.length > 0 
                  ? formatTime(minutesToSeconds(Math.round(leaderboard.reduce((sum, entry) => sum + entry.completion_time, 0) / leaderboard.length)))
                  : '0s'
                }
              </p>
              <p className="text-sm text-muted-foreground">Avg Time</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Leaderboard;
