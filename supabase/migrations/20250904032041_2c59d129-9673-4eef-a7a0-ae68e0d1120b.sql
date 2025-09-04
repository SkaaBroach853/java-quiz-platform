-- Create table for logging cheating events
CREATE TABLE public.cheating_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.quiz_users(id) NOT NULL,
  user_email TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'tab_switch', 'window_blur', 'right_click', 'keyboard_shortcut', 'multiple_screens'
  event_description TEXT,
  question_number INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  session_id TEXT
);

-- Enable RLS
ALTER TABLE public.cheating_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for cheating_logs
CREATE POLICY "Allow public access to cheating_logs" 
ON public.cheating_logs 
FOR ALL 
USING (true);

-- Add name column to quiz_users if it doesn't exist
ALTER TABLE public.quiz_users 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Create indexes for better performance
CREATE INDEX idx_cheating_logs_user_id ON public.cheating_logs(user_id);
CREATE INDEX idx_cheating_logs_timestamp ON public.cheating_logs(timestamp);
CREATE INDEX idx_cheating_logs_event_type ON public.cheating_logs(event_type);