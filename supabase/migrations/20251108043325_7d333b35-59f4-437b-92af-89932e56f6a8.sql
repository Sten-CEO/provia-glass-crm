-- Create planning_events table for linking jobs to calendar events
CREATE TABLE IF NOT EXISTS public.planning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  employee_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planning_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access on planning_events"
  ON public.planning_events FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access on planning_events"
  ON public.planning_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access on planning_events"
  ON public.planning_events FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access on planning_events"
  ON public.planning_events FOR DELETE
  USING (true);

-- Add planning_event_id to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS planning_event_id UUID REFERENCES public.planning_events(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_quote_id UUID,
ADD COLUMN IF NOT EXISTS linked_invoice_id UUID;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_planning_events_job_id ON public.planning_events(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_planning_event_id ON public.jobs(planning_event_id);