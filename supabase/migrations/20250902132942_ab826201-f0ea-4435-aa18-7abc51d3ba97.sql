-- Remove the existing time limit constraint and add a new one that allows 0 and 45
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_time_limit_check;

-- Add new constraint that allows 0 (no time limit), 15, 30, 45, 60 seconds
ALTER TABLE questions ADD CONSTRAINT questions_time_limit_check 
CHECK (time_limit IN (0, 15, 30, 45, 60));