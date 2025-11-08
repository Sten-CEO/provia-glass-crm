-- Phase 1: Add expiry_date to devis (quotes)
ALTER TABLE public.devis 
ADD COLUMN IF NOT EXISTS expiry_date date;

-- Phase 2: Extend jobs table for detailed tracking
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS location_gps jsonb,
ADD COLUMN IF NOT EXISTS scheduled_start timestamp with time zone,
ADD COLUMN IF NOT EXISTS scheduled_end timestamp with time zone,
ADD COLUMN IF NOT EXISTS assigned_employee_ids text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS time_entries jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS costs jsonb DEFAULT '[]'::jsonb;

-- Add comments for clarity
COMMENT ON COLUMN public.devis.expiry_date IS 'Date d''expiration du devis';
COMMENT ON COLUMN public.jobs.location_gps IS 'GPS coordinates {lat, lng}';
COMMENT ON COLUMN public.jobs.scheduled_start IS 'Date et heure de début planifiée';
COMMENT ON COLUMN public.jobs.scheduled_end IS 'Date et heure de fin planifiée';
COMMENT ON COLUMN public.jobs.assigned_employee_ids IS 'IDs des employés assignés';
COMMENT ON COLUMN public.jobs.time_entries IS 'Saisies de temps: [{id, employee_id, start_at, end_at}]';
COMMENT ON COLUMN public.jobs.costs IS 'Coûts: [{id, label, qty, unit_cost}]';