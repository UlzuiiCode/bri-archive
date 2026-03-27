-- Fix overly permissive notification insert policy
DROP POLICY "System can create notifications" ON public.notifications;

CREATE POLICY "Users can create own notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can create any notification" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));