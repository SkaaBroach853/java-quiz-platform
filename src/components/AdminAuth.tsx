
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { User, Key, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminAuthProps {
  onLogin: (username: string, password: string) => void;
}

const AdminAuth: React.FC<AdminAuthProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both username and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Demo admin credentials - replace with your actual authentication logic
      const validCredentials = [
        { username: 'admin', password: 'iotech2025-26' },
        { username: 'iotech', password: 'admin123' }
      ];
      
      const isValid = validCredentials.some(
        cred => cred.username === username && cred.password === password
      );
      
      if (isValid) {
        onLogin(username, password);
        toast({
          title: "Login Successful",
          description: "Welcome to the admin dashboard!",
        });
      } else {
        toast({
          title: "Invalid Credentials",
          description: "Please check your username and password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-quiz-surface to-background p-4">
      <Card className="quiz-card w-full max-w-md animate-scale-in">
        <CardHeader className="text-center space-y-2">
          <Shield className="w-12 h-12 text-quiz-primary mx-auto" />
          <CardTitle className="text-2xl font-semibold text-quiz-primary">
            Admin Access
          </CardTitle>
          <p className="text-muted-foreground">
            Enter your admin credentials to access the dashboard
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-quiz-surface-foreground">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username"
                  className="pl-10 quiz-input"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-quiz-surface-foreground">
                Password
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="pl-10 quiz-input"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full quiz-button-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Logging in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Shield size={18} />
                  <span>Access Dashboard</span>
                </div>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p className="text-quiz-primary font-medium">IOTech Club Admin Panel</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAuth;
