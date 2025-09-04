-- Fix search path for existing functions by handling trigger dependencies properly
DROP TRIGGER IF EXISTS trigger_update_session_activity ON quiz_users;
DROP FUNCTION IF EXISTS public.update_session_activity() CASCADE;

CREATE OR REPLACE FUNCTION public.update_session_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Update the corresponding session's last_activity
  UPDATE quiz_sessions 
  SET last_activity = NOW() 
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER trigger_update_session_activity
    AFTER UPDATE ON quiz_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_session_activity();

-- Also fix the cleanup function
DROP FUNCTION IF EXISTS public.cleanup_inactive_sessions();
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE quiz_sessions 
  SET is_active = false 
  WHERE is_active = true 
    AND last_activity < NOW() - INTERVAL '30 minutes';
END;
$function$;