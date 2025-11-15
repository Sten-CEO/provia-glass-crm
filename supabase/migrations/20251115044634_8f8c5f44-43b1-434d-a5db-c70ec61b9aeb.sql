-- Créer les triggers pour les notifications automatiques

-- Trigger pour les pointages (timesheets)
DROP TRIGGER IF EXISTS trigger_notify_timesheet_created ON timesheets_entries;
CREATE TRIGGER trigger_notify_timesheet_created
  AFTER INSERT ON timesheets_entries
  FOR EACH ROW
  EXECUTE FUNCTION notify_timesheet_created();

-- Trigger pour les interventions terminées
DROP TRIGGER IF EXISTS trigger_notify_intervention_completed ON jobs;
CREATE TRIGGER trigger_notify_intervention_completed
  AFTER UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION notify_intervention_completed();

-- Trigger pour les devis signés
DROP TRIGGER IF EXISTS trigger_notify_quote_signed ON devis;
CREATE TRIGGER trigger_notify_quote_signed
  AFTER UPDATE ON devis
  FOR EACH ROW
  EXECUTE FUNCTION notify_quote_signed();

-- Trigger pour les factures en retard
DROP TRIGGER IF EXISTS trigger_notify_invoice_overdue ON factures;
CREATE TRIGGER trigger_notify_invoice_overdue
  AFTER UPDATE ON factures
  FOR EACH ROW
  EXECUTE FUNCTION notify_invoice_overdue();

-- Trigger pour les factures à envoyer
DROP TRIGGER IF EXISTS trigger_notify_invoice_to_send ON jobs;
CREATE TRIGGER trigger_notify_invoice_to_send
  AFTER UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION notify_invoice_to_send();

-- Trigger pour les assignations d'interventions
DROP TRIGGER IF EXISTS trigger_notify_job_assigned ON intervention_assignments;
CREATE TRIGGER trigger_notify_job_assigned
  AFTER INSERT ON intervention_assignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_job_assigned();