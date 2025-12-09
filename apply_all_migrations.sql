-- ========================================
-- CONSOLIDATED MIGRATIONS - SECURITY FIX
-- Apply ALL these migrations in Supabase SQL Editor
-- ========================================
-- This file contains 9 critical security migrations that must be applied
-- to fix multi-tenant data isolation issues in Provia Glass CRM
--
-- IMPORTANT: Execute this ENTIRE script in one go in SQL Editor
-- ========================================

-- POINT 1: Add company_id to paiements table for multi-tenant data isolation
-- CRITICAL: Financial data must be isolated per company

-- Add company_id column
ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill company_id from related factures
UPDATE public.paiements p
SET company_id = f.company_id
FROM public.factures f
WHERE p.facture_id = f.id
  AND p.company_id IS NULL;

-- Make company_id NOT NULL after backfill
ALTER TABLE public.paiements
  ALTER COLUMN company_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_paiements_company_id ON public.paiements(company_id);

-- Enable RLS
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their company payments" ON public.paiements;
DROP POLICY IF EXISTS "Users can insert payments in their company" ON public.paiements;
DROP POLICY IF EXISTS "Users can update their company payments" ON public.paiements;
DROP POLICY IF EXISTS "Users can delete their company payments" ON public.paiements;

-- Create company-scoped RLS policies
CREATE POLICY "Users can view their company payments"
  ON public.paiements FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert payments in their company"
  ON public.paiements FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company payments"
  ON public.paiements FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company payments"
  ON public.paiements FOR DELETE
  USING (company_id = get_user_company_id());

-- Add trigger to auto-set company_id on INSERT
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
-- POINT 2: Add company_id to quote_events and quote_signatures tables
-- CRITICAL: Quote tracking and legal signatures must be isolated per company

-- ========================================
-- 1. QUOTE_EVENTS TABLE
-- ========================================

-- Add company_id column
ALTER TABLE public.quote_events
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill company_id from related devis
UPDATE public.quote_events qe
SET company_id = d.company_id
FROM public.devis d
WHERE qe.quote_id = d.id
  AND qe.company_id IS NULL;

-- Make company_id NOT NULL after backfill
ALTER TABLE public.quote_events
  ALTER COLUMN company_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_quote_events_company_id ON public.quote_events(company_id);

-- Enable RLS
ALTER TABLE public.quote_events ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their company quote events" ON public.quote_events;
DROP POLICY IF EXISTS "Users can manage their company quote events" ON public.quote_events;

-- Create company-scoped RLS policies
CREATE POLICY "Users can view their company quote events"
  ON public.quote_events FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company quote events"
  ON public.quote_events FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Add trigger to auto-set company_id on INSERT
CREATE OR REPLACE FUNCTION set_quote_events_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.devis
    WHERE id = NEW.quote_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_quote_events_company_id ON public.quote_events;
CREATE TRIGGER trigger_set_quote_events_company_id
  BEFORE INSERT ON public.quote_events
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_events_company_id();

-- ========================================
-- 2. QUOTE_SIGNATURES TABLE
-- ========================================

-- Add company_id column
ALTER TABLE public.quote_signatures
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill company_id from related devis
UPDATE public.quote_signatures qs
SET company_id = d.company_id
FROM public.devis d
WHERE qs.quote_id = d.id
  AND qs.company_id IS NULL;

-- Make company_id NOT NULL after backfill
ALTER TABLE public.quote_signatures
  ALTER COLUMN company_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_quote_signatures_company_id ON public.quote_signatures(company_id);

-- Enable RLS
ALTER TABLE public.quote_signatures ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their company quote signatures" ON public.quote_signatures;
DROP POLICY IF EXISTS "Users can manage their company quote signatures" ON public.quote_signatures;

-- Create company-scoped RLS policies
CREATE POLICY "Users can view their company quote signatures"
  ON public.quote_signatures FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company quote signatures"
  ON public.quote_signatures FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Add trigger to auto-set company_id on INSERT
CREATE OR REPLACE FUNCTION set_quote_signatures_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.devis
    WHERE id = NEW.quote_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_quote_signatures_company_id ON public.quote_signatures;
