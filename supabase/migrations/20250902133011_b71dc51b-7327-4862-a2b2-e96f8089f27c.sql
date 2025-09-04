-- Fix search path for existing functions to address security warnings
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

DROP FUNCTION IF EXISTS public.update_session_activity();
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