-- Fix security issue: set search_path for trigger function
CREATE OR REPLACE FUNCTION public.update_support_conversations_updated_at()
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