CREATE TRIGGER trigger_set_quote_signatures_company_id
  BEFORE INSERT ON public.quote_signatures
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_signatures_company_id();
-- POINT 3: Fix notifications system - CRITICAL
-- Issues:
-- 1. Inconsistent structure (employee_id vs company_id)
-- 2. Overly permissive RLS policies (USING true)
-- 3. create_notification() function doesn't set company_id
-- 4. Notification triggers don't pass company_id

-- ========================================
-- 1. ENSURE PROPER TABLE STRUCTURE
-- ========================================

-- Remove employee_id if it exists (old structure)
ALTER TABLE public.notifications
  DROP COLUMN IF EXISTS employee_id CASCADE;

-- Ensure company_id exists and is properly typed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications'
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.notifications
      ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Backfill company_id for any existing notifications without it
-- From devis
UPDATE public.notifications n
SET company_id = d.company_id
FROM public.devis d
WHERE n.link LIKE '/devis/%'
  AND n.link = concat('/devis/', d.id::text)
  AND n.company_id IS NULL;

-- From factures
UPDATE public.notifications n
SET company_id = f.company_id
FROM public.factures f
WHERE n.link LIKE '/factures/%'
  AND n.link = concat('/factures/', f.id::text)
  AND n.company_id IS NULL;

-- From jobs/interventions
UPDATE public.notifications n
SET company_id = j.company_id
FROM public.jobs j
WHERE n.link LIKE '/interventions/%'
  AND n.link = concat('/interventions/', j.id::text)
  AND n.company_id IS NULL;

-- From agenda
UPDATE public.notifications n
SET company_id = a.company_id
FROM public.agenda_events a
WHERE n.link LIKE '/agenda/%'
  AND n.link = concat('/agenda/', a.id::text)
  AND n.company_id IS NULL;

-- Make company_id NOT NULL after backfill
ALTER TABLE public.notifications
  ALTER COLUMN company_id SET NOT NULL;

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications(company_id);

-- ========================================
-- 2. DROP OVERLY PERMISSIVE POLICIES
-- ========================================

DROP POLICY IF EXISTS "Users can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Employees can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Employees can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

-- ========================================
-- 3. CREATE PROPER COMPANY-SCOPED RLS POLICIES
-- ========================================

-- Drop any existing company-scoped policies first
DROP POLICY IF EXISTS "Users can view their company notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications in their company" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their company notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their company notifications" ON public.notifications;

CREATE POLICY "Users can view their company notifications"
  ON public.notifications FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert notifications in their company"
  ON public.notifications FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company notifications"
  ON public.notifications FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company notifications"
  ON public.notifications FOR DELETE
  USING (company_id = get_user_company_id());

