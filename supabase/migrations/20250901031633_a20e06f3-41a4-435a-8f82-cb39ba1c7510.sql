
-- Add the missing column used by the app when saving results
ALTER TABLE public.quiz_results
ADD COLUMN IF NOT EXISTS total_questions integer;
