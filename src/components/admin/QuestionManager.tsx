
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Upload, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  section: 1 | 2 | 3;
  difficulty: 'easy' | 'moderate' | 'hard';
  time_limit: number;
  image_url?: string;
}

const QuestionManager = () => {
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    section: 1 as 1 | 2 | 3,
    difficulty: 'easy' as 'easy' | 'moderate' | 'hard',
    time_limit: 15,
    image_url: ''
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch questions
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('section', { ascending: true });
      
      if (error) throw error;
      return data as Question[];
    }
  });

  // Add/Update question mutation
  const saveMutation = useMutation({
    mutationFn: async (questionData: typeof formData) => {
      let imageUrl = questionData.image_url;
      
      // Upload image if selected
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('question-images')
          .upload(fileName, selectedImage);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('question-images')
          .getPublicUrl(fileName);
          
        imageUrl = publicUrl;
      }

      if (editingQuestion) {
        const { error } = await supabase
          .from('questions')
          .update({ ...questionData, image_url: imageUrl })
          .eq('id', editingQuestion.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('questions')
          .insert({ ...questionData, image_url: imageUrl });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      resetForm();
      toast({
        title: editingQuestion ? "Question Updated" : "Question Added",
        description: "Question has been saved successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save question. Please try again.",
        variant: "destructive"
      });
      console.error('Save error:', error);
    }
  });

  // Delete question mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast({
        title: "Question Deleted",
        description: "Question has been removed successfully."
      });
    }
  });

  const resetForm = () => {
    setFormData({
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      section: 1,
      difficulty: 'easy',
      time_limit: 15,
      image_url: ''
    });
    setSelectedImage(null);
    setIsAddingQuestion(false);
    setEditingQuestion(null);
  };

  const handleEdit = (question: Question) => {
    setFormData({
      question: question.question,
      options: question.options,
      correct_answer: question.correct_answer,
      section: question.section,
      difficulty: question.difficulty,
      time_limit: question.time_limit,
      image_url: question.image_url || ''
    });
    setEditingQuestion(question);
    setIsAddingQuestion(true);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading questions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Questions ({questions.length})</h3>
          <p className="text-sm text-muted-foreground">
            Manage your quiz questions with customizable timers
          </p>
        </div>
        <Button 
          onClick={() => setIsAddingQuestion(true)} 
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </Button>
      </div>

      {isAddingQuestion && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingQuestion ? 'Edit Question' : 'Add New Question'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="question">Question</Label>
              <Textarea
                id="question"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Enter your question here..."
                className="mt-1"
              />
            </div>

            <div>
              <Label>Options</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className={formData.correct_answer === index ? 'border-green-500' : ''}
                    />
                    <Button
                      type="button"
                      variant={formData.correct_answer === index ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, correct_answer: index })}
                    >
                      {formData.correct_answer === index ? '✓' : `${index + 1}`}
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Click the number button to mark the correct answer
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="section">Section</Label>
                <Select 
                  value={formData.section.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, section: parseInt(value) as 1 | 2 | 3 })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Section 1</SelectItem>
                    <SelectItem value="2">Section 2</SelectItem>
                    <SelectItem value="3">Section 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select 
                  value={formData.difficulty} 
                  onValueChange={(value) => setFormData({ ...formData, difficulty: value as 'easy' | 'moderate' | 'hard' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timeLimit">Time Limit (seconds)</Label>
                <Select 
                  value={formData.time_limit.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, time_limit: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">60 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="image">Question Image (optional)</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                <Upload className="w-4 h-4 text-muted-foreground" />
              </div>
              {(selectedImage || formData.image_url) && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <ImageIcon className="w-4 h-4" />
                  {selectedImage ? selectedImage.name : 'Current image will be kept'}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={() => saveMutation.mutate(formData)}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving...' : (editingQuestion ? 'Update' : 'Add')} Question
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {questions.map((question) => (
          <Card key={question.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Section {question.section}</Badge>
                    <Badge variant="secondary">{question.difficulty}</Badge>
                    <Badge variant="outline">{question.time_limit}s</Badge>
                  </div>
                  <h4 className="font-medium mb-2">{question.question}</h4>
                  {question.image_url && (
                    <div className="mb-2">
                      <img 
                        src={question.image_url} 
                        alt="Question" 
                        className="max-w-xs h-auto rounded border"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
                    {question.options.map((option, index) => (
                      <div 
                        key={index} 
                        className={`p-2 rounded ${question.correct_answer === index ? 'bg-green-100 text-green-800 font-medium' : 'bg-gray-50'}`}
                      >
                        {index + 1}. {option}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(question)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(question.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default QuestionManager;
