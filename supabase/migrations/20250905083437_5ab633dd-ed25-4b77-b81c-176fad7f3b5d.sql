-- Add branch column to quiz_users for storing student branch
ALTER TABLE public.quiz_users
ADD COLUMN IF NOT EXISTS branch text;