import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import QuizRulesModal from '@/components/QuizRulesModal';
import loginBackground from '@/assets/login-background.jpg';

const EntryForm = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [branch, setBranch] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && branch && accessCode) {
      // Check if email has already been used
      try {
        const { data: existingUser, error } = await supabase
          .from('quiz_users')
          .select('has_completed, name, branch')
          .eq('email', email)
          .eq('access_code', accessCode)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error("Error checking email:", error);
          toast({
            title: "Error",
            description: "Failed to validate email. Please try again.",
            variant: "destructive",
          });
          return;
        }

        if (existingUser?.has_completed) {
          toast({
            title: "Quiz Already Completed",
            description: "This email has already been used to complete the quiz. You cannot attempt again.",
            variant: "destructive",
          });
          return;
        }

        // Create or update user with name if doesn't exist
        if (!existingUser) {
          const { error: createError } = await supabase
            .from('quiz_users')
            .insert([{ 
              email: email, 
              access_code: accessCode,
              name: name,
              branch: branch
            }]);

          if (createError) {
            console.error('Error creating user:', createError);
            toast({
              title: "Error",
              description: "Failed to register. Please try again.",
              variant: "destructive",
            });
            return;
          }
        } else if (!existingUser.name || !existingUser.branch) {
          // Update existing user with name and/or branch
          const { error: updateError } = await supabase
            .from('quiz_users')
            .update({ name: name, branch: branch })
            .eq('email', email)
            .eq('access_code', accessCode);

          if (updateError) {
            console.error('Error updating user name:', updateError);
          }
        }

        // Show rules modal
        setShowRulesModal(true);
      } catch (error) {
        console.error("Unexpected error:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleStartQuiz = () => {
    setShowRulesModal(false);
    // Navigate to the quiz with name, email, branch and accessCode as search params
    navigate(`/?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&branch=${encodeURIComponent(branch)}&accessCode=${encodeURIComponent(accessCode)}`);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden group"
      style={{
        backgroundImage: `url(${loginBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Background overlay that changes opacity on hover */}
      <div className="absolute inset-0 bg-black/80 group-hover:bg-black/20 transition-all duration-700 ease-in-out" />
      
      {/* Cursor-following glow effect */}
      <div 
        className="fixed pointer-events-none z-0 opacity-60"
        style={{
          left: cursorPosition.x - 100,
          top: cursorPosition.y - 100,
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.2) 30%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(20px)',
          transition: 'left 0.1s ease-out, top 0.1s ease-out'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">QuizPlat</h1>
          <p className="text-white font-medium drop-shadow-lg">
            Enter your credentials to begin the assessment
          </p>
        </div>

        <Card className="w-full bg-white/95 backdrop-blur-sm shadow-2xl">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Full Name
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch" className="text-sm font-medium text-gray-700">
                  Branch
                </Label>
                <div className="relative">
                  <select
                    id="branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full pl-10 h-12 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500 bg-white"
                    required
                  >
                    <option value="">Select your branch</option>
                    <option value="IOT">IOT</option>
                    <option value="AIML">AIML</option>
                    <option value="AIDS">AIDS</option>
                    <option value="COMPS">COMPS</option>
                  </select>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessCode" className="text-sm font-medium text-gray-700">
                  Access Code
                </Label>
                <div className="relative">
                  <Input
                    id="accessCode"
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Enter your access code"
                    className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2m0 0V7a2 2 0 012-2h6a2 2 0 012 2v2M9 7h6" />
                    </svg>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium transition-colors duration-200"
              >
                Start Quiz →
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-8 space-y-2">
          <p className="text-sm text-white font-medium drop-shadow-lg">
            Designed & Developed by IOTech Technical Lead
          </p>
          <p className="text-sm text-blue-300 font-medium drop-shadow-lg">
            An Initiative by IOTech Club – Empowering Students with Technology
          </p>
        </div>
      </div>

      <QuizRulesModal 
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        onStartQuiz={handleStartQuiz}
      />
    </div>
  );
};

export default EntryForm;