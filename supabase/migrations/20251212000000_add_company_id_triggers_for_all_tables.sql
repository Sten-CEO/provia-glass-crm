-- Migration: Add company_id triggers for all business tables
-- This ensures that company_id is automatically set when inserting records
-- The RLS policies require company_id to match get_user_company_id()

-- ========================================
-- 1. JOBS (Interventions) TABLE
-- ========================================

CREATE OR REPLACE FUNCTION set_jobs_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_jobs_company_id ON public.jobs;
CREATE TRIGGER trigger_set_jobs_company_id
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_jobs_company_id();

-- ========================================
-- 2. FACTURES (Invoices) TABLE
-- ========================================

CREATE OR REPLACE FUNCTION set_factures_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_factures_company_id ON public.factures;
CREATE TRIGGER trigger_set_factures_company_id
  BEFORE INSERT ON public.factures
  FOR EACH ROW
  EXECUTE FUNCTION set_factures_company_id();

-- ========================================
-- 3. AGENDA_EVENTS TABLE
-- ========================================

CREATE OR REPLACE FUNCTION set_agenda_events_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_agenda_events_company_id ON public.agenda_events;
CREATE TRIGGER trigger_set_agenda_events_company_id
  BEFORE INSERT ON public.agenda_events
  FOR EACH ROW
  EXECUTE FUNCTION set_agenda_events_company_id();

-- ========================================
-- 4. EVENT_CLIENTS TABLE
-- ========================================

CREATE OR REPLACE FUNCTION set_event_clients_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_event_clients_company_id ON public.event_clients;
CREATE TRIGGER trigger_set_event_clients_company_id
  BEFORE INSERT ON public.event_clients
  FOR EACH ROW
  EXECUTE FUNCTION set_event_clients_company_id();

-- ========================================
-- 5. EVENT_ASSIGNEES TABLE
-- ========================================

CREATE OR REPLACE FUNCTION set_event_assignees_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_event_assignees_company_id ON public.event_assignees;
CREATE TRIGGER trigger_set_event_assignees_company_id
  BEFORE INSERT ON public.event_assignees
  FOR EACH ROW
  EXECUTE FUNCTION set_event_assignees_company_id();

-- ========================================
-- 6. INTERVENTION_CONSUMABLES TABLE
-- ========================================

CREATE OR REPLACE FUNCTION set_intervention_consumables_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_intervention_consumables_company_id ON public.intervention_consumables;
CREATE TRIGGER trigger_set_intervention_consumables_company_id
  BEFORE INSERT ON public.intervention_consumables
  FOR EACH ROW
  EXECUTE FUNCTION set_intervention_consumables_company_id();

-- ========================================
-- 7. INTERVENTION_SERVICES TABLE
-- ========================================

CREATE OR REPLACE FUNCTION set_intervention_services_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_intervention_services_company_id ON public.intervention_services;
CREATE TRIGGER trigger_set_intervention_services_company_id
  BEFORE INSERT ON public.intervention_services
  FOR EACH ROW
  EXECUTE FUNCTION set_intervention_services_company_id();

-- ========================================
-- 8. CLIENTS TABLE
-- ========================================

CREATE OR REPLACE FUNCTION set_clients_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_clients_company_id ON public.clients;
CREATE TRIGGER trigger_set_clients_company_id
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION set_clients_company_id();

-- ========================================
-- 9. DEVIS (Quotes) TABLE
-- ========================================

CREATE OR REPLACE FUNCTION set_devis_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_devis_company_id ON public.devis;
CREATE TRIGGER trigger_set_devis_company_id
  BEFORE INSERT ON public.devis
  FOR EACH ROW
  EXECUTE FUNCTION set_devis_company_id();

-- ========================================
-- 10. ENSURE RLS POLICIES FOR JOBS
-- ========================================

-- Drop old public access policies if they exist
DROP POLICY IF EXISTS "Allow public read access on jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow public insert access on jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow public update access on jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow public delete access on jobs" ON public.jobs;

-- Drop existing company-scoped policies to recreate them
DROP POLICY IF EXISTS "Users can view their company jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can create jobs in their company" ON public.jobs;
DROP POLICY IF EXISTS "Users can update their company jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete their company jobs" ON public.jobs;

-- Create new RLS policies for jobs
CREATE POLICY "Users can view their company jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can create jobs in their company"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (company_id = get_user_company_id());

-- ========================================
-- 11. ENSURE RLS POLICIES FOR AGENDA_EVENTS
-- ========================================

DROP POLICY IF EXISTS "Users can view their company events" ON public.agenda_events;
DROP POLICY IF EXISTS "Users can create events in their company" ON public.agenda_events;
DROP POLICY IF EXISTS "Users can update their company events" ON public.agenda_events;
DROP POLICY IF EXISTS "Users can delete their company events" ON public.agenda_events;

CREATE POLICY "Users can view their company events"
  ON public.agenda_events FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can create events in their company"
  ON public.agenda_events FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company events"
  ON public.agenda_events FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company events"
  ON public.agenda_events FOR DELETE
  TO authenticated
  USING (company_id = get_user_company_id());

-- ========================================
-- 12. ENSURE RLS POLICIES FOR EVENT_CLIENTS
-- ========================================

DROP POLICY IF EXISTS "Users can view their company event clients" ON public.event_clients;
DROP POLICY IF EXISTS "Users can manage their company event clients" ON public.event_clients;

CREATE POLICY "Users can view their company event clients"
  ON public.event_clients FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company event clients"
  ON public.event_clients FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ========================================
-- 13. ENSURE RLS POLICIES FOR EVENT_ASSIGNEES
-- ========================================

DROP POLICY IF EXISTS "Users can view their company event assignees" ON public.event_assignees;
DROP POLICY IF EXISTS "Users can manage their company event assignees" ON public.event_assignees;

CREATE POLICY "Users can view their company event assignees"
  ON public.event_assignees FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company event assignees"
  ON public.event_assignees FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ========================================
-- 14. ENSURE RLS POLICIES FOR INTERVENTION_CONSUMABLES
-- ========================================

DROP POLICY IF EXISTS "Users can view their company intervention consumables" ON public.intervention_consumables;
DROP POLICY IF EXISTS "Users can manage their company intervention consumables" ON public.intervention_consumables;

CREATE POLICY "Users can view their company intervention consumables"
  ON public.intervention_consumables FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company intervention consumables"
  ON public.intervention_consumables FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ========================================
-- 15. ENSURE RLS POLICIES FOR INTERVENTION_SERVICES
-- ========================================

DROP POLICY IF EXISTS "Users can view their company intervention services" ON public.intervention_services;
DROP POLICY IF EXISTS "Users can manage their company intervention services" ON public.intervention_services;

CREATE POLICY "Users can view their company intervention services"
  ON public.intervention_services FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company intervention services"
  ON public.intervention_services FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON FUNCTION set_jobs_company_id() IS
'Auto-sets company_id from the authenticated user when inserting a job/intervention';

COMMENT ON FUNCTION set_factures_company_id() IS
'Auto-sets company_id from the authenticated user when inserting an invoice';

COMMENT ON FUNCTION set_agenda_events_company_id() IS
'Auto-sets company_id from the authenticated user when inserting an agenda event';
