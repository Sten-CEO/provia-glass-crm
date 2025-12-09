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
  AND n.link = '/devis/' || d.id::text
  AND n.company_id IS NULL;

-- From factures
UPDATE public.notifications n
SET company_id = f.company_id
FROM public.factures f
WHERE n.link LIKE '/factures/%'
  AND n.link = '/factures/' || f.id::text
  AND n.company_id IS NULL;

-- From jobs/interventions
UPDATE public.notifications n
SET company_id = j.company_id
FROM public.jobs j
WHERE n.link LIKE '/interventions/%'
  AND n.link = '/interventions/' || j.id::text
  AND n.company_id IS NULL;

-- From agenda
UPDATE public.notifications n
SET company_id = a.company_id
FROM public.agenda_events a
WHERE n.link LIKE '/agenda/%'
  AND n.link = '/agenda/' || a.id::text
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
