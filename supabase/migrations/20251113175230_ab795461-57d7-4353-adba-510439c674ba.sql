-- Create timesheets_events table for detailed employee time tracking
CREATE TABLE IF NOT EXISTS public.timesheets_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.equipe(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('start_day', 'pause_start', 'pause_end', 'stop_day', 'manual')),
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  duration_minutes INTEGER,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timesheets_events_employee ON public.timesheets_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_events_at ON public.timesheets_events(at);

ALTER TABLE public.timesheets_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access on timesheets_events"
ON public.timesheets_events
FOR ALL
USING (true)
WITH CHECK (true);

-- Create agenda_events table
CREATE TABLE IF NOT EXISTS public.agenda_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL DEFAULT 'autre' CHECK (type IN ('rdv', 'demo', 'appel', 'autre')),
  status TEXT NOT NULL DEFAULT 'à venir' CHECK (status IN ('à venir', 'aujourd''hui', 'passé', 'annulé')),
  attendees TEXT[] DEFAULT ARRAY[]::TEXT[],
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agenda_events_start ON public.agenda_events(start_at);
CREATE INDEX IF NOT EXISTS idx_agenda_events_status ON public.agenda_events(status);

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access on agenda_events"
ON public.agenda_events
FOR ALL
USING (true)
WITH CHECK (true);

-- Create dashboard_prefs table
CREATE TABLE IF NOT EXISTS public.dashboard_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  alerts_enabled JSONB NOT NULL DEFAULT '{
    "invoices_to_send": true,
    "overdue_invoices": true,
    "quotes_unanswered": true,
    "jobs_today": true,
    "low_stock": true,
    "timesheet_alerts": true
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access on dashboard_prefs"
ON public.dashboard_prefs
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable realtime for timesheets_events and agenda_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.timesheets_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agenda_events;