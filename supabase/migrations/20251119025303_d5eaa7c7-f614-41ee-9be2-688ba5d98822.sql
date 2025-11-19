-- ========================================
-- MULTI-TENANT ARCHITECTURE - PART 1
-- Create companies table and add company_id columns
-- ========================================

-- 1. Create companies table WITHOUT RLS policies yet
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  country TEXT DEFAULT 'France',
  currency TEXT DEFAULT 'EUR',
  settings JSONB DEFAULT '{}'::jsonb
);

-- 2. Add company_id to user_roles FIRST
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON public.user_roles(company_id);

-- 3. NOW create helper function
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- 4. NOW enable RLS and create policies on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own company"
ON public.companies FOR SELECT
USING (
  id IN (
    SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company owners can update their company"
ON public.companies FOR UPDATE
USING (owner_user_id = auth.uid());

-- 5. Update RLS on user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view roles in their company"
ON public.user_roles FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

-- 6. Add company_id to ALL business tables
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);

ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_devis_company_id ON public.devis(company_id);

ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_factures_company_id ON public.factures(company_id);

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON public.jobs(company_id);

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON public.contracts(company_id);

ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_agenda_events_company_id ON public.agenda_events(company_id);

ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_inventory_items_company_id ON public.inventory_items(company_id);

ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_id ON public.inventory_movements(company_id);

ALTER TABLE public.inventory_reservations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_company_id ON public.inventory_reservations(company_id);

ALTER TABLE public.material_reservations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_material_reservations_company_id ON public.material_reservations(company_id);

ALTER TABLE public.timesheets_entries ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_timesheets_entries_company_id ON public.timesheets_entries(company_id);

ALTER TABLE public.timesheet_breaks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_timesheet_breaks_company_id ON public.timesheet_breaks(company_id);

ALTER TABLE public.equipe ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_equipe_company_id ON public.equipe(company_id);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications(company_id);

ALTER TABLE public.doc_templates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_doc_templates_company_id ON public.doc_templates(company_id);

ALTER TABLE public.taxes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_taxes_company_id ON public.taxes(company_id);

ALTER TABLE public.service_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_service_items_company_id ON public.service_items(company_id);

ALTER TABLE public.dashboard_prefs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_dashboard_prefs_company_id ON public.dashboard_prefs(company_id);

ALTER TABLE public.document_numbering ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_document_numbering_company_id ON public.document_numbering(company_id);

ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_company_settings_company_id ON public.company_settings(company_id);

ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_attachments_company_id ON public.attachments(company_id);

ALTER TABLE public.client_addresses ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_client_addresses_company_id ON public.client_addresses(company_id);

ALTER TABLE public.client_contracts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_client_contracts_company_id ON public.client_contracts(company_id);

ALTER TABLE public.intervention_assignments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_intervention_assignments_company_id ON public.intervention_assignments(company_id);

ALTER TABLE public.intervention_consumables ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_intervention_consumables_company_id ON public.intervention_consumables(company_id);

ALTER TABLE public.intervention_services ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_intervention_services_company_id ON public.intervention_services(company_id);

ALTER TABLE public.intervention_files ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_intervention_files_company_id ON public.intervention_files(company_id);

ALTER TABLE public.intervention_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_intervention_logs_company_id ON public.intervention_logs(company_id);

ALTER TABLE public.intervention_feedback ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_intervention_feedback_company_id ON public.intervention_feedback(company_id);

ALTER TABLE public.job_signatures ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_job_signatures_company_id ON public.job_signatures(company_id);

ALTER TABLE public.event_assignees ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_event_assignees_company_id ON public.event_assignees(company_id);

ALTER TABLE public.event_clients ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_event_clients_company_id ON public.event_clients(company_id);

ALTER TABLE public.devices_push_tokens ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_devices_push_tokens_company_id ON public.devices_push_tokens(company_id);