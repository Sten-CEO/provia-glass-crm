-- Correction search_path pour les fonctions de notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_kind TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notif_id UUID;
BEGIN
  INSERT INTO public.notifications (kind, title, message, link, actor_id)
  VALUES (p_kind, p_title, p_message, p_link, p_actor_id)
  RETURNING id INTO v_notif_id;
  
  RETURN v_notif_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_quote_signed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.notify_invoice_overdue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.notify_invoice_to_send()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.notify_job_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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