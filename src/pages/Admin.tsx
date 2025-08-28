
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import QuestionManager from '@/components/admin/QuestionManager';
import LiveTracking from '@/components/admin/LiveTracking';
import ResultsOverview from '@/components/admin/ResultsOverview';
import { Users, FileQuestion, BarChart3, Settings } from 'lucide-react';

const Admin = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Quiz Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage questions, track live sessions, and view results
          </p>
        </div>

        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
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
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
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

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Settings</CardTitle>
                <CardDescription>
                  Configure quiz parameters and access codes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Settings panel coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
