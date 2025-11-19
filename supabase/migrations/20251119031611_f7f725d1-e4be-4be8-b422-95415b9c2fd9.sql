
-- Drop overly permissive notification policies
DROP POLICY IF EXISTS "Users can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete notifications" ON public.notifications;

-- Create company-scoped notification policies
CREATE POLICY "Users can view their company notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create notifications in their company"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (company_id = get_user_company_id());
