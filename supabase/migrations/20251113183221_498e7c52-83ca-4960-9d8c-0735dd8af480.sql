-- Adjust notifications table schema for full CRM notifications system
-- Add missing columns: company_id, kind, link, actor_id

-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Employees can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Employees can view their own notifications" ON public.notifications;

-- Alter notifications table
ALTER TABLE public.notifications 
  DROP COLUMN IF EXISTS employee_id,
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS read boolean DEFAULT false,
  ALTER COLUMN type DROP NOT NULL;

-- Create index on company_id for performance
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Create RLS policies for company-scoped access
CREATE POLICY "Users can view all notifications"
  ON public.notifications
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update notifications"
  ON public.notifications
  FOR UPDATE
  USING (true);

-- Update create_notification function to use new schema
CREATE OR REPLACE FUNCTION public.create_notification(
  p_kind text, 
  p_title text, 
  p_message text, 
  p_link text DEFAULT NULL::text, 
  p_actor_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_notif_id UUID;
BEGIN
  INSERT INTO public.notifications (kind, title, message, link, actor_id, type)
  VALUES (p_kind, p_title, p_message, p_link, p_actor_id, p_kind)
  RETURNING id INTO v_notif_id;
  
  RETURN v_notif_id;
END;
$$;