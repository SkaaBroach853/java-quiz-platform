import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const EntryForm = () => {
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && accessCode) {
      // Navigate to the quiz with email and accessCode as search params
      navigate(`/?email=${encodeURIComponent(email)}&accessCode=${encodeURIComponent(accessCode)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Quiz Portal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <Label htmlFor="accessCode">Access Code</Label>
              <Input
                id="accessCode"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter your access code"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Start Quiz
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EntryForm;