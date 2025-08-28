
-- Create users table to track quiz participants
CREATE TABLE public.quiz_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  access_code TEXT NOT NULL,
  has_completed BOOLEAN DEFAULT false,
  current_question_index INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table with image support
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer INTEGER NOT NULL,
  section INTEGER NOT NULL CHECK (section IN (1, 2, 3)),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'moderate', 'hard')),
  time_limit INTEGER NOT NULL CHECK (time_limit IN (15, 30, 60)),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz sessions table to track active users
CREATE TABLE public.quiz_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.quiz_users(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '[]',
  section_scores JSONB DEFAULT '{"section1": 0, "section2": 0, "section3": 0}',
  is_active BOOLEAN DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create results table
CREATE TABLE public.quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.quiz_users(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL,
  section_scores JSONB NOT NULL,
  completion_time INTEGER, -- in minutes
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public) VALUES ('question-images', 'question-images', true);

-- Enable Row Level Security
ALTER TABLE public.quiz_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public access (since no auth system yet)
CREATE POLICY "Allow public read access to questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to quiz_users" ON public.quiz_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to quiz_users" ON public.quiz_users FOR SELECT USING (true);
CREATE POLICY "Allow public update access to quiz_users" ON public.quiz_users FOR UPDATE USING (true);
CREATE POLICY "Allow public access to quiz_sessions" ON public.quiz_sessions FOR ALL USING (true);
CREATE POLICY "Allow public access to quiz_results" ON public.quiz_results FOR ALL USING (true);

-- Storage policy for question images
CREATE POLICY "Allow public uploads to question-images bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'question-images');
CREATE POLICY "Allow public read access to question-images bucket" ON storage.objects FOR SELECT USING (bucket_id = 'question-images');
CREATE POLICY "Allow public delete access to question-images bucket" ON storage.objects FOR DELETE USING (bucket_id = 'question-images');

-- Insert sample questions
INSERT INTO public.questions (question, options, correct_answer, section, difficulty, time_limit) VALUES
('What is the correct syntax for a Java main method?', '{"public static void main(String[] args)", "public void main(String[] args)", "static void main(String[] args)", "public main(String[] args)"}', 0, 1, 'easy', 15),
('Which keyword is used to create a class in Java?', '{"class", "Class", "create", "new"}', 0, 1, 'easy', 15),
('What is the extension of Java source files?', '{".java", ".class", ".jar", ".exe"}', 0, 1, 'easy', 15),
('Which of these is NOT a primitive data type in Java?', '{"int", "boolean", "String", "double"}', 2, 1, 'easy', 15),
('What symbol is used for single-line comments in Java?', '{"//", "/*", "#", "--"}', 0, 1, 'easy', 15);

-- Enable realtime for live tracking
ALTER TABLE public.quiz_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.quiz_results REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_results;
