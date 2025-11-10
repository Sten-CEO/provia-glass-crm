-- Ajouter les champs manquants à timesheets_entries
ALTER TABLE timesheets_entries
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id),
ADD COLUMN IF NOT EXISTS travel_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'non_facturé' CHECK (billing_status IN ('non_facturé', 'facturé', 'en_attente')),
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES factures(id),
ADD COLUMN IF NOT EXISTS description TEXT;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_timesheets_entries_client_id ON timesheets_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_entries_billing_status ON timesheets_entries(billing_status);
CREATE INDEX IF NOT EXISTS idx_timesheets_entries_date ON timesheets_entries(date);

-- Fonction pour calculer automatiquement client_id depuis job_id
CREATE OR REPLACE FUNCTION sync_timesheet_client()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.job_id IS NOT NULL AND NEW.client_id IS NULL THEN
    SELECT client_id INTO NEW.client_id
    FROM jobs
    WHERE id = NEW.job_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour synchroniser client_id automatiquement
DROP TRIGGER IF EXISTS sync_timesheet_client_trigger ON timesheets_entries;
CREATE TRIGGER sync_timesheet_client_trigger
BEFORE INSERT OR UPDATE ON timesheets_entries
FOR EACH ROW
EXECUTE FUNCTION sync_timesheet_client();