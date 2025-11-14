import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, Link as LinkIcon, Play, StopCircle } from 'lucide-react';
import { toast } from 'sonner';
import CreateQuizDialog from './CreateQuizDialog';

interface Quiz {
  id: string;
  name: string;
  description: string;
  status: string;
  access_code: string;
  unique_link: string;
  created_at: string;
  total_questions: number;
}

const QuizManager = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
    } catch (error: any) {
      toast.error('Failed to load quizzes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (quiz: Quiz) => {
    const link = `${window.location.origin}/quiz?link=${quiz.unique_link}`;
    navigator.clipboard.writeText(link);
    toast.success('Quiz link copied to clipboard!');
  };

  const toggleStatus = async (quiz: Quiz) => {
    const newStatus = quiz.status === 'active' ? 'draft' : 'active';
    
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ 
          status: newStatus,
          activated_at: newStatus === 'active' ? new Date().toISOString() : null
        })
        .eq('id', quiz.id);

      if (error) throw error;
      toast.success(`Quiz ${newStatus === 'active' ? 'activated' : 'deactivated'}!`);
      loadQuizzes();
    } catch (error: any) {
      toast.error('Failed to update quiz status');
      console.error(error);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? This will also delete all questions and results.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;
      toast.success('Quiz deleted successfully!');
      loadQuizzes();
    } catch (error: any) {
      toast.error('Failed to delete quiz');
      console.error(error);
    }
  };

  const manageQuestions = (quiz: Quiz) => {
    window.location.href = `/admin#quiz-${quiz.id}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Quiz Management</h2>
          <p className="text-muted-foreground">Create and manage your quizzes</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Quiz
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading quizzes...</div>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No quizzes created yet</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Quiz
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle>{quiz.name}</CardTitle>
                    <CardDescription>{quiz.description}</CardDescription>
                  </div>
                  <Badge
                    variant={
                      quiz.status === 'active'
                        ? 'default'
                        : quiz.status === 'completed'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {quiz.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Access Code</p>
                      <p className="font-mono font-bold">{quiz.access_code}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Questions</p>
                      <p className="font-semibold">{quiz.total_questions || 0}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyLink(quiz)}>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Copy Link
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => manageQuestions(quiz)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Manage Questions
                    </Button>
                    <Button
                      variant={quiz.status === 'active' ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => toggleStatus(quiz)}
                    >
                      {quiz.status === 'active' ? (
                        <>
                          <StopCircle className="mr-2 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteQuiz(quiz.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateQuizDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          setShowCreateDialog(false);
          loadQuizzes();
        }}
      />
    </div>
  );
};

export default QuizManager;