-- ========================================
-- 4. UPDATE create_notification FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION public.create_notification(
  p_kind TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_company_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notif_id UUID;
  v_company_id UUID;
BEGIN
  -- Use provided company_id or get from current user
  v_company_id := COALESCE(p_company_id, get_user_company_id());

  INSERT INTO public.notifications (kind, type, title, message, link, actor_id, company_id)
  VALUES (p_kind, p_kind, p_title, p_message, p_link, p_actor_id, v_company_id)
  RETURNING id INTO v_notif_id;

  RETURN v_notif_id;
END;
$$;

-- ========================================
-- 5. UPDATE NOTIFICATION TRIGGERS
-- ========================================

-- Trigger: Quote signed
CREATE OR REPLACE FUNCTION public.notify_quote_signed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.statut IN ('Accepté', 'Signé') AND OLD.statut NOT IN ('Accepté', 'Signé') THEN
    PERFORM create_notification(
      'quote_signed',
      'Devis signé',
      'Le devis ' || COALESCE(NEW.numero, '') || ' pour ' || NEW.client_nom || ' a été accepté',
      '/devis/' || NEW.id::text,
      NULL,
      NEW.company_id  -- ✅ Pass company_id from quote
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_quote_signed ON public.devis;
CREATE TRIGGER trigger_notify_quote_signed
AFTER UPDATE ON public.devis
FOR EACH ROW
EXECUTE FUNCTION public.notify_quote_signed();

-- Trigger: Invoice overdue
CREATE OR REPLACE FUNCTION public.notify_invoice_overdue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.sent_at IS NOT NULL
     AND NEW.paid_at IS NULL
     AND NEW.due_date IS NOT NULL
     AND NEW.due_date < CURRENT_DATE
     AND (OLD.due_date IS NULL OR OLD.due_date >= CURRENT_DATE) THEN
    PERFORM create_notification(
      'invoice_overdue',
      'Facture en retard',
      'La facture ' || COALESCE(NEW.numero, '') || ' pour ' || NEW.client_nom || ' est en retard',
      '/factures/' || NEW.id::text,
      NULL,
      NEW.company_id  -- ✅ Pass company_id from invoice
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_invoice_overdue ON public.factures;
CREATE TRIGGER trigger_notify_invoice_overdue
AFTER UPDATE ON public.factures
FOR EACH ROW
EXECUTE FUNCTION public.notify_invoice_overdue();

-- Trigger: Invoice to send (intervention completed)
CREATE OR REPLACE FUNCTION public.notify_invoice_to_send()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.statut = 'Terminée' AND (OLD.statut IS NULL OR OLD.statut != 'Terminée') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.factures
      WHERE intervention_id = NEW.id
    ) THEN
      PERFORM create_notification(
        'invoice_to_send',
        'Facture à créer',
        'L''intervention ' || NEW.titre || ' est terminée et nécessite une facturation',
        '/interventions/' || NEW.id::text,
        NULL,
        NEW.company_id  -- ✅ Pass company_id from job
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_invoice_to_send ON public.jobs;
CREATE TRIGGER trigger_notify_invoice_to_send
AFTER UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.notify_invoice_to_send();

-- Trigger: Job assigned
CREATE OR REPLACE FUNCTION public.notify_job_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      'job_assigned',
      'Nouvelle intervention assignée',
      'Une intervention a été assignée: ' || (SELECT titre FROM public.jobs WHERE id = NEW.intervention_id),
      '/interventions/' || NEW.intervention_id::text,
      NEW.employee_id,
      NEW.company_id  -- ✅ Pass company_id from assignment
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_job_assigned ON public.intervention_assignments;
CREATE TRIGGER trigger_notify_job_assigned
AFTER INSERT ON public.intervention_assignments
FOR EACH ROW
EXECUTE FUNCTION public.notify_job_assigned();

-- ========================================
-- 6. ADD TRIGGER TO AUTO-SET company_id
-- ========================================

CREATE OR REPLACE FUNCTION set_notifications_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_notifications_company_id ON public.notifications;
CREATE TRIGGER trigger_set_notifications_company_id
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION set_notifications_company_id();
-- POINT 4: Add company_id to support tables
-- Support conversations and messages must be isolated per company

-- ========================================
-- 1. SUPPORT_CONVERSATIONS TABLE
-- ========================================

-- Add company_id column
ALTER TABLE public.support_conversations
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill company_id from user_roles
UPDATE public.support_conversations sc
SET company_id = ur.company_id
FROM public.user_roles ur
WHERE sc.user_id = ur.user_id
  AND sc.company_id IS NULL;

-- Make company_id NOT NULL after backfill
ALTER TABLE public.support_conversations
  ALTER COLUMN company_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_support_conversations_company_id
  ON public.support_conversations(company_id);

-- Enable RLS
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their company conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.support_conversations;

-- Create company-scoped RLS policies
CREATE POLICY "Users can view their company conversations"
  ON public.support_conversations FOR SELECT
  USING (company_id = get_user_company_id() OR user_id = auth.uid());

CREATE POLICY "Users can create conversations"
  ON public.support_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid() AND company_id = get_user_company_id());

CREATE POLICY "Users can update their conversations"
  ON public.support_conversations FOR UPDATE
  USING (user_id = auth.uid() AND company_id = get_user_company_id());

-- Add trigger to auto-set company_id on INSERT
CREATE OR REPLACE FUNCTION set_support_conversations_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_support_conversations_company_id ON public.support_conversations;
CREATE TRIGGER trigger_set_support_conversations_company_id
  BEFORE INSERT ON public.support_conversations
  FOR EACH ROW
  EXECUTE FUNCTION set_support_conversations_company_id();

-- ========================================
-- 2. SUPPORT_MESSAGES TABLE
-- ========================================

-- Add company_id column
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill company_id from parent conversation
UPDATE public.support_messages sm
SET company_id = sc.company_id
FROM public.support_conversations sc
WHERE sm.conversation_id = sc.id
  AND sm.company_id IS NULL;

-- Make company_id NOT NULL after backfill
ALTER TABLE public.support_messages
  ALTER COLUMN company_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_support_messages_company_id
  ON public.support_messages(company_id);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.support_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.support_messages;

-- Create company-scoped RLS policies
CREATE POLICY "Users can view messages in their conversations"
  ON public.support_messages FOR SELECT
  USING (
    company_id = get_user_company_id() OR
    conversation_id IN (
      SELECT id FROM public.support_conversations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id() AND
    conversation_id IN (
      SELECT id FROM public.support_conversations
      WHERE user_id = auth.uid()
    )
  );

-- Add trigger to auto-set company_id on INSERT
CREATE OR REPLACE FUNCTION set_support_messages_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.support_conversations
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_support_messages_company_id ON public.support_messages;
CREATE TRIGGER trigger_set_support_messages_company_id
  BEFORE INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_support_messages_company_id();

-- ========================================
-- 3. SUPPORT_TICKETS TABLE (if exists)
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets') THEN
    -- Add company_id column
    ALTER TABLE public.support_tickets
      ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

    -- Backfill from equipe
    UPDATE public.support_tickets st
    SET company_id = e.company_id
    FROM public.equipe e
    WHERE st.employee_id = e.id
      AND st.company_id IS NULL;

    -- Make company_id NOT NULL
    ALTER TABLE public.support_tickets
      ALTER COLUMN company_id SET NOT NULL;

    -- Create index
    CREATE INDEX IF NOT EXISTS idx_support_tickets_company_id
      ON public.support_tickets(company_id);

    -- Enable RLS
    ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

    -- Create policies
    DROP POLICY IF EXISTS "Users can view their company tickets" ON public.support_tickets;
    CREATE POLICY "Users can view their company tickets"
      ON public.support_tickets FOR SELECT
      USING (company_id = get_user_company_id());

    DROP POLICY IF EXISTS "Users can manage their company tickets" ON public.support_tickets;
    CREATE POLICY "Users can manage their company tickets"
      ON public.support_tickets FOR ALL
      USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());
  END IF;
END $$;

-- ========================================
-- 4. SUPPORT_EVENTS TABLE (if exists)
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_events') THEN
    -- Add company_id column
    ALTER TABLE public.support_events
      ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

    -- Backfill from equipe if employee_id exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'support_events' AND column_name = 'employee_id'
    ) THEN
      UPDATE public.support_events se
      SET company_id = e.company_id
      FROM public.equipe e
      WHERE se.employee_id = e.id
        AND se.company_id IS NULL;
    END IF;

    -- Create index
    CREATE INDEX IF NOT EXISTS idx_support_events_company_id
      ON public.support_events(company_id);

    -- Enable RLS
    ALTER TABLE public.support_events ENABLE ROW LEVEL SECURITY;

    -- Create policies
    DROP POLICY IF EXISTS "Users can view their company events" ON public.support_events;
    CREATE POLICY "Users can view their company events"
      ON public.support_events FOR SELECT
      USING (company_id = get_user_company_id() OR company_id IS NULL);

    DROP POLICY IF EXISTS "Users can manage their company events" ON public.support_events;
    CREATE POLICY "Users can manage their company events"
      ON public.support_events FOR ALL
      USING (company_id = get_user_company_id() OR company_id IS NULL)
      WITH CHECK (company_id = get_user_company_id() OR company_id IS NULL);
  END IF;
END $$;
-- POINT 6: Add company_id to planning_events and timesheets_events tables
-- These tables can filter via FK but should have explicit company_id for performance

-- ========================================
-- 1. PLANNING_EVENTS TABLE
-- ========================================

-- Add company_id column
ALTER TABLE public.planning_events
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill company_id from jobs
UPDATE public.planning_events pe
SET company_id = j.company_id
FROM public.jobs j
WHERE pe.job_id = j.id
  AND pe.company_id IS NULL;

-- Make company_id NOT NULL after backfill
ALTER TABLE public.planning_events
  ALTER COLUMN company_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_planning_events_company_id
  ON public.planning_events(company_id);

-- Enable RLS
ALTER TABLE public.planning_events ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their company planning events" ON public.planning_events;
DROP POLICY IF EXISTS "Users can manage their company planning events" ON public.planning_events;

-- Create company-scoped RLS policies
CREATE POLICY "Users can view their company planning events"
  ON public.planning_events FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company planning events"
  ON public.planning_events FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Add trigger to auto-set company_id on INSERT
CREATE OR REPLACE FUNCTION set_planning_events_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.jobs
    WHERE id = NEW.job_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_planning_events_company_id ON public.planning_events;
CREATE TRIGGER trigger_set_planning_events_company_id
  BEFORE INSERT ON public.planning_events
  FOR EACH ROW
  EXECUTE FUNCTION set_planning_events_company_id();

-- ========================================
-- 2. TIMESHEETS_EVENTS TABLE
-- ========================================

-- Add company_id column
ALTER TABLE public.timesheets_events
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill company_id from equipe (employee relationship)
UPDATE public.timesheets_events te
SET company_id = e.company_id
FROM public.equipe e
WHERE te.employee_id = e.id
  AND te.company_id IS NULL;

-- Make company_id NOT NULL after backfill
ALTER TABLE public.timesheets_events
  ALTER COLUMN company_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_timesheets_events_company_id
  ON public.timesheets_events(company_id);

-- Enable RLS
ALTER TABLE public.timesheets_events ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their company timesheet events" ON public.timesheets_events;
DROP POLICY IF EXISTS "Employees can manage their timesheet events" ON public.timesheets_events;

-- Create company-scoped RLS policies
CREATE POLICY "Users can view their company timesheet events"
  ON public.timesheets_events FOR SELECT
  USING (
    company_id = get_user_company_id() OR
    employee_id IN (SELECT id FROM public.equipe WHERE user_id = auth.uid())
  );

CREATE POLICY "Employees can manage their timesheet events"
  ON public.timesheets_events FOR ALL
  USING (
    company_id = get_user_company_id() OR
    employee_id IN (SELECT id FROM public.equipe WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id = get_user_company_id() OR
    employee_id IN (SELECT id FROM public.equipe WHERE user_id = auth.uid())
  );

-- Add trigger to auto-set company_id on INSERT
CREATE OR REPLACE FUNCTION set_timesheets_events_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.equipe
    WHERE id = NEW.employee_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_timesheets_events_company_id ON public.timesheets_events;
CREATE TRIGGER trigger_set_timesheets_events_company_id
  BEFORE INSERT ON public.timesheets_events
  FOR EACH ROW
  EXECUTE FUNCTION set_timesheets_events_company_id();
-- POINT 7: Audit and fix missing/incomplete RLS policies
-- Ensure all tables have proper company-scoped RLS policies

-- ========================================
-- 1. USER_DISPLAY_SETTINGS
-- ========================================

-- Enable RLS if not already enabled
ALTER TABLE public.user_display_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own display settings" ON public.user_display_settings;

-- Create policy: users can only manage their own settings
CREATE POLICY "Users can manage their own display settings"
  ON public.user_display_settings FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- ========================================
-- 2. ATTACHMENTS
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their company attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can manage their company attachments" ON public.attachments;

-- Create proper company-scoped policies
CREATE POLICY "Users can view their company attachments"
  ON public.attachments FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company attachments"
  ON public.attachments FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ========================================
-- 3. CLIENT_ADDRESSES
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their company client addresses" ON public.client_addresses;
DROP POLICY IF EXISTS "Users can manage their company client addresses" ON public.client_addresses;

-- Create proper company-scoped policies
CREATE POLICY "Users can view their company client addresses"
  ON public.client_addresses FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company client addresses"
  ON public.client_addresses FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ========================================
-- 4. CLIENT_CONTRACTS
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their company client contracts" ON public.client_contracts;
DROP POLICY IF EXISTS "Users can manage their company client contracts" ON public.client_contracts;

-- Create proper company-scoped policies
CREATE POLICY "Users can view their company client contracts"
  ON public.client_contracts FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company client contracts"
  ON public.client_contracts FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ========================================
-- 5. DEVICES_PUSH_TOKENS (if exists)
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'devices_push_tokens') THEN
    -- Enable RLS
    ALTER TABLE public.devices_push_tokens ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their company devices" ON public.devices_push_tokens;
    DROP POLICY IF EXISTS "Users can manage their company devices" ON public.devices_push_tokens;

    -- Create proper company-scoped policies
    CREATE POLICY "Users can view their company devices"
      ON public.devices_push_tokens FOR SELECT
      USING (company_id = get_user_company_id());

    CREATE POLICY "Users can manage their company devices"
      ON public.devices_push_tokens FOR ALL
      USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());
  END IF;
