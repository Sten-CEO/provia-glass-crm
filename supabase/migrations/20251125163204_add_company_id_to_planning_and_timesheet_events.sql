-- POINT 6: Add company_id to planning_events and timesheets_events tables
-- These tables can filter via FK but should have explicit company_id for performance

-- ========================================
-- 1. PLANNING_EVENTS TABLE
-- ========================================

-- Add company_id column
ALTER TABLE public.planning_events
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill company_id from jobs
UPDATE public.planning_events pe
SET company_id = j.company_id
FROM public.jobs j
WHERE pe.job_id = j.id
  AND pe.company_id IS NULL;

-- Make company_id NOT NULL after backfill
ALTER TABLE public.planning_events
  ALTER COLUMN company_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_planning_events_company_id
  ON public.planning_events(company_id);

-- Enable RLS
ALTER TABLE public.planning_events ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their company planning events" ON public.planning_events;
DROP POLICY IF EXISTS "Users can manage their company planning events" ON public.planning_events;

-- Create company-scoped RLS policies
CREATE POLICY "Users can view their company planning events"
  ON public.planning_events FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company planning events"
  ON public.planning_events FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Add trigger to auto-set company_id on INSERT
CREATE OR REPLACE FUNCTION set_planning_events_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.jobs
    WHERE id = NEW.job_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_planning_events_company_id ON public.planning_events;
CREATE TRIGGER trigger_set_planning_events_company_id
  BEFORE INSERT ON public.planning_events
  FOR EACH ROW
  EXECUTE FUNCTION set_planning_events_company_id();

-- ========================================
-- 2. TIMESHEETS_EVENTS TABLE
-- ========================================

-- Add company_id column
ALTER TABLE public.timesheets_events
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill company_id from equipe (employee relationship)
UPDATE public.timesheets_events te
SET company_id = e.company_id
FROM public.equipe e
WHERE te.employee_id = e.id
  AND te.company_id IS NULL;

-- Make company_id NOT NULL after backfill
ALTER TABLE public.timesheets_events
  ALTER COLUMN company_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_timesheets_events_company_id
  ON public.timesheets_events(company_id);

-- Enable RLS
ALTER TABLE public.timesheets_events ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their company timesheet events" ON public.timesheets_events;
DROP POLICY IF EXISTS "Employees can manage their timesheet events" ON public.timesheets_events;

-- Create company-scoped RLS policies
CREATE POLICY "Users can view their company timesheet events"
  ON public.timesheets_events FOR SELECT
  USING (
    company_id = get_user_company_id() OR
    employee_id IN (SELECT id FROM public.equipe WHERE user_id = auth.uid())
  );

CREATE POLICY "Employees can manage their timesheet events"
  ON public.timesheets_events FOR ALL
  USING (
    company_id = get_user_company_id() OR
    employee_id IN (SELECT id FROM public.equipe WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id = get_user_company_id() OR
    employee_id IN (SELECT id FROM public.equipe WHERE user_id = auth.uid())
  );

-- Add trigger to auto-set company_id on INSERT
CREATE OR REPLACE FUNCTION set_timesheets_events_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.equipe
    WHERE id = NEW.employee_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_timesheets_events_company_id ON public.timesheets_events;
CREATE TRIGGER trigger_set_timesheets_events_company_id
  BEFORE INSERT ON public.timesheets_events
  FOR EACH ROW
  EXECUTE FUNCTION set_timesheets_events_company_id();
