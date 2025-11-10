-- Table pour les préférences d'affichage utilisateur
CREATE TABLE IF NOT EXISTS public.user_display_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  page TEXT NOT NULL,
  visible_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_views JSONB DEFAULT '[]'::jsonb,
  active_view TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, page)
);

-- Enable RLS
ALTER TABLE public.user_display_settings ENABLE ROW LEVEL SECURITY;

-- Policies pour accès utilisateur
CREATE POLICY "Users can view their own display settings"
ON public.user_display_settings
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own display settings"
ON public.user_display_settings
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own display settings"
ON public.user_display_settings
FOR UPDATE
USING (true);

CREATE POLICY "Users can delete their own display settings"
ON public.user_display_settings
FOR DELETE
USING (true);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_display_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_display_settings_updated_at
BEFORE UPDATE ON public.user_display_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_display_settings_updated_at();