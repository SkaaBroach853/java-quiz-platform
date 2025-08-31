
-- Add a function to automatically remove inactive users from quiz_sessions
-- A user is considered inactive if their last_activity is older than 30 minutes
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  UPDATE quiz_sessions 
  SET is_active = false 
  WHERE is_active = true 
    AND last_activity < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update last_activity when quiz_users is updated
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the corresponding session's last_activity
  UPDATE quiz_sessions 
  SET last_activity = NOW() 
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on quiz_users table
DROP TRIGGER IF EXISTS trigger_update_session_activity ON quiz_users;
CREATE TRIGGER trigger_update_session_activity
  AFTER UPDATE ON quiz_users
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();

-- Add RLS policies for admin operations on quiz_sessions and quiz_results
CREATE POLICY "Allow public delete access to quiz_sessions" 
  ON quiz_sessions 
  FOR DELETE 
  USING (true);

CREATE POLICY "Allow public delete access to quiz_results" 
  ON quiz_results 
  FOR DELETE 
  USING (true);
