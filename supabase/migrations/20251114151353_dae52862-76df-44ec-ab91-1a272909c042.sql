-- Fix security issues from linter

-- Add RLS policies for quiz_sessions
CREATE POLICY "Admins can manage all sessions"
ON public.quiz_sessions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can view own sessions"
ON public.quiz_sessions
FOR SELECT
USING (user_id IN (SELECT id FROM quiz_users WHERE email = auth.email()));

CREATE POLICY "Students can update own sessions"
ON public.quiz_sessions
FOR UPDATE
USING (user_id IN (SELECT id FROM quiz_users WHERE email = auth.email()));

-- Fix search_path for all functions
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM quizzes WHERE access_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_unique_link()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    link := substring(md5(random()::text) from 1 for 16);
    SELECT EXISTS(SELECT 1 FROM quizzes WHERE unique_link = link) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN link;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE quiz_sessions
  SET is_active = false
  WHERE is_active = true
    AND last_activity < NOW() - INTERVAL '30 minutes';
END;
$$;

CREATE OR REPLACE FUNCTION public.update_session_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE quiz_sessions
  SET last_activity = NOW()
  WHERE user_id = NEW.id
    AND is_active = true;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_quiz_session(p_user_email text, p_access_code text, p_current_question_index integer DEFAULT 0)
RETURNS TABLE(session_id uuid, user_id uuid, is_new_session boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_session_id UUID;
  v_existing_session_id UUID;
  v_is_new_session BOOLEAN := false;
BEGIN
  INSERT INTO quiz_users (email, access_code, started_at)
  VALUES (p_user_email, p_access_code, NOW())
  ON CONFLICT (email) 
  DO UPDATE SET 
    access_code = EXCLUDED.access_code,
    current_question_index = p_current_question_index,
    updated_at = NOW()
  RETURNING id INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id 
    FROM quiz_users 
    WHERE access_code = p_access_code;
  END IF;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Could not find or create user with email % and access_code %', p_user_email, p_access_code;
  END IF;
  
  SELECT id INTO v_existing_session_id
  FROM quiz_sessions 
  WHERE user_id = v_user_id AND is_active = true
  LIMIT 1;
  
  IF v_existing_session_id IS NOT NULL THEN
    UPDATE quiz_sessions 
    SET 
      last_activity = NOW(),
      updated_at = NOW()
    WHERE id = v_existing_session_id;
    
    v_session_id := v_existing_session_id;
    v_is_new_session := false;
  ELSE
    INSERT INTO quiz_sessions (user_id, started_at, last_activity)
    VALUES (v_user_id, NOW(), NOW())
    RETURNING id INTO v_session_id;
    
    v_is_new_session := true;
  END IF;
  
  UPDATE quiz_users 
  SET 
    started_at = COALESCE(started_at, NOW()),
    current_question_index = p_current_question_index,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  RETURN QUERY
  SELECT v_session_id, v_user_id, v_is_new_session;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_session_activity(p_user_id uuid, p_current_question_index integer DEFAULT NULL::integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_count INTEGER := 0;
BEGIN
  UPDATE quiz_sessions 
  SET 
    last_activity = NOW(),
    updated_at = NOW()
  WHERE 
    user_id = p_user_id 
    AND is_active = true;
    
  GET DIAGNOSTICS v_session_count = ROW_COUNT;
  
  IF p_current_question_index IS NOT NULL THEN
    UPDATE quiz_users 
    SET 
      current_question_index = p_current_question_index,
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
  
  RETURN v_session_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_quiz_session(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_count INTEGER := 0;
BEGIN
  UPDATE quiz_sessions 
  SET 
    is_active = false,
    ended_at = NOW(),
    last_activity = NOW(),
    updated_at = NOW()
  WHERE 
    user_id = p_user_id 
    AND is_active = true;
    
  GET DIAGNOSTICS v_session_count = ROW_COUNT;
  
  UPDATE quiz_users 
  SET 
    has_completed = true,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN v_session_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_by_access_code(p_access_code text)
RETURNS TABLE(id uuid, email text, access_code text, has_completed boolean, current_question_index integer, started_at timestamp with time zone, completed_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.access_code,
    u.has_completed,
    u.current_question_index,
    u.started_at,
    u.completed_at
  FROM quiz_users u
  WHERE u.access_code = p_access_code;
END;
$$;