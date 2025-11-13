-- 1) Colonnes signature dans interventions (jobs)
ALTER TABLE public.jobs 
  ADD COLUMN IF NOT EXISTS signature_url text,
  ADD COLUMN IF NOT EXISTS signature_signer text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;

-- 2) Colonnes dates dans interventions si absentes
ALTER TABLE public.jobs 
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

-- 3) Colonnes facturation dans invoices (factures)
ALTER TABLE public.factures 
  ADD COLUMN IF NOT EXISTS intervention_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- 4) Colonne langue dans employees (equipe)
ALTER TABLE public.equipe 
  ADD COLUMN IF NOT EXISTS lang text DEFAULT 'fr';

-- 5) Index pour performances
CREATE INDEX IF NOT EXISTS idx_factures_intervention_id ON public.factures(intervention_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_at ON public.jobs(scheduled_at);

-- 6) Bucket Storage pour signatures (si absent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('signatures', 'signatures', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg'])
ON CONFLICT (id) DO NOTHING;

-- 7) RLS policies pour bucket signatures
DROP POLICY IF EXISTS "Employees can upload their job signatures" ON storage.objects;
CREATE POLICY "Employees can upload their job signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures' 
  AND auth.uid() IN (
    SELECT e.user_id 
    FROM equipe e
    JOIN intervention_assignments ia ON ia.employee_id = e.id
    WHERE ia.intervention_id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Anyone can view signatures" ON storage.objects;
CREATE POLICY "Anyone can view signatures"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'signatures');

-- 8) Trigger: recalcul "Reste à faire" quand intervention devient Terminée
CREATE OR REPLACE FUNCTION public.update_billing_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.statut = 'Terminée' AND OLD.statut != 'Terminée' THEN
    NULL; -- Placeholder pour future logique auto-facturation
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_billing_status ON public.jobs;
CREATE TRIGGER trigger_update_billing_status
AFTER UPDATE OF statut ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_billing_status();

-- 9) Fonction helper pour calculer l'état facturation d'une intervention
CREATE OR REPLACE FUNCTION public.get_intervention_billing_status(p_job_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN f.id IS NULL THEN 'À facturer'
      WHEN f.sent_at IS NOT NULL AND f.paid_at IS NULL THEN 'Facture envoyée'
      WHEN f.paid_at IS NOT NULL THEN 'Facture payée'
      ELSE 'À facturer'
    END
  FROM jobs j
  LEFT JOIN factures f ON f.intervention_id = j.id
  WHERE j.id = p_job_id
  LIMIT 1;
$$;