-- Supprimer le trigger d'abord, puis la fonction, puis recréer avec search_path
DROP TRIGGER IF EXISTS sync_timesheet_client_trigger ON timesheets_entries;
DROP FUNCTION IF EXISTS sync_timesheet_client();

-- Recréer la fonction avec search_path sécurisé
CREATE OR REPLACE FUNCTION sync_timesheet_client()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.job_id IS NOT NULL AND NEW.client_id IS NULL THEN
    SELECT client_id INTO NEW.client_id
    FROM jobs
    WHERE id = NEW.job_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER sync_timesheet_client_trigger
BEFORE INSERT OR UPDATE ON timesheets_entries
FOR EACH ROW
EXECUTE FUNCTION sync_timesheet_client();