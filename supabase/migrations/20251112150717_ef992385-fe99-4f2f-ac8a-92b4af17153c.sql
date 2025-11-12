-- ================================================================
-- MIGRATION: Synchronisation temps réel App Employés (Corrigée)
-- ================================================================

-- 1) Activer Realtime uniquement sur les tables non encore ajoutées
DO $$
BEGIN
  -- Vérifier et ajouter intervention_assignments si pas déjà dans realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'intervention_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.intervention_assignments;
  END IF;

  -- Vérifier et ajouter timesheets_entries si pas déjà dans realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'timesheets_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.timesheets_entries;
  END IF;

  -- Vérifier et ajouter notifications si pas déjà dans realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- 2) RPC pour démarrer un job (employee)
CREATE OR REPLACE FUNCTION public.start_job(p_job_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
  v_timesheet_id uuid;
  v_result json;
BEGIN
  -- Récupérer l'employee_id depuis auth.uid()
  SELECT id INTO v_employee_id
  FROM equipe
  WHERE user_id = auth.uid();

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Employé non trouvé';
  END IF;

  -- Vérifier que l'employé est assigné au job
  IF NOT EXISTS (
    SELECT 1 FROM intervention_assignments
    WHERE intervention_id = p_job_id
    AND employee_id = v_employee_id
  ) THEN
    RAISE EXCEPTION 'Non autorisé pour ce job';
  END IF;

  -- Créer un timesheet pour ce job
  INSERT INTO timesheets_entries (
    employee_id,
    job_id,
    date,
    start_at,
    timesheet_type,
    status,
    hours
  ) VALUES (
    v_employee_id,
    p_job_id,
    CURRENT_DATE,
    CURRENT_TIME,
    'job',
    'draft',
    0
  )
  RETURNING id INTO v_timesheet_id;

  -- Mettre à jour le statut du job
  UPDATE jobs
  SET statut = 'En cours'
  WHERE id = p_job_id;

  v_result := json_build_object(
    'success', true,
    'timesheet_id', v_timesheet_id,
    'message', 'Job démarré'
  );

  RETURN v_result;
END;
$$;

-- 3) RPC pour terminer un job (employee)
CREATE OR REPLACE FUNCTION public.finish_job(p_job_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
  v_timesheet_id uuid;
  v_result json;
BEGIN
  -- Récupérer l'employee_id depuis auth.uid()
  SELECT id INTO v_employee_id
  FROM equipe
  WHERE user_id = auth.uid();

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Employé non trouvé';
  END IF;

  -- Vérifier que l'employé est assigné au job
  IF NOT EXISTS (
    SELECT 1 FROM intervention_assignments
    WHERE intervention_id = p_job_id
    AND employee_id = v_employee_id
  ) THEN
    RAISE EXCEPTION 'Non autorisé pour ce job';
  END IF;

  -- Clôturer le timesheet actif pour ce job
  UPDATE timesheets_entries
  SET 
    end_at = CURRENT_TIME,
    status = 'submitted'
  WHERE employee_id = v_employee_id
    AND job_id = p_job_id
    AND status = 'draft'
    AND end_at IS NULL
  RETURNING id INTO v_timesheet_id;

  -- Mettre à jour le statut du job
  UPDATE jobs
  SET statut = 'Terminée'
  WHERE id = p_job_id;

  v_result := json_build_object(
    'success', true,
    'timesheet_id', v_timesheet_id,
    'message', 'Job terminé'
  );

  RETURN v_result;
END;
$$;

-- 4) Vue simplifiée pour les jobs d'un employé
CREATE OR REPLACE VIEW v_employee_jobs AS
SELECT 
  j.id,
  j.titre as title,
  j.client_nom as client_name,
  j.adresse as address,
  j.date,
  j.heure_debut as start_time,
  j.heure_fin as end_time,
  j.statut as status,
  j.description,
  j.notes,
  ia.employee_id,
  ia.created_at as assigned_at,
  e.nom as employee_name
FROM jobs j
INNER JOIN intervention_assignments ia ON ia.intervention_id = j.id
INNER JOIN equipe e ON e.id = ia.employee_id
WHERE e.user_id = auth.uid()
ORDER BY j.date DESC, j.heure_debut ASC;

-- 5) Permissions sur la vue
GRANT SELECT ON v_employee_jobs TO authenticated;

-- 6) Commentaires
COMMENT ON FUNCTION public.start_job IS 'Démarre un job pour un employé (crée timesheet + change statut)';
COMMENT ON FUNCTION public.finish_job IS 'Termine un job pour un employé (clôt timesheet + change statut)';
COMMENT ON VIEW v_employee_jobs IS 'Vue simplifiée des jobs assignés à l''employé connecté';