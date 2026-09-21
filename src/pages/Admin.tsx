
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import QuestionManager from '@/components/admin/QuestionManager';
import LiveTracking from '@/components/admin/LiveTracking';
import ResultsOverview from '@/components/admin/ResultsOverview';
import Leaderboard from '@/components/admin/Leaderboard';
import DataManagement from '@/components/admin/DataManagement';
import { useAuth } from '@/contexts/AuthContext';
import { Users, FileQuestion, BarChart3, Trophy, Settings, LogOut } from 'lucide-react';

const Admin = () => {
  const { user, userRole, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedQuizId = searchParams.get('quiz');

  React.useEffect(() => {
    if (!loading && (!user || userRole !== 'admin')) {
      navigate('/auth', { replace: true });
    }
  }, [loading, navigate, user, userRole]);

  if (loading || !user || userRole !== 'admin') return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">QuizPlat Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Welcome back! Manage questions, track live sessions, and view results
            </p>
          </div>
          <Button 
            onClick={signOut}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="questions" className="flex items-center gap-2">
              <FileQuestion className="w-4 h-4" />
              Questions
            </TabsTrigger>
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Live Tracking
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="data-management" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Data Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <CardTitle>Question Management</CardTitle>
                <CardDescription>
                  Add, edit, and manage quiz questions with image support
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuestionManager initialQuizId={selectedQuizId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="live">
            <Card>
              <CardHeader>
                <CardTitle>Live Quiz Tracking</CardTitle>
                <CardDescription>
                  Monitor students taking the quiz in real-time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LiveTracking />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Results & Analytics</CardTitle>
                <CardDescription>
                  View completion stats and detailed results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResultsOverview />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle>Leaderboard & Rankings</CardTitle>
                <CardDescription>
                  View top performers and detailed rankings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Leaderboard />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data-management">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                  Clear live tracking data and quiz results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataManagement />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