END $$;

-- ========================================
-- 6. PURCHASE_ORDERS (if exists)
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
    -- Ensure RLS is enabled
    ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their company purchase orders" ON public.purchase_orders;
    DROP POLICY IF EXISTS "Users can manage their company purchase orders" ON public.purchase_orders;

    -- Create proper company-scoped policies
    CREATE POLICY "Users can view their company purchase orders"
      ON public.purchase_orders FOR SELECT
      USING (company_id = get_user_company_id());

    CREATE POLICY "Users can manage their company purchase orders"
      ON public.purchase_orders FOR ALL
      USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());
  END IF;
END $$;

-- ========================================
-- 7. MATERIAL_RESERVATIONS
-- ========================================

-- Ensure proper policies exist for material_reservations
DROP POLICY IF EXISTS "Users can view their company material reservations" ON public.material_reservations;
DROP POLICY IF EXISTS "Users can manage their company material reservations" ON public.material_reservations;

CREATE POLICY "Users can view their company material reservations"
  ON public.material_reservations FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company material reservations"
  ON public.material_reservations FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ========================================
-- 8. COMPANY_SETTINGS - SPECIAL CASE
-- ========================================

-- Company settings should only be accessible by users in that company
DROP POLICY IF EXISTS "Users can view their company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can update their company settings" ON public.company_settings;

