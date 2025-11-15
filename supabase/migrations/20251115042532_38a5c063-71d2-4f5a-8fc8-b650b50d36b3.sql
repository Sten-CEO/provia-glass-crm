-- Vérification et correction de sécurité pour employee_performance_v
-- On s'assure que la vue respecte RLS correctement

-- Recréer la vue avec les bonnes permissions
DROP VIEW IF EXISTS employee_performance_v CASCADE;

CREATE VIEW employee_performance_v 
WITH (security_invoker=true)
AS
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

-- Créer un storage bucket pour les contrats clients
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-contracts', 'client-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies pour le bucket contracts
CREATE POLICY "Admins can view contracts"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-contracts' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can upload contracts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-contracts' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can delete contracts"
ON storage.objects FOR DELETE
USING (bucket_id = 'client-contracts' AND auth.role() = 'authenticated');