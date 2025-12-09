-- ========================================
-- Check data types of ID columns
-- This will help identify if any ID columns are TEXT instead of UUID
-- ========================================

SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('id', 'company_id', 'facture_id', 'quote_id', 'job_id', 'intervention_id', 'employee_id', 'user_id', 'client_id')
  AND table_name IN ('paiements', 'factures', 'devis', 'jobs', 'notifications', 'quote_events', 'quote_signatures', 'agenda_events', 'intervention_assignments')
ORDER BY table_name, column_name;
