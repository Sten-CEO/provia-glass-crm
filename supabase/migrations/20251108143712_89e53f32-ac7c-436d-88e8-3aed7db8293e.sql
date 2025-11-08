-- Create enum for timesheet entry status
CREATE TYPE public.timesheet_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- Add hourly_rate to equipe table if not exists
ALTER TABLE public.equipe 
ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0;

-- Create timesheets_entries table
CREATE TABLE public.timesheets_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.equipe(id) ON DELETE CASCADE NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  date date NOT NULL,
  start_at time,
  end_at time,
  break_min integer DEFAULT 0,
  hours numeric NOT NULL DEFAULT 0,
  hourly_rate numeric DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  note text,
  status public.timesheet_status NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add converted_to fields to devis table
ALTER TABLE public.devis
ADD COLUMN IF NOT EXISTS converted_to_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS converted_to_invoice_id uuid REFERENCES public.factures(id) ON DELETE SET NULL;

-- Add converted_from_quote_id to jobs and factures
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS converted_from_quote_id uuid REFERENCES public.devis(id) ON DELETE SET NULL;

ALTER TABLE public.factures
ADD COLUMN IF NOT EXISTS converted_from_quote_id uuid REFERENCES public.devis(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.timesheets_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timesheets_entries
CREATE POLICY "Allow public read access on timesheets_entries"
  ON public.timesheets_entries FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access on timesheets_entries"
  ON public.timesheets_entries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access on timesheets_entries"
  ON public.timesheets_entries FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access on timesheets_entries"
  ON public.timesheets_entries FOR DELETE
  USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_timesheets_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_timesheets_entries_updated_at
  BEFORE UPDATE ON public.timesheets_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timesheets_entries_updated_at();