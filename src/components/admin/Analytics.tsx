import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Users, TrendingUp, CheckCircle } from 'lucide-react';

interface AnalyticsData {
  totalAttempts: number;
  averageScore: number;
  topPerformers: Array<{ email: string; score: number }>;
  quizStats: Array<{ quiz_name: string; attempts: number; avg_score: number }>;
}

const Analytics = () => {
  const [data, setData] = useState<AnalyticsData>({
    totalAttempts: 0,
    averageScore: 0,
    topPerformers: [],
    quizStats: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Get total attempts
      const { count: totalAttempts } = await supabase
        .from('quiz_results')
        .select('*', { count: 'exact', head: true });

      // Get average score
      const { data: results } = await supabase
        .from('quiz_results')
        .select('total_score, total_questions');

      let totalScore = 0;
      let totalQuestions = 0;
      results?.forEach((r) => {
        totalScore += r.total_score;
        totalQuestions += r.total_questions || 0;
      });
      const averageScore = totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;

      // Get top performers
      const { data: topPerformersData } = await supabase
        .from('quiz_results')
        .select(`
          total_score,
          total_questions,
          profiles!user_id (email)
        `)
        .order('total_score', { ascending: false })
        .limit(5);

      const topPerformers = topPerformersData?.map((r: any) => ({
        email: r.profiles?.email || 'Unknown',
        score: parseFloat(((r.total_score / (r.total_questions || 1)) * 100).toFixed(1)),
      })) || [];

      setData({
        totalAttempts: totalAttempts || 0,
        averageScore: parseFloat(averageScore.toFixed(1)),
        topPerformers,
        quizStats: [],
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
        <p className="text-muted-foreground">View quiz performance and statistics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalAttempts}</div>
            <p className="text-xs text-muted-foreground">Quiz attempts recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageScore}%</div>
            <p className="text-xs text-muted-foreground">Across all quizzes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.topPerformers.length}</div>
            <p className="text-xs text-muted-foreground">High achievers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
          <CardDescription>Students with highest scores</CardDescription>
        </CardHeader>
        <CardContent>
          {data.topPerformers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No results yet</p>
          ) : (
            <div className="space-y-4">
              {data.topPerformers.map((performer, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                      {index + 1}
                    </div>
                    <span className="font-medium">{performer.email}</span>
                  </div>
                  <span className="text-lg font-bold">{performer.score}%</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
