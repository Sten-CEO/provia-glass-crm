-- Broaden RLS to support assignment via table or jobs.assigned_employee_ids

-- 1) storage.objects INSERT for 'signatures' bucket
DROP POLICY IF EXISTS "Employees can upload job signatures" ON storage.objects;
CREATE POLICY "Employees can upload job signatures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
  AND (
    -- Case A: mapped via intervention_assignments
    (storage.foldername(name))[1]::uuid IN (
      SELECT ia.intervention_id
      FROM public.intervention_assignments ia
      JOIN public.equipe e ON e.id = ia.employee_id
      WHERE e.user_id = auth.uid()
    )
    OR
    -- Case B: mapped via jobs.assigned_employee_ids array
    EXISTS (
      SELECT 1
      FROM public.jobs j
      JOIN public.equipe e ON e.user_id = auth.uid()
      WHERE j.id = (storage.foldername(name))[1]::uuid
        AND e.id::text = ANY(j.assigned_employee_ids)
    )
  )
);

-- 2) job_signatures INSERT
DROP POLICY IF EXISTS "Employees can insert signatures for assigned jobs" ON public.job_signatures;
CREATE POLICY "Employees can insert signatures for assigned jobs"
ON public.job_signatures
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.intervention_assignments ia
    JOIN public.equipe e ON e.id = ia.employee_id
    WHERE ia.intervention_id = job_id
      AND e.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.equipe e ON e.user_id = auth.uid()
    WHERE j.id = job_id
      AND e.id::text = ANY(j.assigned_employee_ids)
  )
);

-- 3) jobs UPDATE (allow updating signature fields by assigned employees)
DROP POLICY IF EXISTS "Employees can update their assigned interventions" ON public.jobs;
CREATE POLICY "Employees can update their assigned interventions"
ON public.jobs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.intervention_assignments ia
    JOIN public.equipe e ON e.id = ia.employee_id
    WHERE ia.intervention_id = jobs.id
      AND e.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.equipe e
    WHERE e.user_id = auth.uid()
      AND e.id::text = ANY(jobs.assigned_employee_ids)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.intervention_assignments ia
    JOIN public.equipe e ON e.id = ia.employee_id
    WHERE ia.intervention_id = jobs.id
      AND e.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.equipe e
    WHERE e.user_id = auth.uid()
      AND e.id::text = ANY(jobs.assigned_employee_ids)
  )
);
