-- Add missing foreign keys to enable PostgREST relationships for nested selects
-- and speed up admin dashboards joins

-- 1) quiz_results.user_id -> quiz_users.id
ALTER TABLE public.quiz_results
ADD CONSTRAINT fk_quiz_results_user
FOREIGN KEY (user_id)
REFERENCES public.quiz_users (id)
ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON public.quiz_results(user_id);

-- 2) quiz_sessions.user_id -> quiz_users.id
ALTER TABLE public.quiz_sessions
ADD CONSTRAINT fk_quiz_sessions_user
FOREIGN KEY (user_id)
REFERENCES public.quiz_users (id)
ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON public.quiz_sessions(user_id);

-- Optional: ensure tables are part of realtime publication (safe no-op if already)
-- Note: This is safe and idempotent; if the table is already in publication, it will be ignored.
DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_sessions';
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
