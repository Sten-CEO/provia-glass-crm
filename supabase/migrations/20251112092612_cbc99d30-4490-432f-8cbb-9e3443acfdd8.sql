-- Table notifications pour les employés
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.equipe(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('job_assigned', 'job_modified', 'job_reminder', 'timesheet_validated', 'timesheet_rejected', 'planning_changed')),
  title TEXT NOT NULL,
  message TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_notifications_employee_id ON public.notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at) WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies pour notifications: employé ne voit que ses notifs
CREATE POLICY "Employees can view their own notifications"
ON public.notifications
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.equipe WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Employees can update their own notifications"
ON public.notifications
FOR UPDATE
USING (
  employee_id IN (
    SELECT id FROM public.equipe WHERE user_id = auth.uid()
  )
);

-- Admins/managers peuvent créer des notifications
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Améliorer la table intervention_files pour photos avec métadonnées
ALTER TABLE public.intervention_files 
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.equipe(id),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- RLS pour intervention_files: employé voit ses fichiers OU fichiers des interventions assignées
CREATE POLICY "Employees can view files from their interventions"
ON public.intervention_files
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.equipe WHERE user_id = auth.uid()
  )
  OR
  intervention_id IN (
    SELECT ia.intervention_id 
    FROM intervention_assignments ia
    JOIN equipe e ON e.id = ia.employee_id
    WHERE e.user_id = auth.uid()
  )
);

CREATE POLICY "Employees can insert files for their interventions"
ON public.intervention_files
FOR INSERT
WITH CHECK (
  intervention_id IN (
    SELECT ia.intervention_id 
    FROM intervention_assignments ia
    JOIN equipe e ON e.id = ia.employee_id
    WHERE e.user_id = auth.uid()
  )
);

-- Améliorer timesheets_entries pour supporter type 'day' et 'job'
ALTER TABLE public.timesheets_entries
ADD COLUMN IF NOT EXISTS timesheet_type TEXT DEFAULT 'job' CHECK (timesheet_type IN ('day', 'job'));

COMMENT ON COLUMN public.timesheets_entries.timesheet_type IS 'Type: day (journée complète) ou job (intervention spécifique)';

-- RLS pour timesheets: employé ne voit que ses propres timesheets
DROP POLICY IF EXISTS "Employees can view their own timesheets" ON public.timesheets_entries;
CREATE POLICY "Employees can view their own timesheets"
ON public.timesheets_entries
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.equipe WHERE user_id = auth.uid()
  )
  OR
  has_role(auth.uid(), 'admin'::app_role)
  OR
  has_role(auth.uid(), 'manager'::app_role)
);

DROP POLICY IF EXISTS "Employees can insert their own timesheets" ON public.timesheets_entries;
CREATE POLICY "Employees can insert their own timesheets"
ON public.timesheets_entries
FOR INSERT
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.equipe WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Employees can update their own timesheets" ON public.timesheets_entries;
CREATE POLICY "Employees can update their own timesheets"
ON public.timesheets_entries
FOR UPDATE
USING (
  employee_id IN (
    SELECT id FROM public.equipe WHERE user_id = auth.uid()
  )
);