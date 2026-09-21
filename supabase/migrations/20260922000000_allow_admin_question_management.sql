-- Questions are attached to a quiz. Only authenticated users assigned the
-- admin role may create, change, or delete them.
CREATE POLICY "Admins can manage all questions"
ON public.questions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
