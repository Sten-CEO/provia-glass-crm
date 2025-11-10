-- Ajouter les champs de planification d'intervention dans les devis
ALTER TABLE public.devis
ADD COLUMN IF NOT EXISTS auto_create_job_on_accept boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS planned_date date,
ADD COLUMN IF NOT EXISTS planned_start_time time,
ADD COLUMN IF NOT EXISTS planned_duration_minutes integer,
ADD COLUMN IF NOT EXISTS assignee_id uuid,
ADD COLUMN IF NOT EXISTS site_address text;

-- Ajouter un champ pour lier l'intervention au devis (si pas déjà présent)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.devis(id) ON DELETE SET NULL;

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_jobs_quote_id ON public.jobs(quote_id);
CREATE INDEX IF NOT EXISTS idx_devis_auto_create ON public.devis(auto_create_job_on_accept) WHERE auto_create_job_on_accept = true;