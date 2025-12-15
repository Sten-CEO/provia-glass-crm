-- ================================================================
-- SCRIPT SQL À EXÉCUTER DANS SUPABASE DASHBOARD > SQL EDITOR
-- Copie-colle tout ce fichier et clique sur "Run"
-- ================================================================

-- ========================================
-- PARTIE 1: TRIGGERS POUR AUTO-SET company_id
-- ========================================

-- 1. JOBS (Interventions)
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

-- 2. FACTURES (Invoices)
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

-- 3. AGENDA_EVENTS (Planification)
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

-- 4. EVENT_CLIENTS
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

-- 5. EVENT_ASSIGNEES
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

-- 6. INTERVENTION_CONSUMABLES
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

-- 7. INTERVENTION_SERVICES
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

-- 8. CLIENTS
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

-- 9. DEVIS (Quotes)
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

-- 10. PAIEMENTS
CREATE OR REPLACE FUNCTION set_paiements_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_paiements_company_id ON public.paiements;
CREATE TRIGGER trigger_set_paiements_company_id
  BEFORE INSERT ON public.paiements
  FOR EACH ROW
  EXECUTE FUNCTION set_paiements_company_id();

-- ========================================
-- PARTIE 2: SUPPRIMER LES ANCIENNES POLICIES "Allow public"
-- ========================================

-- jobs
DROP POLICY IF EXISTS "Allow public read access on jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow public insert access on jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow public update access on jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow public delete access on jobs" ON public.jobs;

-- factures
DROP POLICY IF EXISTS "Allow public read access on factures" ON public.factures;
DROP POLICY IF EXISTS "Allow public insert access on factures" ON public.factures;
DROP POLICY IF EXISTS "Allow public update access on factures" ON public.factures;
DROP POLICY IF EXISTS "Allow public delete access on factures" ON public.factures;

-- agenda_events
DROP POLICY IF EXISTS "Allow public read access on agenda_events" ON public.agenda_events;
DROP POLICY IF EXISTS "Allow public insert access on agenda_events" ON public.agenda_events;
DROP POLICY IF EXISTS "Allow public update access on agenda_events" ON public.agenda_events;
DROP POLICY IF EXISTS "Allow public delete access on agenda_events" ON public.agenda_events;

-- paiements
DROP POLICY IF EXISTS "Allow public read access on paiements" ON public.paiements;
DROP POLICY IF EXISTS "Allow public insert access on paiements" ON public.paiements;
DROP POLICY IF EXISTS "Allow public update access on paiements" ON public.paiements;
DROP POLICY IF EXISTS "Allow public delete access on paiements" ON public.paiements;

-- ========================================
-- PARTIE 3: CRÉER LES NOUVELLES POLICIES
-- ========================================

-- JOBS
DROP POLICY IF EXISTS "Users can view their company jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can create jobs in their company" ON public.jobs;
DROP POLICY IF EXISTS "Users can update their company jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete their company jobs" ON public.jobs;

CREATE POLICY "Users can view their company jobs"
  ON public.jobs FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can create jobs in their company"
  ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company jobs"
  ON public.jobs FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company jobs"
  ON public.jobs FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());

-- FACTURES
DROP POLICY IF EXISTS "Users can view their company factures" ON public.factures;
DROP POLICY IF EXISTS "Users can create factures in their company" ON public.factures;
DROP POLICY IF EXISTS "Users can update their company factures" ON public.factures;
DROP POLICY IF EXISTS "Users can delete their company factures" ON public.factures;

CREATE POLICY "Users can view their company factures"
  ON public.factures FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can create factures in their company"
  ON public.factures FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company factures"
  ON public.factures FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company factures"
  ON public.factures FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());

-- AGENDA_EVENTS
DROP POLICY IF EXISTS "Users can view their company events" ON public.agenda_events;
DROP POLICY IF EXISTS "Users can create events in their company" ON public.agenda_events;
DROP POLICY IF EXISTS "Users can update their company events" ON public.agenda_events;
DROP POLICY IF EXISTS "Users can delete their company events" ON public.agenda_events;

CREATE POLICY "Users can view their company events"
  ON public.agenda_events FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can create events in their company"
  ON public.agenda_events FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company events"
  ON public.agenda_events FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company events"
  ON public.agenda_events FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());

-- PAIEMENTS
DROP POLICY IF EXISTS "Users can view their company paiements" ON public.paiements;
DROP POLICY IF EXISTS "Users can create paiements in their company" ON public.paiements;
DROP POLICY IF EXISTS "Users can update their company paiements" ON public.paiements;
DROP POLICY IF EXISTS "Users can delete their company paiements" ON public.paiements;

CREATE POLICY "Users can view their company paiements"
  ON public.paiements FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can create paiements in their company"
  ON public.paiements FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company paiements"
  ON public.paiements FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company paiements"
  ON public.paiements FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());

-- EVENT_CLIENTS
DROP POLICY IF EXISTS "Users can view their company event clients" ON public.event_clients;
DROP POLICY IF EXISTS "Users can manage their company event clients" ON public.event_clients;

CREATE POLICY "Users can view their company event clients"
  ON public.event_clients FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company event clients"
  ON public.event_clients FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- EVENT_ASSIGNEES
DROP POLICY IF EXISTS "Users can view their company event assignees" ON public.event_assignees;
DROP POLICY IF EXISTS "Users can manage their company event assignees" ON public.event_assignees;

CREATE POLICY "Users can view their company event assignees"
  ON public.event_assignees FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company event assignees"
  ON public.event_assignees FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ========================================
-- FIN DU SCRIPT
-- ========================================
-- Après exécution, teste la création d'une intervention/facture/paiement
