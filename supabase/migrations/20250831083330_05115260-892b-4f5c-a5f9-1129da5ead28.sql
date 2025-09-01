
-- Add current_session_id column to quiz_users table for single login enforcement
ALTER TABLE quiz_users ADD COLUMN current_session_id text;