CREATE POLICY "Users can view their company settings"
  ON public.company_settings FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can update their company settings"
  ON public.company_settings FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can insert their company settings"
  ON public.company_settings FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

-- ========================================
-- 9. PROFILES - NO COMPANY_ID NEEDED
-- ========================================

-- Profiles are auth-level and don't need company_id
-- But ensure RLS is properly configured
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());
-- POINT 8: Improve handle_new_user function
-- Ensure it correctly handles employee accounts and creates company_settings

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
  company_name_val TEXT;
BEGIN
  -- ✅ Skip trigger for employee accounts created via edge function
  -- Employee accounts have is_employee = true in raw_user_meta_data
  IF (NEW.raw_user_meta_data->>'is_employee')::boolean IS TRUE THEN
    -- This is an employee account created by the edge function
    -- Do NOT create a company or role - the edge function handles this
    RETURN NEW;
  END IF;

  -- For regular company signup (NOT employees):
  -- Determine company name from metadata or email
  company_name_val := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    NEW.email || '''s Company'
  );

  -- Create a new company for the user
  INSERT INTO public.companies (name, owner_user_id)
  VALUES (company_name_val, NEW.id)
  RETURNING id INTO new_company_id;

  -- Create user_role entry linking user to company as owner
  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (NEW.id, new_company_id, 'owner');

  -- ✅ IMPROVEMENT: Create default company_settings entry
  -- This ensures every company has a settings record
  INSERT INTO public.company_settings (company_id, company_name, country)
  VALUES (new_company_id, company_name_val, 'FR')
  ON CONFLICT (company_id) DO NOTHING;

  -- ✅ IMPROVEMENT: Create default document numbering sequences
  INSERT INTO public.document_numbering (company_id, doc_type, prefix, next_number)
  VALUES
    (new_company_id, 'devis', 'DEV', 1),
    (new_company_id, 'facture', 'FAC', 1),
    (new_company_id, 'intervention', 'INT', 1)
  ON CONFLICT (company_id, doc_type) DO NOTHING;

  -- ✅ IMPROVEMENT: Create default dashboard preferences
  INSERT INTO public.dashboard_prefs (company_id, user_id)
  VALUES (new_company_id, NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Verify the trigger exists and is attached
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
-- POINT 9: Add company_id validation and consistency checks
-- Function to validate that company_id is consistent across related tables

-- ========================================
-- 1. CREATE VALIDATION FUNCTION
-- ========================================

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
      WHERE c.table_name = t.tablename
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
    WHERE c.table_name = t.tablename
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
    WHERE c.table_name = t.tablename
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
