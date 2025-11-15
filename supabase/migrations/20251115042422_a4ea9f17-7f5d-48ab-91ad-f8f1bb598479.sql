-- ============================================
-- 1) Vue performance employés (KPIs agrégés)
-- ============================================
CREATE OR REPLACE VIEW employee_performance_v AS
SELECT 
  e.id as employee_id,
  e.nom as employee_name,
  COUNT(DISTINCT j.id) as total_interventions,
  COUNT(DISTINCT CASE WHEN j.statut = 'Terminée' THEN j.id END) as terminees,
  COUNT(DISTINCT CASE WHEN j.statut = 'En cours' THEN j.id END) as en_cours,
  COALESCE(SUM(EXTRACT(EPOCH FROM (ts.end_at - ts.start_at)) / 3600), 0) as duree_totale_h,
  COALESCE(SUM(CASE WHEN ts.timesheet_type = 'job' THEN EXTRACT(EPOCH FROM (ts.end_at - ts.start_at)) / 3600 ELSE 0 END), 0) as heures_facturables
FROM equipe e
LEFT JOIN intervention_assignments ia ON ia.employee_id = e.id
LEFT JOIN jobs j ON j.id = ia.intervention_id
LEFT JOIN timesheets_entries ts ON ts.employee_id = e.id AND ts.end_at IS NOT NULL
GROUP BY e.id, e.nom;

-- ============================================
-- 2) Table client_contracts (upload contrats)
-- ============================================
CREATE TABLE IF NOT EXISTS client_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  uploaded_by UUID REFERENCES equipe(id),
  notes TEXT
);

ALTER TABLE client_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access on client_contracts" ON client_contracts
FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 3) Table client_addresses (adresses multiples)
-- ============================================
CREATE TABLE IF NOT EXISTS client_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  street TEXT,
  zipcode TEXT,
  city TEXT,
  country TEXT DEFAULT 'France',
  notes TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE client_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access on client_addresses" ON client_addresses
FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 4) Tables event_clients et event_assignees
-- ============================================
CREATE TABLE IF NOT EXISTS event_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES agenda_events(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  external_client_name TEXT,
  external_client_phone TEXT,
  external_client_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE event_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access on event_clients" ON event_clients
FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS event_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES agenda_events(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES equipe(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, employee_id)
);

ALTER TABLE event_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access on event_assignees" ON event_assignees
FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 5) Améliorer table notifications (si besoin)
-- ============================================
-- La table existe déjà, on ajoute juste des colonnes manquantes si nécessaire
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='level') THEN
    ALTER TABLE notifications ADD COLUMN level TEXT DEFAULT 'info';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='entity_type') THEN
    ALTER TABLE notifications ADD COLUMN entity_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='entity_id') THEN
    ALTER TABLE notifications ADD COLUMN entity_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='recipient_role') THEN
    ALTER TABLE notifications ADD COLUMN recipient_role TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='recipient_user_id') THEN
    ALTER TABLE notifications ADD COLUMN recipient_user_id UUID;
  END IF;
END $$;

-- ============================================
-- 6) Trigger: notification sur timesheet créé
-- ============================================
CREATE OR REPLACE FUNCTION notify_timesheet_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  employee_name TEXT;
BEGIN
  SELECT nom INTO employee_name FROM equipe WHERE id = NEW.employee_id;
  
  PERFORM create_notification(
    'timesheet_created',
    'Nouveau pointage',
    employee_name || ' a créé un pointage pour le ' || NEW.date::TEXT,
    '/pointage/employes/' || NEW.employee_id::TEXT,
    NEW.employee_id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_timesheet_created ON timesheets_entries;
CREATE TRIGGER on_timesheet_created
AFTER INSERT ON timesheets_entries
FOR EACH ROW
EXECUTE FUNCTION notify_timesheet_created();

-- ============================================
-- 7) Trigger: notification sur intervention terminée
-- ============================================
CREATE OR REPLACE FUNCTION notify_intervention_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.statut = 'Terminée' AND (OLD.statut IS NULL OR OLD.statut != 'Terminée') THEN
    PERFORM create_notification(
      'job_completed',
      'Intervention terminée',
      'L''intervention "' || NEW.titre || '" pour ' || NEW.client_nom || ' est terminée',
      '/interventions/' || NEW.id::TEXT || '/report',
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_intervention_completed ON jobs;
CREATE TRIGGER on_intervention_completed
AFTER UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION notify_intervention_completed();

-- ============================================
-- 8) Colonne billing_status sur jobs
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='billing_status') THEN
    ALTER TABLE jobs ADD COLUMN billing_status TEXT DEFAULT 'À facturer';
  END IF;
END $$;

-- ============================================
-- 9) Fonction pour mettre à jour billing_status automatiquement
-- ============================================
CREATE OR REPLACE FUNCTION update_job_billing_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_exists BOOLEAN;
  invoice_sent BOOLEAN;
  invoice_paid BOOLEAN;
BEGIN
  -- Vérifier si une facture existe pour cette intervention
  SELECT 
    COUNT(*) > 0,
    BOOL_OR(sent_at IS NOT NULL),
    BOOL_OR(paid_at IS NOT NULL)
  INTO invoice_exists, invoice_sent, invoice_paid
  FROM factures
  WHERE intervention_id = NEW.id;

  IF NOT invoice_exists THEN
    NEW.billing_status := 'À facturer';
  ELSIF invoice_paid THEN
    NEW.billing_status := 'Facture payée';
  ELSIF invoice_sent THEN
    NEW.billing_status := 'Facture envoyée';
  ELSE
    NEW.billing_status := 'À facturer';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_billing_status_on_job ON jobs;
CREATE TRIGGER update_billing_status_on_job
BEFORE INSERT OR UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_job_billing_status();

-- Trigger sur factures pour propager
CREATE OR REPLACE FUNCTION update_job_billing_on_invoice_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.intervention_id IS NOT NULL THEN
    UPDATE jobs SET updated_at = now() WHERE id = NEW.intervention_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS propagate_invoice_to_job ON factures;
CREATE TRIGGER propagate_invoice_to_job
AFTER INSERT OR UPDATE ON factures
FOR EACH ROW
EXECUTE FUNCTION update_job_billing_on_invoice_change();

-- ============================================
-- 10) Table timesheets_entries: ajouter statut validé/refusé si besoin
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'timesheet_status_enum') THEN
    CREATE TYPE timesheet_status_enum AS ENUM ('draft', 'submitted', 'approved', 'rejected');
  END IF;
END $$;

-- On garde la colonne status en TEXT mais on normalise les valeurs
-- 'submitted' devient l'ancien, on ajoute 'approved', 'rejected', 'draft'

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================