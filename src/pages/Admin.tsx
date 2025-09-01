
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import QuestionManager from '@/components/admin/QuestionManager';
import LiveTracking from '@/components/admin/LiveTracking';
import ResultsOverview from '@/components/admin/ResultsOverview';
import AdminAuth from '@/components/AdminAuth';
import { Users, FileQuestion, BarChart3, LogOut } from 'lucide-react';

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<string>('');

  // Check if admin is already logged in (from localStorage)
  useEffect(() => {
    const savedAuth = localStorage.getItem('admin_auth');
    if (savedAuth) {
      const { username, timestamp } = JSON.parse(savedAuth);
      // Check if session is less than 24 hours old
      const isValid = Date.now() - timestamp < 24 * 60 * 60 * 1000;
      if (isValid) {
        setIsAuthenticated(true);
        setAdminUser(username);
      } else {
        localStorage.removeItem('admin_auth');
      }
    }
  }, []);

  const handleLogin = (username: string, password: string) => {
    setIsAuthenticated(true);
    setAdminUser(username);
    // Save auth state to localStorage
    localStorage.setItem('admin_auth', JSON.stringify({
      username,
      timestamp: Date.now()
    }));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminUser('');
    localStorage.removeItem('admin_auth');
  };

  if (!isAuthenticated) {
    return <AdminAuth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quiz Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Welcome back, {adminUser}! Manage questions, track live sessions, and view results
            </p>
          </div>
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
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
                <QuestionManager />
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
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
