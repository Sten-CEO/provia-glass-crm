-- ============================================================
-- CRITICAL SECURITY FIX: Force enable RLS on ALL tables
-- ============================================================
-- This migration ensures RLS is enabled on every table.
-- Tables without RLS are UNRESTRICTED and expose all data.
-- ============================================================

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- First try: get company_id from equipe table (for employees)
    (SELECT company_id FROM public.equipe WHERE user_id = auth.uid() LIMIT 1),
    -- Second try: get company_id from profiles table
    (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );
$$;

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

-- Core business tables
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paiements ENABLE ROW LEVEL SECURITY;

-- Team & Users
ALTER TABLE IF EXISTS public.equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Companies & Settings
ALTER TABLE IF EXISTS public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_settings ENABLE ROW LEVEL SECURITY;

-- Inventory
ALTER TABLE IF EXISTS public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.material_reservations ENABLE ROW LEVEL SECURITY;

-- Time tracking
ALTER TABLE IF EXISTS public.timesheets_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.timesheet_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.timesheets_events ENABLE ROW LEVEL SECURITY;

-- Calendar & Events
ALTER TABLE IF EXISTS public.agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.planning_events ENABLE ROW LEVEL SECURITY;

-- Interventions
ALTER TABLE IF EXISTS public.intervention_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.intervention_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.intervention_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.intervention_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.intervention_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.intervention_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_signatures ENABLE ROW LEVEL SECURITY;

-- Documents & Templates
ALTER TABLE IF EXISTS public.doc_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.document_numbering ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attachments ENABLE ROW LEVEL SECURITY;

-- Configuration
ALTER TABLE IF EXISTS public.taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dashboard_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- Clients related
ALTER TABLE IF EXISTS public.client_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_contracts ENABLE ROW LEVEL SECURITY;

-- Quotes
ALTER TABLE IF EXISTS public.quote_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quote_signatures ENABLE ROW LEVEL SECURITY;

-- Support
ALTER TABLE IF EXISTS public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_events ENABLE ROW LEVEL SECURITY;

-- Devices
ALTER TABLE IF EXISTS public.devices_push_tokens ENABLE ROW LEVEL SECURITY;

-- Purchase orders
ALTER TABLE IF EXISTS public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- User settings
ALTER TABLE IF EXISTS public.user_display_settings ENABLE ROW LEVEL SECURITY;

-- SMTP config
ALTER TABLE IF EXISTS public.smtp_configuration ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CREATE/REPLACE POLICIES FOR COMPANY-SCOPED TABLES
-- ============================================================

-- CLIENTS
DROP POLICY IF EXISTS "clients_company_isolation" ON public.clients;
CREATE POLICY "clients_company_isolation" ON public.clients
  FOR ALL USING (company_id = get_user_company_id());

-- DEVIS
DROP POLICY IF EXISTS "devis_company_isolation" ON public.devis;
CREATE POLICY "devis_company_isolation" ON public.devis
  FOR ALL USING (company_id = get_user_company_id());

-- FACTURES
DROP POLICY IF EXISTS "factures_company_isolation" ON public.factures;
CREATE POLICY "factures_company_isolation" ON public.factures
  FOR ALL USING (company_id = get_user_company_id());

-- JOBS
DROP POLICY IF EXISTS "jobs_company_isolation" ON public.jobs;
CREATE POLICY "jobs_company_isolation" ON public.jobs
  FOR ALL USING (company_id = get_user_company_id());

-- EQUIPE
DROP POLICY IF EXISTS "equipe_company_isolation" ON public.equipe;
CREATE POLICY "equipe_company_isolation" ON public.equipe
  FOR ALL USING (company_id = get_user_company_id());

-- AGENDA_EVENTS
DROP POLICY IF EXISTS "agenda_events_company_isolation" ON public.agenda_events;
CREATE POLICY "agenda_events_company_isolation" ON public.agenda_events
  FOR ALL USING (company_id = get_user_company_id());

-- COMPANY_SETTINGS
DROP POLICY IF EXISTS "company_settings_company_isolation" ON public.company_settings;
CREATE POLICY "company_settings_company_isolation" ON public.company_settings
  FOR ALL USING (company_id = get_user_company_id());

-- DOCUMENT_NUMBERING
DROP POLICY IF EXISTS "document_numbering_company_isolation" ON public.document_numbering;
CREATE POLICY "document_numbering_company_isolation" ON public.document_numbering
  FOR ALL USING (company_id = get_user_company_id());

-- PAIEMENTS
DROP POLICY IF EXISTS "paiements_company_isolation" ON public.paiements;
CREATE POLICY "paiements_company_isolation" ON public.paiements
  FOR ALL USING (company_id = get_user_company_id());

