import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateQuizDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateQuizDialog = ({ open, onClose, onSuccess }: CreateQuizDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [easyCount, setEasyCount] = useState(15);
  const [moderateCount, setModerateCount] = useState(15);
  const [hardCount, setHardCount] = useState(15);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Quiz name is required');
      return;
    }

    setLoading(true);
    try {
      // Generate access code and unique link
      const { data: codeData } = await supabase.rpc('generate_access_code');
      const { data: linkData } = await supabase.rpc('generate_unique_link');

      const { error } = await supabase.from('quizzes').insert({
        name: name.trim(),
        description: description.trim(),
        access_code: codeData,
        unique_link: linkData,
        easy_count: easyCount,
        moderate_count: moderateCount,
        hard_count: hardCount,
        total_questions: easyCount + moderateCount + hardCount,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Quiz created successfully!');
      onSuccess();
      
      // Reset form
      setName('');
      setDescription('');
      setEasyCount(15);
      setModerateCount(15);
      setHardCount(15);
    } catch (error: any) {
      toast.error('Failed to create quiz');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Quiz</DialogTitle>
          <DialogDescription>
            Enter quiz details and question distribution
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Quiz Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Programming Fundamentals Quiz"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the quiz"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="easy">Easy Questions</Label>
              <Input
                id="easy"
                type="number"
                min="0"
                value={easyCount}
                onChange={(e) => setEasyCount(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">15 sec each</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="moderate">Moderate</Label>
              <Input
                id="moderate"
                type="number"
                min="0"
                value={moderateCount}
                onChange={(e) => setModerateCount(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">30 sec each</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hard">Hard</Label>
              <Input
                id="hard"
                type="number"
                min="0"
                value={hardCount}
                onChange={(e) => setHardCount(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">60 sec each</p>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm">
              <span className="font-semibold">Total Questions:</span>{' '}
              {easyCount + moderateCount + hardCount}
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Quiz'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateQuizDialog;
