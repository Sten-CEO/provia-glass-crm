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