-- CONTRACTS
DROP POLICY IF EXISTS "contracts_company_isolation" ON public.contracts;
CREATE POLICY "contracts_company_isolation" ON public.contracts
  FOR ALL USING (company_id = get_user_company_id());

-- TAXES
DROP POLICY IF EXISTS "taxes_company_isolation" ON public.taxes;
CREATE POLICY "taxes_company_isolation" ON public.taxes
  FOR ALL USING (company_id = get_user_company_id());

-- SERVICE_ITEMS
DROP POLICY IF EXISTS "service_items_company_isolation" ON public.service_items;
CREATE POLICY "service_items_company_isolation" ON public.service_items
  FOR ALL USING (company_id = get_user_company_id());

-- DOC_TEMPLATES
DROP POLICY IF EXISTS "doc_templates_company_isolation" ON public.doc_templates;
CREATE POLICY "doc_templates_company_isolation" ON public.doc_templates
  FOR ALL USING (company_id = get_user_company_id());

-- INVENTORY_ITEMS
DROP POLICY IF EXISTS "inventory_items_company_isolation" ON public.inventory_items;
CREATE POLICY "inventory_items_company_isolation" ON public.inventory_items
  FOR ALL USING (company_id = get_user_company_id());

-- NOTIFICATIONS
DROP POLICY IF EXISTS "notifications_company_isolation" ON public.notifications;
CREATE POLICY "notifications_company_isolation" ON public.notifications
  FOR ALL USING (company_id = get_user_company_id());

-- PLANNING_EVENTS
DROP POLICY IF EXISTS "planning_events_company_isolation" ON public.planning_events;
CREATE POLICY "planning_events_company_isolation" ON public.planning_events
  FOR ALL USING (company_id = get_user_company_id());

-- TIMESHEETS_EVENTS
DROP POLICY IF EXISTS "timesheets_events_company_isolation" ON public.timesheets_events;
CREATE POLICY "timesheets_events_company_isolation" ON public.timesheets_events
  FOR ALL USING (company_id = get_user_company_id());

-- TIMESHEETS_ENTRIES
DROP POLICY IF EXISTS "timesheets_entries_company_isolation" ON public.timesheets_entries;
CREATE POLICY "timesheets_entries_company_isolation" ON public.timesheets_entries
  FOR ALL USING (company_id = get_user_company_id());

-- SUPPORT_CONVERSATIONS
DROP POLICY IF EXISTS "support_conversations_company_isolation" ON public.support_conversations;
CREATE POLICY "support_conversations_company_isolation" ON public.support_conversations
  FOR ALL USING (company_id = get_user_company_id());

-- SUPPORT_MESSAGES (via conversation)
DROP POLICY IF EXISTS "support_messages_company_isolation" ON public.support_messages;
CREATE POLICY "support_messages_company_isolation" ON public.support_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM public.support_conversations WHERE company_id = get_user_company_id()
    )
  );

-- CLIENT_ADDRESSES (via client)
DROP POLICY IF EXISTS "client_addresses_company_isolation" ON public.client_addresses;
CREATE POLICY "client_addresses_company_isolation" ON public.client_addresses
  FOR ALL USING (
    client_id IN (
      SELECT id FROM public.clients WHERE company_id = get_user_company_id()
    )
  );

-- CLIENT_CONTRACTS (via client)
DROP POLICY IF EXISTS "client_contracts_company_isolation" ON public.client_contracts;
CREATE POLICY "client_contracts_company_isolation" ON public.client_contracts
  FOR ALL USING (
    client_id IN (
      SELECT id FROM public.clients WHERE company_id = get_user_company_id()
    )
  );

-- QUOTE_EVENTS (via devis)
DROP POLICY IF EXISTS "quote_events_company_isolation" ON public.quote_events;
CREATE POLICY "quote_events_company_isolation" ON public.quote_events
  FOR ALL USING (
    quote_id IN (
      SELECT id FROM public.devis WHERE company_id = get_user_company_id()
    )
  );

-- QUOTE_SIGNATURES (via devis)
DROP POLICY IF EXISTS "quote_signatures_company_isolation" ON public.quote_signatures;
CREATE POLICY "quote_signatures_company_isolation" ON public.quote_signatures
  FOR ALL USING (
    quote_id IN (
      SELECT id FROM public.devis WHERE company_id = get_user_company_id()
    )
  );

