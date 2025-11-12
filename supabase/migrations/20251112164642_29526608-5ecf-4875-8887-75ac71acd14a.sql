-- Ajouter une table pour gérer les pauses dans le pointage

CREATE TABLE IF NOT EXISTS public.timesheet_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_entry_id UUID NOT NULL REFERENCES public.timesheets_entries(id) ON DELETE CASCADE,
  start_at TIME NOT NULL,
  end_at TIME,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN end_at IS NOT NULL THEN
        EXTRACT(EPOCH FROM (end_at - start_at)) / 60
      ELSE NULL
    END
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_timesheet_breaks_entry_id ON public.timesheet_breaks(timesheet_entry_id);

-- RLS policies
ALTER TABLE public.timesheet_breaks ENABLE ROW LEVEL SECURITY;

-- Employees can manage their own breaks
CREATE POLICY "Employees can manage their own breaks"
ON public.timesheet_breaks
FOR ALL
TO authenticated
USING (
  timesheet_entry_id IN (
    SELECT id FROM public.timesheets_entries
    WHERE employee_id IN (
      SELECT id FROM public.equipe WHERE user_id = auth.uid()
    )
  )
);

-- Managers can view all breaks
CREATE POLICY "Managers can view all breaks"
ON public.timesheet_breaks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.equipe e
    WHERE e.user_id = auth.uid() AND COALESCE(e.is_manager, false) = true
  )
);

-- Admins can manage all breaks
CREATE POLICY "Admins can manage all breaks"
ON public.timesheet_breaks
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));