
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Trophy, Users, Clock, TrendingUp } from 'lucide-react';

interface QuizResult {
  id: string;
  user_id: string;
  total_score: number;
  section_scores: {
    section1: number;
    section2: number;
    section3: number;
  };
  completion_time: number;
  completed_at: string;
  quiz_users: {
    email: string;
    access_code: string;
  };
}

const ResultsOverview = () => {
  // Fetch results
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['quiz-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_results')
        .select(`
          *,
          quiz_users (email, access_code)
        `)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data as QuizResult[];
    }
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading results...</div>;
  }

  // Calculate statistics
  const totalCompleted = results.length;
  const averageScore = results.length > 0 
    ? Math.round(results.reduce((sum, r) => sum + r.total_score, 0) / results.length) 
    : 0;
  const averageTime = results.length > 0 
    ? Math.round(results.reduce((sum, r) => sum + (r.completion_time || 0), 0) / results.length) 
    : 0;
  const highestScore = results.length > 0 
    ? Math.max(...results.map(r => r.total_score)) 
    : 0;

  // Prepare chart data
  const scoreDistribution = [
    { range: '0-9', count: results.filter(r => r.total_score < 10).length },
    { range: '10-19', count: results.filter(r => r.total_score >= 10 && r.total_score < 20).length },
    { range: '20-29', count: results.filter(r => r.total_score >= 20 && r.total_score < 30).length },
    { range: '30-39', count: results.filter(r => r.total_score >= 30 && r.total_score < 40).length },
    { range: '40-45', count: results.filter(r => r.total_score >= 40).length },
  ];

  const sectionPerformance = results.length > 0 ? [
    {
      section: 'Section 1',
      average: Math.round(results.reduce((sum, r) => sum + r.section_scores.section1, 0) / results.length * 10) / 10
    },
    {
      section: 'Section 2', 
      average: Math.round(results.reduce((sum, r) => sum + r.section_scores.section2, 0) / results.length * 10) / 10
    },
    {
      section: 'Section 3',
      average: Math.round(results.reduce((sum, r) => sum + r.section_scores.section3, 0) / results.length * 10) / 10
    }
  ] : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const getScoreColor = (score: number) => {
    if (score >= 40) return 'text-green-600 bg-green-100';
    if (score >= 30) return 'text-blue-600 bg-blue-100';
    if (score >= 20) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalCompleted}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{averageScore}/45</p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{averageTime}m</p>
                <p className="text-sm text-muted-foreground">Avg Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{highestScore}/45</p>
                <p className="text-sm text-muted-foreground">Highest Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {results.length > 0 && (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Section Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sectionPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="section" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="average" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Results */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.slice(0, 10).map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{result.quiz_users?.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Code: {result.quiz_users?.access_code} • 
                          Completed {new Date(result.completed_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm">
                          S1: {result.section_scores.section1} • 
                          S2: {result.section_scores.section2} • 
                          S3: {result.section_scores.section3}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.completion_time}m completion time
                        </p>
                      </div>
                      
                      <Badge className={getScoreColor(result.total_score)}>
                        {result.total_score}/45
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {results.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
            <p className="text-muted-foreground">
              Quiz results will appear here once students complete the quiz.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResultsOverview;