-- JOB_SIGNATURES (via job)
DROP POLICY IF EXISTS "job_signatures_company_isolation" ON public.job_signatures;
CREATE POLICY "job_signatures_company_isolation" ON public.job_signatures
  FOR ALL USING (
    job_id IN (
      SELECT id FROM public.jobs WHERE company_id = get_user_company_id()
    )
  );

-- INTERVENTION tables (via job)
DROP POLICY IF EXISTS "intervention_assignments_company_isolation" ON public.intervention_assignments;
CREATE POLICY "intervention_assignments_company_isolation" ON public.intervention_assignments
  FOR ALL USING (
    job_id IN (
      SELECT id FROM public.jobs WHERE company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "intervention_consumables_company_isolation" ON public.intervention_consumables;
CREATE POLICY "intervention_consumables_company_isolation" ON public.intervention_consumables
  FOR ALL USING (
    job_id IN (
      SELECT id FROM public.jobs WHERE company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "intervention_services_company_isolation" ON public.intervention_services;
CREATE POLICY "intervention_services_company_isolation" ON public.intervention_services
  FOR ALL USING (
    job_id IN (
      SELECT id FROM public.jobs WHERE company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "intervention_files_company_isolation" ON public.intervention_files;
CREATE POLICY "intervention_files_company_isolation" ON public.intervention_files
  FOR ALL USING (
    job_id IN (
      SELECT id FROM public.jobs WHERE company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "intervention_logs_company_isolation" ON public.intervention_logs;
CREATE POLICY "intervention_logs_company_isolation" ON public.intervention_logs
  FOR ALL USING (
    job_id IN (
      SELECT id FROM public.jobs WHERE company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "intervention_feedback_company_isolation" ON public.intervention_feedback;
CREATE POLICY "intervention_feedback_company_isolation" ON public.intervention_feedback
  FOR ALL USING (
    job_id IN (
      SELECT id FROM public.jobs WHERE company_id = get_user_company_id()
    )
  );

-- PROFILES (user can see own profile + company members)
DROP POLICY IF EXISTS "profiles_own_or_company" ON public.profiles;
CREATE POLICY "profiles_own_or_company" ON public.profiles
  FOR ALL USING (
    id = auth.uid() OR company_id = get_user_company_id()
  );

-- COMPANIES (user can only see own company)
DROP POLICY IF EXISTS "companies_own_company" ON public.companies;
CREATE POLICY "companies_own_company" ON public.companies
  FOR ALL USING (id = get_user_company_id());

-- DASHBOARD_PREFS (user's own prefs)
DROP POLICY IF EXISTS "dashboard_prefs_own" ON public.dashboard_prefs;
CREATE POLICY "dashboard_prefs_own" ON public.dashboard_prefs
  FOR ALL USING (user_id = auth.uid());

-- USER_ROLES (user can see own role + company roles)
DROP POLICY IF EXISTS "user_roles_company_isolation" ON public.user_roles;
CREATE POLICY "user_roles_company_isolation" ON public.user_roles
  FOR ALL USING (
    user_id = auth.uid() OR
    user_id IN (SELECT user_id FROM public.equipe WHERE company_id = get_user_company_id())
  );

-- DEVICES_PUSH_TOKENS (user's own tokens)
DROP POLICY IF EXISTS "devices_push_tokens_own" ON public.devices_push_tokens;
CREATE POLICY "devices_push_tokens_own" ON public.devices_push_tokens
  FOR ALL USING (user_id = auth.uid());

-- ATTACHMENTS (company isolation via parent tables)
DROP POLICY IF EXISTS "attachments_company_isolation" ON public.attachments;
CREATE POLICY "attachments_company_isolation" ON public.attachments
  FOR ALL USING (
    (entity_type = 'client' AND entity_id IN (SELECT id FROM public.clients WHERE company_id = get_user_company_id())) OR
    (entity_type = 'devis' AND entity_id IN (SELECT id FROM public.devis WHERE company_id = get_user_company_id())) OR
    (entity_type = 'facture' AND entity_id IN (SELECT id FROM public.factures WHERE company_id = get_user_company_id())) OR
    (entity_type = 'job' AND entity_id IN (SELECT id FROM public.jobs WHERE company_id = get_user_company_id()))
  );

-- SMTP_CONFIGURATION (company isolation)
DROP POLICY IF EXISTS "smtp_configuration_company_isolation" ON public.smtp_configuration;
CREATE POLICY "smtp_configuration_company_isolation" ON public.smtp_configuration
  FOR ALL USING (company_id = get_user_company_id());

-- ============================================================
-- VERIFICATION: Run this to check all tables have RLS
-- ============================================================
-- SELECT tablename, rowsecurity as rls_enabled
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY rowsecurity, tablename;
