
-- Recréer les policies pour intervention_assignments
CREATE POLICY "Users can manage their company intervention assignments"
ON public.intervention_assignments FOR ALL TO authenticated
USING (company_id = get_user_company_id())
WITH CHECK (company_id = get_user_company_id());

-- Recréer les policies pour intervention_files  
CREATE POLICY "Users can manage their company intervention files"
ON public.intervention_files FOR ALL TO authenticated
USING (company_id = get_user_company_id())
WITH CHECK (company_id = get_user_company_id());

-- Recréer les policies pour job_signatures
CREATE POLICY "Users can view their company job signatures"
ON public.job_signatures FOR SELECT TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Employees can insert signatures for their company jobs"
ON public.job_signatures FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_company_id() AND
  (
    EXISTS (
      SELECT 1 FROM intervention_assignments ia
      JOIN equipe e ON e.id = ia.employee_id
      WHERE ia.intervention_id = job_id AND e.user_id = auth.uid() AND ia.company_id = get_user_company_id()
    )
    OR EXISTS (
      SELECT 1 FROM jobs j
      JOIN equipe e ON e.user_id = auth.uid()
      WHERE j.id = job_id AND e.id::text = ANY(j.assigned_employee_ids) AND j.company_id = get_user_company_id()
    )
  )
);

-- Recréer les policies pour jobs
CREATE POLICY "Employees can update their company assigned interventions"
ON public.jobs FOR UPDATE TO authenticated
USING (
  company_id = get_user_company_id() AND
  (
    EXISTS (
      SELECT 1 FROM intervention_assignments ia
      JOIN equipe e ON e.id = ia.employee_id
      WHERE ia.intervention_id = jobs.id AND e.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM equipe e
      WHERE e.user_id = auth.uid() AND e.id::text = ANY(jobs.assigned_employee_ids)
    )
  )
)
WITH CHECK (
  company_id = get_user_company_id() AND
  (
    EXISTS (
      SELECT 1 FROM intervention_assignments ia
      JOIN equipe e ON e.id = ia.employee_id
      WHERE ia.intervention_id = jobs.id AND e.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM equipe e
      WHERE e.user_id = auth.uid() AND e.id::text = ANY(jobs.assigned_employee_ids)
    )
  )
);
