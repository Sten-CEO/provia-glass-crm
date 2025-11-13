-- Créer des triggers pour les notifications automatiques (sans réactiver realtime)

-- 1. Trigger pour devis accepté
CREATE OR REPLACE FUNCTION public.notify_quote_signed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.statut IN ('Accepté', 'Signé') AND OLD.statut NOT IN ('Accepté', 'Signé') THEN
    PERFORM create_notification(
      'quote_signed',
      'Devis signé',
      'Le devis ' || COALESCE(NEW.numero, '') || ' pour ' || NEW.client_nom || ' a été accepté',
      '/devis/' || NEW.id::text,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_quote_signed ON public.devis;
CREATE TRIGGER on_quote_signed
  AFTER UPDATE ON public.devis
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_quote_signed();

-- 2. Trigger pour factures en retard
CREATE OR REPLACE FUNCTION public.notify_invoice_overdue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_invoice_overdue ON public.factures;
CREATE TRIGGER on_invoice_overdue
  AFTER UPDATE ON public.factures
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_invoice_overdue();

-- 3. Trigger pour intervention terminée sans facture
CREATE OR REPLACE FUNCTION public.notify_invoice_to_send()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.statut = 'Terminée' AND OLD.statut != 'Terminée' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.factures 
      WHERE intervention_id = NEW.id
    ) THEN
      PERFORM create_notification(
        'invoice_to_send',
        'Facture à créer',
        'L''intervention ' || NEW.titre || ' est terminée et nécessite une facturation',
        '/interventions/' || NEW.id::text,
        NULL
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_invoice_to_send ON public.jobs;
CREATE TRIGGER on_invoice_to_send
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_invoice_to_send();

-- 4. Trigger pour assignation d'intervention
CREATE OR REPLACE FUNCTION public.notify_job_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      'job_assigned',
      'Nouvelle intervention assignée',
      'Une intervention a été assignée: ' || (SELECT titre FROM public.jobs WHERE id = NEW.intervention_id),
      '/interventions/' || NEW.intervention_id::text,
      NEW.employee_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_job_assigned ON public.intervention_assignments;
CREATE TRIGGER on_job_assigned
  AFTER INSERT ON public.intervention_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_job_assigned();