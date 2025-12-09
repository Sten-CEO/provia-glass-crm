CREATE OR REPLACE FUNCTION validate_company_id_consistency()
RETURNS TABLE(
  table_name TEXT,
  issue_count BIGINT,
  issue_description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check devis: company_id should match client's company
  RETURN QUERY
  SELECT
    'devis'::TEXT,
    COUNT(*)::BIGINT,
    'Devis company_id mismatch with client company_id'::TEXT
  FROM public.devis d
  JOIN public.clients c ON d.client_id = c.id
  WHERE d.company_id != c.company_id;

  -- Check factures: company_id should match client's company
  RETURN QUERY
  SELECT
    'factures'::TEXT,
    COUNT(*)::BIGINT,
    'Facture company_id mismatch with client company_id'::TEXT
  FROM public.factures f
  JOIN public.clients c ON f.client_id = c.id
  WHERE f.company_id != c.company_id;

  -- Check jobs: company_id should match client's company
  RETURN QUERY
  SELECT
    'jobs'::TEXT,
    COUNT(*)::BIGINT,
    'Job company_id mismatch with client company_id'::TEXT
  FROM public.jobs j
  JOIN public.clients c ON j.client_id = c.id
  WHERE j.company_id != c.company_id;

  -- Check intervention_assignments: company_id should match employee's company
  RETURN QUERY
  SELECT
    'intervention_assignments'::TEXT,
    COUNT(*)::BIGINT,
    'Assignment company_id mismatch with employee company_id'::TEXT
  FROM public.intervention_assignments ia
  JOIN public.equipe e ON ia.employee_id = e.id
  WHERE ia.company_id != e.company_id;

  -- Check intervention_assignments: company_id should match job's company
  RETURN QUERY
  SELECT
    'intervention_assignments'::TEXT,
    COUNT(*)::BIGINT,
    'Assignment company_id mismatch with job company_id'::TEXT
  FROM public.intervention_assignments ia
  JOIN public.jobs j ON ia.intervention_id = j.id
  WHERE ia.company_id != j.company_id;

  -- Check user_roles: all users should have company_id
  RETURN QUERY
  SELECT
    'user_roles'::TEXT,
    COUNT(*)::BIGINT,
    'User roles without company_id'::TEXT
  FROM public.user_roles
  WHERE company_id IS NULL;

  -- Check equipe: all team members should have company_id
  RETURN QUERY
  SELECT
    'equipe'::TEXT,
    COUNT(*)::BIGINT,
    'Team members without company_id'::TEXT
  FROM public.equipe
  WHERE company_id IS NULL;

  -- Check paiements: company_id should match facture's company
  RETURN QUERY
  SELECT
    'paiements'::TEXT,
    COUNT(*)::BIGINT,
    'Payment company_id mismatch with facture company_id'::TEXT
  FROM public.paiements p
  JOIN public.factures f ON p.facture_id = f.id
  WHERE p.company_id != f.company_id;

  -- Check notifications: all should have company_id
  RETURN QUERY
  SELECT
    'notifications'::TEXT,
    COUNT(*)::BIGINT,
    'Notifications without company_id'::TEXT
  FROM public.notifications
  WHERE company_id IS NULL;

  -- Check inventory_movements: company_id should match item's company
  RETURN QUERY
  SELECT
    'inventory_movements'::TEXT,
    COUNT(*)::BIGINT,
    'Inventory movement company_id mismatch with item company_id'::TEXT
  FROM public.inventory_movements im
  JOIN public.inventory_items ii ON im.item_id = ii.id
  WHERE im.company_id != ii.company_id;

  -- Check timesheets_entries: company_id should match employee's company
  RETURN QUERY
  SELECT
    'timesheets_entries'::TEXT,
    COUNT(*)::BIGINT,
    'Timesheet company_id mismatch with employee company_id'::TEXT
  FROM public.timesheets_entries te
  JOIN public.equipe e ON te.employee_id = e.id
  WHERE te.company_id != e.company_id;

  -- Check each company has settings
  RETURN QUERY
  SELECT
    'company_settings'::TEXT,
    COUNT(*)::BIGINT,
    'Companies without company_settings entry'::TEXT
  FROM public.companies c
  LEFT JOIN public.company_settings cs ON c.id = cs.company_id
  WHERE cs.company_id IS NULL;

END;
$$;

-- ========================================
-- 2. CREATE HELPER FUNCTION TO LIST ALL TABLES WITH company_id
-- ========================================

CREATE OR REPLACE FUNCTION list_tables_with_company_id()
RETURNS TABLE(
  table_name TEXT,
  has_company_id BOOLEAN,
  has_rls_enabled BOOLEAN,
  policy_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tablename::TEXT,
    EXISTS(
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_name = t.tablename::text
      AND c.column_name = 'company_id'
    ) as has_company_id,
    t.rowsecurity as has_rls_enabled,
    (
      SELECT COUNT(*)
      FROM pg_policies p
      WHERE p.tablename = t.tablename
    ) as policy_count
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%'
  ORDER BY t.tablename;
END;
$$;

-- ========================================
-- 3. CREATE FUNCTION TO CHECK MISSING RLS POLICIES
-- ========================================

CREATE OR REPLACE FUNCTION check_missing_rls_policies()
RETURNS TABLE(
  table_name TEXT,
  issue TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Tables with company_id but RLS not enabled
  RETURN QUERY
  SELECT
    t.tablename::TEXT,
    'Has company_id but RLS not enabled'::TEXT
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  AND EXISTS(
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_name = t.tablename::text
    AND c.column_name = 'company_id'
  )
  AND NOT t.rowsecurity;

  -- Tables with RLS enabled but no policies
  RETURN QUERY
  SELECT
    t.tablename::TEXT,
    'RLS enabled but no policies defined'::TEXT
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS(
    SELECT 1 FROM pg_policies p
    WHERE p.tablename = t.tablename
  );

  -- Tables with company_id but less than 4 policies (SELECT, INSERT, UPDATE, DELETE)
  RETURN QUERY
  SELECT
    t.tablename::TEXT,
    'Has company_id and RLS but missing some policies (expected 4: SELECT, INSERT, UPDATE, DELETE)'::TEXT
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  AND EXISTS(
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_name = t.tablename::text
    AND c.column_name = 'company_id'
  )
  AND t.rowsecurity = true
  AND (
    SELECT COUNT(*)
    FROM pg_policies p
    WHERE p.tablename = t.tablename
  ) < 2;  -- At least 2 policies (SELECT + ALL or SELECT + INSERT/UPDATE/DELETE combined)

END;
$$;

-- ========================================
-- 4. USAGE EXAMPLES (COMMENTED OUT - RUN MANUALLY)
-- ========================================

-- To validate company_id consistency across tables:
-- SELECT * FROM validate_company_id_consistency() WHERE issue_count > 0;

-- To list all tables and their company_id/RLS status:
-- SELECT * FROM list_tables_with_company_id() ORDER BY has_company_id DESC, table_name;

-- To check for missing RLS policies:
-- SELECT * FROM check_missing_rls_policies();

-- ========================================
-- 5. CREATE CONSTRAINT VALIDATION TRIGGERS (OPTIONAL)
-- ========================================

-- Trigger to prevent inserting devis with different company_id than client
CREATE OR REPLACE FUNCTION validate_devis_company_id()
RETURNS TRIGGER AS $$
DECLARE
  client_company_id UUID;
BEGIN
  SELECT company_id INTO client_company_id
  FROM public.clients
  WHERE id = NEW.client_id;

  IF NEW.company_id != client_company_id THEN
    RAISE EXCEPTION 'Devis company_id (%) does not match client company_id (%)',
      NEW.company_id, client_company_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_devis_company_id_trigger ON public.devis;
CREATE TRIGGER validate_devis_company_id_trigger
  BEFORE INSERT OR UPDATE ON public.devis
  FOR EACH ROW
  EXECUTE FUNCTION validate_devis_company_id();

-- Trigger to prevent inserting factures with different company_id than client
CREATE OR REPLACE FUNCTION validate_facture_company_id()
RETURNS TRIGGER AS $$
DECLARE
  client_company_id UUID;
BEGIN
  SELECT company_id INTO client_company_id
  FROM public.clients
  WHERE id = NEW.client_id;

  IF NEW.company_id != client_company_id THEN
    RAISE EXCEPTION 'Facture company_id (%) does not match client company_id (%)',
      NEW.company_id, client_company_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_facture_company_id_trigger ON public.factures;
CREATE TRIGGER validate_facture_company_id_trigger
  BEFORE INSERT OR UPDATE ON public.factures
  FOR EACH ROW
  EXECUTE FUNCTION validate_facture_company_id();

-- Trigger to prevent inserting jobs with different company_id than client
CREATE OR REPLACE FUNCTION validate_job_company_id()
RETURNS TRIGGER AS $$
DECLARE
  client_company_id UUID;
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    SELECT company_id INTO client_company_id
    FROM public.clients
    WHERE id = NEW.client_id;

    IF NEW.company_id != client_company_id THEN
      RAISE EXCEPTION 'Job company_id (%) does not match client company_id (%)',
        NEW.company_id, client_company_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_job_company_id_trigger ON public.jobs;
CREATE TRIGGER validate_job_company_id_trigger
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION validate_job_company_id();
-- URGENT: Enable RLS on all tables that currently have it disabled
-- This is a CRITICAL security fix - these tables are currently UNRESTRICTED

-- ========================================
-- ENABLE RLS ON ALL BUSINESS TABLES
-- ========================================

-- Core business tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;

-- Team & Users
ALTER TABLE public.equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Inventory
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_reservations ENABLE ROW LEVEL SECURITY;

-- Time tracking
ALTER TABLE public.timesheets_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_breaks ENABLE ROW LEVEL SECURITY;

-- Calendar & Events
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_clients ENABLE ROW LEVEL SECURITY;

-- Interventions
ALTER TABLE public.intervention_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_signatures ENABLE ROW LEVEL SECURITY;

-- Documents & Templates
ALTER TABLE public.doc_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_numbering ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Configuration
ALTER TABLE public.taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Clients related
ALTER TABLE public.client_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;

-- Quotes
ALTER TABLE public.quote_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_signatures ENABLE ROW LEVEL SECURITY;

-- Support
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Planning
ALTER TABLE public.planning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets_events ENABLE ROW LEVEL SECURITY;

-- Companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Devices
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'devices_push_tokens') THEN
    ALTER TABLE public.devices_push_tokens ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Purchase orders
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
    ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Support tickets and events
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets') THEN
    ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_events') THEN
    ALTER TABLE public.support_events ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- User display settings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_display_settings') THEN
    ALTER TABLE public.user_display_settings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ========================================
-- VERIFICATION QUERY (commented out - run manually)
-- ========================================

-- Run this query to verify all tables have RLS enabled:
/*
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity THEN '✅ PROTECTED'
    ELSE '❌ UNRESTRICTED'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
ORDER BY rowsecurity ASC, tablename;
*/
