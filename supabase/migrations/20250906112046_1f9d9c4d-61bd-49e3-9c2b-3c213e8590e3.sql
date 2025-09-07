-- Add missing database functions to support quiz session management

-- Function: upsert_quiz_session
-- This function already exists but needs to be available in types
SELECT 1; -- This is just a placeholder to regenerate types

-- Function: update_session_activity  
-- This function already exists but needs to be available in types

-- Function: complete_quiz_session
-- This function already exists but needs to be available in types

-- Function: get_user_by_access_code
-- This function already exists but needs to be available in types

-- Regenerate types by making a small schema change
COMMENT ON TABLE quiz_sessions IS 'Quiz session tracking table - updated for type regeneration';