-- Add company_id to remaining business tables
DO $$ 
BEGIN
  -- Inventory tables
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'company_id') THEN
    ALTER TABLE public.inventory_items ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_inventory_items_company_id ON public.inventory_items(company_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'company_id') THEN
    ALTER TABLE public.inventory_movements ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_inventory_movements_company_id ON public.inventory_movements(company_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_reservations' AND column_name = 'company_id') THEN
    ALTER TABLE public.inventory_reservations ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_inventory_reservations_company_id ON public.inventory_reservations(company_id);
  END IF;

  -- Timesheet tables
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timesheets_entries' AND column_name = 'company_id') THEN
    ALTER TABLE public.timesheets_entries ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_timesheets_entries_company_id ON public.timesheets_entries(company_id);
  END IF;

  -- Agenda and events
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agenda_events' AND column_name = 'company_id') THEN
    ALTER TABLE public.agenda_events ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_agenda_events_company_id ON public.agenda_events(company_id);
  END IF;

  -- Notifications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'company_id') THEN
    ALTER TABLE public.notifications ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);
  END IF;

  -- Intervention related tables
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intervention_consumables' AND column_name = 'company_id') THEN
    ALTER TABLE public.intervention_consumables ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_intervention_consumables_company_id ON public.intervention_consumables(company_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intervention_services' AND column_name = 'company_id') THEN
    ALTER TABLE public.intervention_services ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_intervention_services_company_id ON public.intervention_services(company_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intervention_files' AND column_name = 'company_id') THEN
    ALTER TABLE public.intervention_files ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_intervention_files_company_id ON public.intervention_files(company_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intervention_logs' AND column_name = 'company_id') THEN
    ALTER TABLE public.intervention_logs ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_intervention_logs_company_id ON public.intervention_logs(company_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intervention_assignments' AND column_name = 'company_id') THEN
    ALTER TABLE public.intervention_assignments ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_intervention_assignments_company_id ON public.intervention_assignments(company_id);
  END IF;

  -- Templates and settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doc_templates' AND column_name = 'company_id') THEN
    ALTER TABLE public.doc_templates ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_doc_templates_company_id ON public.doc_templates(company_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'company_id') THEN
    ALTER TABLE public.company_settings ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_company_settings_company_id ON public.company_settings(company_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dashboard_prefs' AND column_name = 'company_id') THEN
    ALTER TABLE public.dashboard_prefs ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_dashboard_prefs_company_id ON public.dashboard_prefs(company_id);
  END IF;
END $$;

-- Update RLS policies for inventory tables
DROP POLICY IF EXISTS "Users can view their company inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can create inventory in their company" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can update their company inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can delete their company inventory" ON public.inventory_items;

CREATE POLICY "Users can view their company inventory"
  ON public.inventory_items FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can create inventory in their company"
  ON public.inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company inventory"
  ON public.inventory_items FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company inventory"
  ON public.inventory_items FOR DELETE
  TO authenticated
  USING (company_id = get_user_company_id());